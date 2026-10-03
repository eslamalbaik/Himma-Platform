<?php

namespace App\Billing\Gateways;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Refund;
use Illuminate\Http\Request;

// Bank transfer / cash: no online checkout. Finance records the payment by hand,
// and a refund is money returned outside the platform, so it completes at once.
class ManualDriver implements GatewayDriver
{
    public function createCheckout(PaymentGateway $gateway, Payment $payment, array $returnUrls): array
    {
        throw new GatewayException('gateway_not_online');
    }

    public function fetchStatus(PaymentGateway $gateway, string $reference): string
    {
        throw new GatewayException('gateway_not_online');
    }

    public function refund(PaymentGateway $gateway, Payment $payment, Refund $refund): array
    {
        return ['reference' => null, 'status' => 'completed'];
    }

    public function verifyWebhook(PaymentGateway $gateway, Request $request): bool
    {
        return false;
    }

    public function parseWebhook(Request $request): array
    {
        return ['event' => '', 'reference' => null, 'dedupeKey' => null];
    }

    public function registerWebhook(PaymentGateway $gateway, string $url): void
    {
        throw new GatewayException('gateway_not_online');
    }
}
