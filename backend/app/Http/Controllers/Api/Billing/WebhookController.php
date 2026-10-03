<?php

namespace App\Http\Controllers\Api\Billing;

use App\Billing\BillingService;
use App\Billing\Gateways\GatewayException;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\PaymentGateway;
use App\Models\Refund;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;

// Called by payment providers, not by people: no session. Trust comes from the signature,
// and the payment status is then read back from the provider rather than taken from the body.
class WebhookController extends Controller
{
    public function __construct(private BillingService $billing) {}

    public function handle(Request $request, string $driver)
    {
        $gateway = PaymentGateway::where('driver', $driver)->where('is_active', true)->first();
        if (! $gateway || ! $gateway->isOnline()) {
            return $this->error('not_found', 404);
        }

        $driverCode = $this->billing->driver($gateway);
        $valid = $driverCode->verifyWebhook($gateway, $request);
        $parsed = $driverCode->parseWebhook($request);

        // Only signed events can claim a dedupe key, so forged calls cannot block real ones.
        $dedupeKey = $valid ? $parsed['dedupeKey'] : null;
        $event = $dedupeKey ? PaymentEvent::where('dedupe_key', $dedupeKey)->first() : null;

        if ($event?->processed_at) {
            return $this->ok(); // already received and handled
        }

        try {
            // A retry of an event that failed earlier reuses its row.
            $event ??= PaymentEvent::create([
                'gateway_id' => $gateway->id,
                'event' => mb_substr($parsed['event'] ?: 'unknown', 0, 255),
                'external_id' => $parsed['reference'],
                'dedupe_key' => $dedupeKey,
                'signature_valid' => $valid,
                'payload' => $request->getContent(),
                'ip' => $request->ip(),
            ]);
        } catch (UniqueConstraintViolationException) {
            return $this->ok(); // the same event is being handled right now
        }

        if (! $valid) {
            return $this->error('invalid_signature', 401);
        }

        try {
            $this->apply($gateway, $parsed, (array) $request->input('data', []));
        } catch (GatewayException $e) {
            // Answer with an error so the provider retries later.
            report($e);

            return $this->error($e->errorCode, 502);
        }

        $event->update(['processed_at' => now()]);

        return $this->ok();
    }

    private function apply(PaymentGateway $gateway, array $parsed, array $data): void
    {
        if (! $parsed['reference']) {
            return;
        }

        $payment = Payment::where('gateway_id', $gateway->id)->where('gateway_reference', $parsed['reference'])->first();
        if (! $payment) {
            return;
        }

        if (str_starts_with($parsed['event'], 'refund.')) {
            $refund = Refund::where('payment_id', $payment->id)->where('gateway_reference', $data['id'] ?? '')->first();
            $status = ['completed' => 'completed', 'failed' => 'failed'][$data['status'] ?? ''] ?? 'pending';
            if ($refund) {
                $this->billing->applyRefundStatus($refund, $status);
            }

            return;
        }

        $this->billing->syncPayment($payment);
    }
}
