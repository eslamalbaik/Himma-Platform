<?php

namespace App\Billing\Gateways;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Refund;
use Illuminate\Http\Request;

// The code behind one kind of payment provider. Statuses returned here are Himma's own:
// pending | succeeded | failed | canceled (payments) and pending | completed | failed (refunds).
interface GatewayDriver
{
    // Starts an online payment; returns ['reference' => provider id, 'url' => hosted payment page].
    public function createCheckout(PaymentGateway $gateway, Payment $payment, array $returnUrls): array;

    // Asks the provider for the payment's current status (webhooks are only a hint).
    public function fetchStatus(PaymentGateway $gateway, string $reference): string;

    // Returns ['reference' => provider refund id, 'status' => refund status].
    public function refund(PaymentGateway $gateway, Payment $payment, Refund $refund): array;

    public function verifyWebhook(PaymentGateway $gateway, Request $request): bool;

    // Returns ['event' => name, 'reference' => payment reference or null, 'dedupeKey' => string or null].
    public function parseWebhook(Request $request): array;

    // Points the provider's webhooks at $url.
    public function registerWebhook(PaymentGateway $gateway, string $url): void;
}
