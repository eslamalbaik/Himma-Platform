<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Billing\Gateways\GatewayException;
use App\Http\Controllers\Controller;
use App\Models\Payment;

// The page a payer lands on after the gateway's checkout asks here how the payment went.
// Public (the payer may have no account); the payment id is an unguessable ULID and only
// non-sensitive fields are returned.
class PaymentResultController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function show(string $cuid)
    {
        $payment = Payment::with('invoice.tenant', 'gateway')->where('cuid', $cuid)->first();
        if (! $payment) {
            return $this->error('not_found', 404);
        }

        try {
            $payment = $this->billing->syncPayment($payment);
        } catch (GatewayException $e) {
            report($e); // show the last known status
        }

        return $this->item([
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'currency' => $payment->invoice->currency,
            'invoiceNumber' => $payment->invoice->number,
            'tenantNameAr' => $payment->invoice->tenant->name_ar,
            'tenantNameEn' => $payment->invoice->tenant->name_en,
            'checkoutUrl' => $payment->status === 'pending' ? $payment->checkout_url : null,
        ]);
    }
}
