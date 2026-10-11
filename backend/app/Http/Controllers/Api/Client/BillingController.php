<?php

namespace App\Http\Controllers\Api\Client;

use App\Billing\BillingService;
use App\Billing\Gateways\GatewayException;
use App\Billing\InvoicePdf;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Support\Audit;
use Illuminate\Http\Request;

// Client dashboard → Billing: the organisation's own subscriptions and invoices, the invoice PDF and online
// payment. Needs `general_settings` allowed (tperm:general_settings,allowed). Paying is allowed while the
// organisation is suspended or cancelled (`client:billing`), so it can settle what it owes.
class BillingController extends Controller
{
    // A started checkout is reused for this long instead of opening another payment.
    private const CHECKOUT_REUSE_HOURS = 12;

    public function __construct(private BillingService $billing) {}

    public function summary(Request $request)
    {
        $tenant = $request->user()->tenant;

        return $this->item([
            'subscriptions' => $tenant->subscriptions()->with('plan', 'tenant')
                ->orderByRaw("status = 'cancelled'")->orderByDesc('starts_at')->get()
                ->map->toPublicArray()->values(),
            'gateways' => $this->onlineGateways()->map(fn (PaymentGateway $g) => [
                'id' => $g->cuid, 'nameAr' => $g->name_ar, 'nameEn' => $g->name_en,
            ])->values(),
        ]);
    }

    public function invoices(Request $request)
    {
        $query = Invoice::with('tenant', 'subscription')->where('tenant_id', $request->user()->tenant_id);

        if (in_array($status = $request->query('status'), Invoice::STATUSES, true)) {
            $query->where('status', $status);
        }
        if ($request->query('overdue') === 'true') {
            $query->where('status', 'unpaid')->whereDate('due_at', '<', today());
        }

        return $this->paginated(
            $query->orderByDesc('issued_at')->orderByDesc('id')->paginate($this->perPage($request)),
            fn (Invoice $invoice) => $invoice->toPublicArray() + ['balance' => $invoice->balance()]
        );
    }

    public function show(Request $request, string $cuid)
    {
        $invoice = $this->own($request, $cuid);
        if (! $invoice) {
            return $this->error('invoice_not_found', 404);
        }

        return $this->item($invoice->toPublicArray() + [
            'balance' => $invoice->balance(),
            'payments' => $invoice->payments()->with('gateway')->orderByDesc('created_at')->get()
                ->map(fn (Payment $payment) => $payment->setRelation('invoice', $invoice)->toPublicArray()),
        ]);
    }

    public function pdf(Request $request, string $cuid, InvoicePdf $pdf)
    {
        $invoice = $this->own($request, $cuid);
        if (! $invoice) {
            return $this->error('invoice_not_found', 404);
        }

        return response($pdf->render($invoice), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$invoice->number.'.pdf"',
            'Cache-Control' => 'no-store',
        ]);
    }

    // Opens (or reuses) an online payment for the invoice's remaining balance and returns its checkout link.
    public function pay(Request $request, string $cuid)
    {
        $invoice = $this->own($request, $cuid);
        if (! $invoice) {
            return $this->error('invoice_not_found', 404);
        }
        if ($invoice->status !== 'unpaid' || $invoice->balance() <= 0) {
            return $this->error('invoice_not_payable', 409);
        }

        $gateways = $this->onlineGateways();
        $gateway = $request->filled('gatewayId')
            ? $gateways->firstWhere('cuid', $request->input('gatewayId'))
            : $gateways->first();
        if (! $gateway) {
            return $this->error('no_active_gateway', 409);
        }

        $pending = $invoice->payments()->where('status', 'pending')->where('gateway_id', $gateway->id)
            ->whereNotNull('checkout_url')->where('amount', $invoice->balance())
            ->where('created_at', '>=', now()->subHours(self::CHECKOUT_REUSE_HOURS))->latest()->first();
        if ($pending) {
            return $this->item(['paymentId' => $pending->cuid, 'checkoutUrl' => $pending->checkout_url]);
        }

        try {
            $payment = $this->billing->startCheckout($invoice, $gateway, $request->user());
        } catch (GatewayException $e) {
            report($e);

            return $this->error($e->errorCode, 502);
        }

        Audit::log($request, [
            'action' => 'payment.checkout_created',
            'actor' => $request->user(),
            'entity_type' => 'payment',
            'entity_id' => $payment->cuid,
            'metadata' => ['invoice' => $invoice->number, 'amount' => (float) $payment->amount, 'gateway' => $gateway->driver],
        ]);

        return $this->item(['paymentId' => $payment->cuid, 'checkoutUrl' => $payment->checkout_url], 201);
    }

    private function own(Request $request, string $cuid): ?Invoice
    {
        return Invoice::with('tenant', 'subscription')
            ->where('tenant_id', $request->user()->tenant_id)->where('cuid', $cuid)->first();
    }

    private function onlineGateways()
    {
        return PaymentGateway::where('is_active', true)->where('driver', '!=', 'manual')->orderBy('sort_order')->get();
    }
}
