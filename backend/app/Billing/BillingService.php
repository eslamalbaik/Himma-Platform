<?php

namespace App\Billing;

use App\Billing\Gateways\GatewayDriver;
use App\Billing\Gateways\GatewayException;
use App\Billing\Gateways\ManualDriver;
use App\Billing\Gateways\ZiinaDriver;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Refund;
use App\Models\Setting;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// All money rules in one place. Controllers, the webhook and the daily job call these methods
// so an invoice is settled, a subscription extended and a suspension lifted the same way every time.
class BillingService
{
    public const SETTINGS_DEFAULTS = [
        'currency' => 'AED',
        'invoiceDueDays' => 14,       // days between issuing an invoice and its due date
        'renewDaysBefore' => 7,       // renewal invoice is issued this many days before the period ends
        'graceDays' => 14,            // days after the due date before an unpaid client is suspended
    ];

    public static function settings(): array
    {
        return Setting::group('billing', self::SETTINGS_DEFAULTS);
    }

    public function driver(PaymentGateway $gateway): GatewayDriver
    {
        return match ($gateway->driver) {
            'ziina' => app(ZiinaDriver::class),
            default => app(ManualDriver::class),
        };
    }

    // ---- Invoices ----

    public function issueInvoice(
        Tenant $tenant,
        float $amount,
        ?string $currency = null,
        ?Subscription $subscription = null,
        ?Carbon $periodStart = null,
        ?Carbon $periodEnd = null,
        ?Carbon $dueAt = null,
    ): Invoice {
        $settings = self::settings();

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription?->id,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'amount' => round($amount, 2),
            'currency' => $currency ?? $settings['currency'],
            'status' => 'unpaid',
            'issued_at' => today(),
            'due_at' => $dueAt ?? today()->addDays($settings['invoiceDueDays']),
        ]);

        $this->notifier()->invoiceIssued($invoice);

        return $invoice;
    }

    public function notifier(): BillingNotifier
    {
        return app(BillingNotifier::class);
    }

    // Invoice for the period that starts when the subscription's paid time ends.
    public function invoiceNextPeriod(Subscription $subscription, ?Carbon $dueAt = null): Invoice
    {
        $plan = $subscription->plan;
        $start = ($subscription->ends_at ?? $subscription->starts_at)->copy();
        $end = $plan->interval === 'monthly' ? $start->copy()->addMonthNoOverflow() : $start->copy()->addYearNoOverflow();

        return $this->issueInvoice(
            $subscription->tenant, (float) $plan->price, $plan->currency, $subscription, $start, $end,
            $dueAt ?? Carbon::parse(max($start->toDateString(), today()->toDateString())),
        );
    }

    public function voidInvoice(Invoice $invoice): bool
    {
        return DB::transaction(function () use ($invoice) {
            $locked = Invoice::whereKey($invoice->id)->lockForUpdate()->first();
            if ($locked->status !== 'unpaid' || $locked->payments()->whereIn('status', ['pending', 'succeeded'])->exists()) {
                return false;
            }
            $locked->update(['status' => 'void']);

            return true;
        });
    }

    // Marks the invoice paid once succeeded payments cover it, then extends the subscription
    // and lifts a suspension that billing itself put on the client.
    public function settleInvoice(Invoice $invoice): void
    {
        $settled = DB::transaction(function () use ($invoice) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->first();
            if ($invoice->status !== 'unpaid' || $invoice->balance() > 0) {
                return false;
            }

            $invoice->update(['status' => 'paid', 'paid_at' => now()]);

            if ($subscription = $invoice->subscription) {
                $endsAt = $invoice->period_end && (! $subscription->ends_at || $invoice->period_end->gt($subscription->ends_at))
                    ? $invoice->period_end
                    : $subscription->ends_at;

                $subscription->update([
                    'ends_at' => $endsAt,
                    'status' => $subscription->status === 'cancelled' ? 'cancelled' : 'active',
                ]);
            }

            $tenant = $invoice->tenant;
            if ($tenant->billing_suspended_at || $tenant->status === 'trial') {
                $tenant->update(['status' => 'active', 'billing_suspended_at' => null]);
            }

            Audit::log(request(), [
                'action' => 'invoice.paid',
                'entity_type' => 'invoice',
                'entity_id' => $invoice->cuid,
                'metadata' => ['number' => $invoice->number, 'amount' => (float) $invoice->amount],
            ]);

            return true;
        });

        if ($settled) {
            $this->notifier()->paymentReceived($invoice->fresh());
        }
    }

    // ---- Payments ----

    public function recordManualPayment(Invoice $invoice, float $amount, string $method, ?string $reference, Carbon $paidAt, User $actor): Payment
    {
        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => round($amount, 2),
            'method' => $method,
            'status' => 'succeeded',
            'reference' => $reference,
            'paid_at' => $paidAt,
            'recorded_by' => $actor->id,
        ]);

        $this->settleInvoice($invoice);

        return $payment;
    }

    // Creates a pending payment for the invoice's balance and the gateway's hosted payment page.
    public function startCheckout(Invoice $invoice, PaymentGateway $gateway, ?User $actor): Payment
    {
        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_id' => $gateway->id,
            'amount' => $invoice->balance(),
            'method' => 'online',
            'status' => 'pending',
            'recorded_by' => $actor?->id,
        ]);

        $resultUrl = rtrim(config('app.frontend_url'), '/')."/billing/payment-result/?payment={$payment->cuid}&result=";

        try {
            $checkout = $this->driver($gateway)->createCheckout($gateway, $payment->setRelation('invoice', $invoice), [
                'success' => $resultUrl.'success',
                'cancel' => $resultUrl.'cancel',
                'failure' => $resultUrl.'failure',
            ]);
        } catch (GatewayException $e) {
            $payment->update(['status' => 'failed']);
            throw $e;
        }

        $payment->update(['gateway_reference' => $checkout['reference'], 'checkout_url' => $checkout['url']]);

        return $payment;
    }

    // Asks the gateway for the real status of a pending online payment and applies it.
    public function syncPayment(Payment $payment): Payment
    {
        if ($payment->status === 'pending' && $payment->gateway && $payment->gateway_reference) {
            $status = $this->driver($payment->gateway)->fetchStatus($payment->gateway, $payment->gateway_reference);
            $this->applyPaymentStatus($payment, $status);
        }

        return $payment->fresh();
    }

    public function applyPaymentStatus(Payment $payment, string $status): void
    {
        $changed = DB::transaction(function () use ($payment, $status) {
            // Locked: the webhook and a browser check can arrive together.
            $locked = Payment::whereKey($payment->id)->lockForUpdate()->first();
            if ($locked->status !== 'pending' || $status === 'pending') {
                return false;
            }

            $locked->update(['status' => $status, 'paid_at' => $status === 'succeeded' ? now() : null]);

            return true;
        });

        if (! $changed) {
            return;
        }

        Audit::log(request(), [
            'action' => "payment.$status",
            'entity_type' => 'payment',
            'entity_id' => $payment->cuid,
            'metadata' => ['invoice' => $payment->invoice->number, 'amount' => (float) $payment->amount],
        ]);

        if ($status === 'succeeded') {
            $this->settleInvoice($payment->invoice);
        } elseif ($status === 'failed') {
            $this->notifier()->paymentFailed($payment->fresh());
        }
    }

    // ---- Refunds ----

    public function refund(Payment $payment, float $amount, ?string $reason, User $actor): Refund
    {
        $refund = Refund::create([
            'payment_id' => $payment->id,
            'amount' => round($amount, 2),
            'status' => 'pending',
            'reason' => $reason,
            'created_by' => $actor->id,
        ]);

        $gateway = $payment->gateway;
        $result = $gateway
            ? $this->driver($gateway)->refund($gateway, $payment, $refund)
            : ['reference' => null, 'status' => 'completed']; // recorded by hand: the money went back outside the platform

        $refund->update(['gateway_reference' => $result['reference']]);
        $this->applyRefundStatus($refund, $result['status']);

        return $refund->fresh();
    }

    public function applyRefundStatus(Refund $refund, string $status): void
    {
        if ($status === 'pending') {
            return;
        }

        DB::transaction(function () use ($refund, $status) {
            $locked = Refund::whereKey($refund->id)->lockForUpdate()->first();
            if ($locked->status !== 'pending') {
                return;
            }

            $locked->update(['status' => $status]);
            if ($status !== 'completed') {
                return;
            }

            $payment = $locked->payment;
            $refunded = (float) $payment->refunds()->where('status', 'completed')->sum('amount');
            if ($refunded + 0.001 >= (float) $payment->amount) {
                $payment->update(['status' => 'refunded']);

                $invoice = $payment->invoice;
                if ($invoice->status === 'paid' && ! $invoice->payments()->where('status', 'succeeded')->exists()) {
                    $invoice->update(['status' => 'refunded']);
                }
            }
        });
    }

    // ---- Daily job (php artisan billing:run) ----

    public function runDaily(?Carbon $today = null): array
    {
        $today ??= today();
        $settings = self::settings();
        $summary = ['invoiced' => 0, 'pastDue' => 0, 'suspended' => 0, 'reminders' => 0, 'overdueNotices' => 0];
        $notifier = $this->notifier();

        // 0. Renewal reminders N days before the paid period (or trial) ends (Settings → Notifications).
        foreach (array_unique(BillingNotifier::settings()['reminderDays']) as $days) {
            Subscription::with('plan', 'tenant')
                ->whereIn('status', ['trial', 'active', 'past_due'])
                ->whereDate('ends_at', $today->copy()->addDays((int) $days))
                ->each(function (Subscription $subscription) use ($notifier, $days, &$summary) {
                    if ($notifier->renewalReminder($subscription, (int) $days)) {
                        $summary['reminders']++;
                    }
                });
        }

        // 1. Renewal invoices shortly before the paid period (or trial) ends.
        Subscription::with('plan', 'tenant')
            ->whereIn('status', ['trial', 'active', 'past_due'])
            ->whereNotNull('ends_at')
            ->whereDate('ends_at', '<=', $today->copy()->addDays($settings['renewDaysBefore']))
            ->each(function (Subscription $subscription) use (&$summary) {
                $alreadyInvoiced = $subscription->invoices()
                    ->whereDate('period_start', $subscription->ends_at)
                    ->where('status', '!=', 'void')
                    ->exists();

                if (! $alreadyInvoiced) {
                    $invoice = $this->invoiceNextPeriod($subscription);
                    $summary['invoiced']++;
                    Audit::log(request(), ['action' => 'invoice.issued', 'entity_type' => 'invoice', 'entity_id' => $invoice->cuid, 'metadata' => ['renewal' => true]]);
                }
            });

        // 2. Overdue invoice → subscription past due.
        Subscription::whereIn('status', ['trial', 'active'])
            ->whereHas('invoices', fn ($q) => $q->where('status', 'unpaid')->whereDate('due_at', '<', $today))
            ->each(function (Subscription $subscription) use (&$summary) {
                $subscription->update(['status' => 'past_due']);
                $summary['pastDue']++;
                Audit::log(request(), ['action' => 'subscription.past_due', 'entity_type' => 'subscription', 'entity_id' => $subscription->cuid]);
            });

        // 2b. One "overdue" alert per unpaid invoice past its due date.
        Invoice::with('tenant')->where('status', 'unpaid')->whereDate('due_at', '<', $today)
            ->each(function (Invoice $invoice) use ($notifier, &$summary) {
                if ($notifier->invoiceOverdue($invoice)) {
                    $summary['overdueNotices']++;
                }
            });

        // 3. Still unpaid after the grace period → suspend the client.
        $graceCutoff = $today->copy()->subDays($settings['graceDays']);
        Tenant::whereIn('status', ['trial', 'active'])
            ->whereHas('invoices', fn ($q) => $q->where('status', 'unpaid')->whereDate('due_at', '<', $graceCutoff))
            ->each(function (Tenant $tenant) use (&$summary) {
                $tenant->update(['status' => 'suspended', 'billing_suspended_at' => now()]);
                $summary['suspended']++;
                $this->notifier()->tenantSuspended($tenant);
                Audit::log(request(), ['action' => 'tenant.billing_suspended', 'entity_type' => 'tenant', 'entity_id' => $tenant->cuid]);
            });

        return $summary;
    }
}
