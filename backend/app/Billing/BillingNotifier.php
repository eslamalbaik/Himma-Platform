<?php

namespace App\Billing;

use App\Mail\BillingNoticeMail;
use App\Models\BillingNotice;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\BillingAlert;
use App\Support\Ability;
use App\Support\Audit;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Throwable;

// Billing alerts: an email to the client (both languages) and, for problems, an alert in the dashboard
// for staff who manage billing. Each alert is sent once per subject (billing_notices is unique on
// kind + subject_key). Which alerts go out: Settings → Notifications.
class BillingNotifier
{
    public const KINDS = [
        'invoice_issued', 'renewal_reminder', 'payment_received', 'payment_failed', 'invoice_overdue', 'tenant_suspended',
    ];

    // Kinds that also alert billing staff in the dashboard.
    public const STAFF_KINDS = ['payment_failed', 'invoice_overdue', 'tenant_suspended'];

    public const SETTINGS_DEFAULTS = [
        'invoice_issued' => true,
        'renewal_reminder' => true,
        'payment_received' => true,
        'payment_failed' => true,
        'invoice_overdue' => true,
        'tenant_suspended' => true,
        'staffAlerts' => true,
        'reminderDays' => [30, 7], // renewal reminders this many days before the paid period ends
    ];

    public static function settings(): array
    {
        return Setting::group('notifications', self::SETTINGS_DEFAULTS);
    }

    public function invoiceIssued(Invoice $invoice): bool
    {
        return $this->send('invoice_issued', $invoice->tenant, "invoice:{$invoice->id}", $this->invoiceVars($invoice));
    }

    public function paymentReceived(Invoice $invoice): bool
    {
        return $this->send('payment_received', $invoice->tenant, "invoice:{$invoice->id}", $this->invoiceVars($invoice));
    }

    public function paymentFailed(Payment $payment): bool
    {
        $invoice = $payment->invoice;

        return $this->send('payment_failed', $invoice->tenant, "payment:{$payment->id}", $this->invoiceVars($invoice, (float) $payment->amount));
    }

    public function invoiceOverdue(Invoice $invoice): bool
    {
        return $this->send('invoice_overdue', $invoice->tenant, "invoice:{$invoice->id}", $this->invoiceVars($invoice, $invoice->balance()));
    }

    public function renewalReminder(Subscription $subscription, int $days): bool
    {
        $plan = $subscription->plan;

        return $this->send('renewal_reminder', $subscription->tenant, "subscription:{$subscription->id}:{$subscription->ends_at->toDateString()}:{$days}", [
            'days' => $days,
            'endsAt' => $subscription->ends_at->toDateString(),
            'amount' => number_format((float) $plan->price, 2),
            'currency' => $plan->currency,
        ] + $this->tenantVars($subscription->tenant));
    }

    public function tenantSuspended(Tenant $tenant): bool
    {
        return $this->send('tenant_suspended', $tenant, "tenant:{$tenant->id}:".optional($tenant->billing_suspended_at)->timestamp, $this->tenantVars($tenant));
    }

    // Returns true when the alert went out now (false: turned off, or already sent).
    public function send(string $kind, Tenant $tenant, string $subjectKey, array $vars): bool
    {
        $settings = self::settings();
        if (empty($settings[$kind])) {
            return false;
        }

        $recipients = $this->recipients($tenant);

        try {
            BillingNotice::create(['tenant_id' => $tenant->id, 'kind' => $kind, 'subject_key' => $subjectKey, 'recipients' => $recipients]);
        } catch (QueryException $e) {
            return false; // unique (kind, subject_key): already sent
        }

        // An alert must never break billing itself (a payment, the daily job): failures are only reported.
        try {
            if ($recipients) {
                Mail::to($recipients)->queue(new BillingNoticeMail($kind, $vars));
            }

            if ($settings['staffAlerts'] && in_array($kind, self::STAFF_KINDS, true)) {
                Notification::send($this->billingStaff(), new BillingAlert($kind, $vars));
            }
        } catch (Throwable $e) {
            report($e);
        }

        Audit::log(request(), [
            'action' => "billing_notice.{$kind}",
            'entity_type' => 'tenant',
            'entity_id' => $tenant->cuid,
            'metadata' => ['subject' => $subjectKey, 'recipients' => count($recipients)],
        ]);

        return true;
    }

    // The client's billing email, or else its active users.
    public function recipients(Tenant $tenant): array
    {
        if ($tenant->billing_email) {
            return [$tenant->billing_email];
        }

        return $tenant->users()->where('status', 'active')->pluck('email')->filter()->values()->all();
    }

    private function billingStaff()
    {
        return User::whereNull('tenant_id')->where('status', 'active')->get()
            ->filter(fn (User $user) => Ability::can($user->role, 'manage', 'billing'));
    }

    private function tenantVars(Tenant $tenant): array
    {
        return ['clientAr' => $tenant->name_ar, 'clientEn' => $tenant->name_en, 'clientId' => $tenant->cuid];
    }

    private function invoiceVars(Invoice $invoice, ?float $amount = null): array
    {
        return [
            'number' => $invoice->number,
            'invoiceId' => $invoice->cuid,
            'amount' => number_format($amount ?? (float) $invoice->amount, 2),
            'currency' => $invoice->currency,
            'dueAt' => optional($invoice->due_at)->toDateString(),
        ] + $this->tenantVars($invoice->tenant);
    }
}
