<?php

namespace App\Billing\Gateways;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Refund;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

// Ziina (https://docs.ziina.com): hosted payment page via payment intents, HMAC-signed webhooks.
// The gateway's `api_key` is the Ziina access token; `webhook_secret` signs the webhooks.
class ZiinaDriver implements GatewayDriver
{
    public const DEFAULT_BASE_URL = 'https://api-v2.ziina.com/api';

    private const PAYMENT_STATUSES = [
        'requires_payment_instrument' => 'pending',
        'requires_user_action' => 'pending',
        'pending' => 'pending',
        'completed' => 'succeeded',
        'failed' => 'failed',
        'canceled' => 'canceled',
    ];

    private const REFUND_STATUSES = ['pending' => 'pending', 'completed' => 'completed', 'failed' => 'failed'];

    public function createCheckout(PaymentGateway $gateway, Payment $payment, array $returnUrls): array
    {
        $invoice = $payment->invoice;

        $body = $this->call($gateway, fn (PendingRequest $http) => $http->post('/payment_intent', [
            'amount' => $this->minorUnits($payment->amount),
            'currency_code' => $invoice->currency,
            'message' => "Himma {$invoice->number}",
            'success_url' => $returnUrls['success'],
            'cancel_url' => $returnUrls['cancel'],
            'failure_url' => $returnUrls['failure'],
            'test' => $gateway->test_mode,
        ]));

        if (empty($body['id']) || empty($body['redirect_url'])) {
            throw new GatewayException('gateway_error', 'Ziina payment intent without id or redirect_url');
        }

        return ['reference' => $body['id'], 'url' => $body['redirect_url']];
    }

    public function fetchStatus(PaymentGateway $gateway, string $reference): string
    {
        $body = $this->call($gateway, fn (PendingRequest $http) => $http->get('/payment_intent/'.rawurlencode($reference)));

        return self::PAYMENT_STATUSES[$body['status'] ?? ''] ?? 'pending';
    }

    public function refund(PaymentGateway $gateway, Payment $payment, Refund $refund): array
    {
        $body = $this->call($gateway, fn (PendingRequest $http) => $http->post('/refund', [
            'id' => (string) Str::uuid(),
            'payment_intent_id' => $payment->gateway_reference,
            'amount' => $this->minorUnits($refund->amount),
            'currency_code' => $payment->invoice->currency,
            'test' => $gateway->test_mode,
        ]));

        return [
            'reference' => $body['id'] ?? null,
            'status' => self::REFUND_STATUSES[$body['status'] ?? ''] ?? 'pending',
        ];
    }

    // X-Hmac-Signature is the hex SHA-256 HMAC of the raw body with the webhook secret.
    public function verifyWebhook(PaymentGateway $gateway, Request $request): bool
    {
        $secret = $gateway->webhook_secret;
        $signature = (string) $request->header('X-Hmac-Signature');

        if (blank($secret) || $signature === '') {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $request->getContent(), $secret), strtolower($signature));
    }

    public function parseWebhook(Request $request): array
    {
        $event = (string) $request->input('event', '');
        $data = (array) $request->input('data', []);

        $reference = match ($event) {
            'payment_intent.status.updated' => $data['id'] ?? null,
            'refund.status.updated' => $data['payment_intent_id'] ?? null,
            default => null,
        };

        $dedupeKey = isset($data['id'], $data['status']) ? "ziina:$event:{$data['id']}:{$data['status']}" : null;

        return ['event' => $event, 'reference' => $reference, 'dedupeKey' => $dedupeKey];
    }

    public function registerWebhook(PaymentGateway $gateway, string $url): void
    {
        $this->call($gateway, fn (PendingRequest $http) => $http->post('/webhook', array_filter([
            'url' => $url,
            'secret' => $gateway->webhook_secret,
        ])));
    }

    // Ziina takes amounts in the currency's smallest unit (fils for AED).
    private function minorUnits($amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    private function call(PaymentGateway $gateway, callable $send): array
    {
        if (blank($gateway->api_key)) {
            throw new GatewayException('gateway_not_configured');
        }

        $http = Http::baseUrl(rtrim($gateway->base_url ?: self::DEFAULT_BASE_URL, '/'))
            ->withToken($gateway->api_key)
            ->acceptJson()
            ->timeout(20);

        try {
            $response = $send($http);
        } catch (Throwable $e) {
            throw new GatewayException('gateway_unreachable', $e->getMessage());
        }

        if ($response->failed()) {
            throw new GatewayException('gateway_error', "Ziina HTTP {$response->status()}: ".Str::limit($response->body(), 300));
        }

        return (array) $response->json();
    }
}
