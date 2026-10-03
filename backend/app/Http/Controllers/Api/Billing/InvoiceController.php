<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Billing\Gateways\GatewayException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\InvoiceFormRequest;
use App\Models\Invoice;
use App\Models\PaymentGateway;
use App\Models\Tenant;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class InvoiceController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function index(Request $request)
    {
        $query = Invoice::with('tenant', 'subscription');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('number', 'like', "%{$search}%")
                ->orWhereHas('tenant', fn ($t) => $t->where('name_ar', 'like', "%{$search}%")->orWhere('name_en', 'like', "%{$search}%")));
        }

        if (in_array($status = $request->query('status'), Invoice::STATUSES, true)) {
            $query->where('status', $status);
        }

        if ($request->query('overdue') === 'true') {
            $query->where('status', 'unpaid')->whereDate('due_at', '<', today());
        }

        if ($tenantId = $request->query('tenantId')) {
            $query->whereHas('tenant', fn ($q) => $q->where('cuid', $tenantId));
        }

        return $this->paginated(
            $query->orderByDesc('issued_at')->orderByDesc('id')->paginate($this->perPage($request)),
            fn (Invoice $invoice) => $invoice->toPublicArray(),
            ['unpaidTotal' => (float) Invoice::where('status', 'unpaid')->sum('amount')]
        );
    }

    public function show(Invoice $invoice)
    {
        $invoice->load('tenant', 'subscription');

        return $this->item($invoice->toPublicArray() + [
            'payments' => $invoice->payments()->with('gateway')->orderByDesc('created_at')->get()
                ->map(fn ($payment) => $payment->setRelation('invoice', $invoice)->toPublicArray()),
        ]);
    }

    public function store(InvoiceFormRequest $request)
    {
        $tenant = Tenant::where('cuid', $request->input('tenantId'))->first();
        $invoice = $this->billing->issueInvoice(
            $tenant,
            (float) $request->input('amount'),
            $request->input('currency'),
            dueAt: $request->filled('dueAt') ? Carbon::parse($request->input('dueAt')) : null,
        );

        Audit::log($request, [
            'action' => 'invoice.issued',
            'actor' => $request->user(),
            'entity_type' => 'invoice',
            'entity_id' => $invoice->cuid,
            'metadata' => ['number' => $invoice->number, 'amount' => (float) $invoice->amount],
        ]);

        return $this->item($invoice->fresh(['tenant'])->toPublicArray(), 201);
    }

    // Only an unpaid invoice with no payment in progress can be voided.
    public function void(Request $request, Invoice $invoice)
    {
        if (! $this->billing->voidInvoice($invoice)) {
            return $this->error('invoice_not_voidable', 409);
        }

        Audit::log($request, [
            'action' => 'invoice.voided',
            'actor' => $request->user(),
            'entity_type' => 'invoice',
            'entity_id' => $invoice->cuid,
            'metadata' => ['number' => $invoice->number],
        ]);

        return $this->item($invoice->fresh(['tenant'])->toPublicArray());
    }

    // Creates an online payment link for the invoice's remaining balance, to send to the client.
    public function checkout(Request $request, Invoice $invoice)
    {
        if ($invoice->status !== 'unpaid' || $invoice->balance() <= 0) {
            return $this->error('invoice_not_payable', 409);
        }

        $gateway = $request->filled('gatewayId')
            ? PaymentGateway::where('cuid', $request->input('gatewayId'))->where('is_active', true)->first()
            : PaymentGateway::where('is_active', true)->where('driver', '!=', 'manual')->orderBy('sort_order')->first();

        if (! $gateway || ! $gateway->isOnline()) {
            return $this->error('no_active_gateway', 409);
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

        return $this->item($payment->load('invoice.tenant', 'gateway')->toPublicArray(), 201);
    }
}
