<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Billing\Gateways\GatewayException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billing\PaymentFormRequest;
use App\Http\Requests\Billing\RefundFormRequest;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PaymentController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function index(Request $request)
    {
        $query = Payment::with('invoice.tenant', 'gateway');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('reference', 'like', "%{$search}%")
                ->orWhere('gateway_reference', 'like', "%{$search}%")
                ->orWhereHas('invoice', fn ($i) => $i->where('number', 'like', "%{$search}%")));
        }

        if (in_array($status = $request->query('status'), Payment::STATUSES, true)) {
            $query->where('status', $status);
        }

        if (in_array($method = $request->query('method'), Payment::METHODS, true)) {
            $query->where('method', $method);
        }

        return $this->paginated(
            $query->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (Payment $payment) => $payment->toPublicArray(),
            ['receivedTotal' => (float) Payment::where('status', 'succeeded')->sum('amount')]
        );
    }

    public function show(Payment $payment)
    {
        $payment->load('invoice.tenant', 'gateway');

        return $this->item($payment->toPublicArray() + [
            'refundable' => $payment->refundableAmount(),
            'refunds' => $payment->refunds()->orderByDesc('created_at')->get()->map->toPublicArray(),
        ]);
    }

    // Records money received outside the platform; the invoice is settled when fully covered.
    public function store(PaymentFormRequest $request)
    {
        $invoice = Invoice::where('cuid', $request->input('invoiceId'))->first();

        if ($invoice->status !== 'unpaid') {
            return $this->error('invoice_not_payable', 409);
        }
        if ((float) $request->input('amount') > $invoice->balance() + 0.001) {
            return $this->error('amount_exceeds_balance', 422);
        }

        $payment = $this->billing->recordManualPayment(
            $invoice,
            (float) $request->input('amount'),
            $request->input('method'),
            $request->input('reference'),
            $request->filled('paidAt') ? Carbon::parse($request->input('paidAt')) : now(),
            $request->user(),
        );

        Audit::log($request, [
            'action' => 'payment.recorded',
            'actor' => $request->user(),
            'entity_type' => 'payment',
            'entity_id' => $payment->cuid,
            'metadata' => ['invoice' => $invoice->number, 'amount' => (float) $payment->amount, 'method' => $payment->method],
        ]);

        return $this->item($payment->load('invoice.tenant')->toPublicArray(), 201);
    }

    // Re-reads a pending online payment from its gateway (for when a webhook did not arrive).
    public function sync(Request $request, Payment $payment)
    {
        try {
            $payment = $this->billing->syncPayment($payment);
        } catch (GatewayException $e) {
            report($e);

            return $this->error($e->errorCode, 502);
        }

        return $this->item($payment->load('invoice.tenant', 'gateway')->toPublicArray());
    }

    public function refund(RefundFormRequest $request, Payment $payment)
    {
        $amount = (float) $request->input('amount');

        if ($payment->status !== 'succeeded') {
            return $this->error('payment_not_refundable', 409);
        }
        if ($amount > $payment->refundableAmount() + 0.001) {
            return $this->error('refund_exceeds_payment', 422);
        }

        try {
            $refund = $this->billing->refund($payment, $amount, $request->input('reason'), $request->user());
        } catch (GatewayException $e) {
            report($e);

            return $this->error($e->errorCode, 502);
        }

        Audit::log($request, [
            'action' => 'payment.refunded',
            'actor' => $request->user(),
            'entity_type' => 'payment',
            'entity_id' => $payment->cuid,
            'metadata' => ['amount' => $amount, 'refund' => $refund->cuid, 'status' => $refund->status],
        ]);

        return $this->item($refund->toPublicArray(), 201);
    }
}
