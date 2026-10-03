<?php

namespace Tests\Feature\Billing;

use App\Billing\BillingService;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ZiinaTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://api-v2.ziina.com/api';

    private function gatewayPayload(array $override = []): array
    {
        return $override + [
            'driver' => 'ziina', 'nameAr' => 'زينا', 'nameEn' => 'Ziina', 'apiKey' => 'ziina-token',
            'webhookSecret' => 'hook-secret', 'isActive' => true, 'testMode' => true, 'sortOrder' => 1,
            'descriptionAr' => 'بوابة دفع زينا', 'descriptionEn' => 'Ziina payment gateway',
        ];
    }

    private function gateway(): PaymentGateway
    {
        return PaymentGateway::create([
            'driver' => 'ziina', 'name_ar' => 'زينا', 'name_en' => 'Ziina', 'api_key' => 'ziina-token',
            'webhook_secret' => 'hook-secret', 'is_active' => true, 'test_mode' => true,
        ]);
    }

    private function invoice(float $amount = 1200.5): Invoice
    {
        return app(BillingService::class)->issueInvoice(Tenant::factory()->create(), $amount, 'AED');
    }

    private function webhook(array $body, ?string $secret = 'hook-secret')
    {
        $raw = json_encode($body);
        $headers = ['CONTENT_TYPE' => 'application/json'];
        if ($secret) {
            $headers['HTTP_X_HMAC_SIGNATURE'] = hash_hmac('sha256', $raw, $secret);
        }

        return $this->call('POST', '/api/billing/webhook/ziina', [], [], [], $headers, $raw);
    }

    public function test_secrets_are_encrypted_and_never_returned(): void
    {
        $this->signIn('finance');

        $response = $this->postJson('/api/admin/billing/gateways', $this->gatewayPayload())->assertCreated()
            ->assertJsonPath('data.hasApiKey', true)
            ->assertJsonPath('data.hasApiSecret', false)
            ->assertJsonPath('data.webhookUrl', 'http://localhost:3000/api/billing/webhook/ziina/');
        $this->assertStringNotContainsString('ziina-token', $response->getContent());
        $this->assertNotSame('ziina-token', DB::table('payment_gateways')->value('api_key'));

        // An empty key on update keeps the stored one.
        $id = $response->json('data.id');
        $this->putJson("/api/admin/billing/gateways/$id", $this->gatewayPayload(['apiKey' => '', 'nameEn' => 'Ziina Pay']))->assertOk();
        $this->assertSame('ziina-token', PaymentGateway::first()->api_key);

        $audit = DB::table('audit_logs')->where('action', 'payment_gateway.created')->value('metadata');
        $this->assertStringNotContainsString('ziina-token', $audit);
    }

    public function test_sales_cannot_manage_gateways(): void
    {
        $this->signIn('sales_manager');

        $this->getJson('/api/admin/billing/gateways')->assertStatus(403);
    }

    public function test_only_one_active_gateway_per_driver(): void
    {
        $this->signIn();
        $first = $this->postJson('/api/admin/billing/gateways', $this->gatewayPayload())->json('data.id');
        $this->postJson('/api/admin/billing/gateways', $this->gatewayPayload(['nameEn' => 'Ziina 2']))->assertCreated();

        $this->assertFalse(PaymentGateway::where('cuid', $first)->first()->is_active);
    }

    public function test_checkout_creates_a_ziina_payment_intent(): void
    {
        $this->signIn('sales_manager');
        $this->gateway();
        $invoice = $this->invoice();
        Http::fake([self::API.'/payment_intent' => Http::response(['id' => 'pi_123', 'redirect_url' => 'https://pay.ziina.com/pi_123', 'status' => 'requires_payment_instrument'])]);

        $this->postJson("/api/admin/billing/invoices/{$invoice->cuid}/checkout")
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.checkoutUrl', 'https://pay.ziina.com/pi_123');

        Http::assertSent(fn (HttpRequest $request) => $request->url() === self::API.'/payment_intent'
            && $request['amount'] === 120050
            && $request['currency_code'] === 'AED'
            && $request['test'] === true
            && $request->hasHeader('Authorization', 'Bearer ziina-token')
            && str_contains($request['success_url'], '/billing/payment-result/?payment='));
    }

    public function test_checkout_without_an_active_gateway(): void
    {
        $this->signIn();

        $this->postJson("/api/admin/billing/invoices/{$this->invoice()->cuid}/checkout")->assertStatus(409)->assertJsonPath('error.code', 'no_active_gateway');
    }

    public function test_gateway_failure_is_reported_as_a_code(): void
    {
        $this->signIn();
        $this->gateway();
        Http::fake([self::API.'/*' => Http::response(['message' => 'bad'], 400)]);

        $this->postJson("/api/admin/billing/invoices/{$this->invoice()->cuid}/checkout")->assertStatus(502)->assertJsonPath('error.code', 'gateway_error');
        $this->assertSame('failed', Payment::first()->status);
    }

    public function test_signed_webhook_settles_the_invoice_once(): void
    {
        $gateway = $this->gateway();
        $invoice = $this->invoice(100);
        $payment = Payment::create(['invoice_id' => $invoice->id, 'gateway_id' => $gateway->id, 'amount' => 100, 'method' => 'online', 'status' => 'pending', 'gateway_reference' => 'pi_9']);
        // The status is read back from Ziina, not taken from the webhook body.
        Http::fake([self::API.'/payment_intent/pi_9' => Http::response(['id' => 'pi_9', 'status' => 'completed'])]);

        $body = ['event' => 'payment_intent.status.updated', 'data' => ['id' => 'pi_9', 'status' => 'completed']];

        $this->webhook($body)->assertOk();
        $this->assertSame('succeeded', $payment->fresh()->status);
        $this->assertSame('paid', $invoice->fresh()->status);

        $this->webhook($body)->assertOk();
        Http::assertSentCount(1);
        $this->assertDatabaseCount('payment_events', 1);
    }

    public function test_unsigned_or_forged_webhooks_are_rejected(): void
    {
        $gateway = $this->gateway();
        $invoice = $this->invoice(100);
        Payment::create(['invoice_id' => $invoice->id, 'gateway_id' => $gateway->id, 'amount' => 100, 'method' => 'online', 'status' => 'pending', 'gateway_reference' => 'pi_9']);
        Http::fake();

        $body = ['event' => 'payment_intent.status.updated', 'data' => ['id' => 'pi_9', 'status' => 'completed']];
        $this->webhook($body, null)->assertStatus(401)->assertJsonPath('error.code', 'invalid_signature');
        $this->webhook($body, 'wrong-secret')->assertStatus(401);

        Http::assertNothingSent();
        $this->assertSame('unpaid', $invoice->fresh()->status);
        $this->assertDatabaseHas('payment_events', ['signature_valid' => false]);
    }

    public function test_payment_result_page_checks_the_status(): void
    {
        $gateway = $this->gateway();
        $invoice = $this->invoice(100);
        $payment = Payment::create(['invoice_id' => $invoice->id, 'gateway_id' => $gateway->id, 'amount' => 100, 'method' => 'online', 'status' => 'pending', 'gateway_reference' => 'pi_7']);
        Http::fake([self::API.'/payment_intent/pi_7' => Http::response(['id' => 'pi_7', 'status' => 'completed'])]);

        $this->getJson("/api/billing/payments/{$payment->cuid}/result")
            ->assertOk()
            ->assertJsonPath('data.status', 'succeeded')
            ->assertJsonPath('data.invoiceNumber', $invoice->number)
            ->assertJsonMissingPath('data.gatewayReference');

        $this->getJson('/api/billing/payments/unknown/result')->assertStatus(404);
    }

    public function test_refund_through_ziina_completes_by_webhook(): void
    {
        $this->signIn('finance');
        $gateway = $this->gateway();
        $invoice = $this->invoice(100);
        $payment = Payment::create(['invoice_id' => $invoice->id, 'gateway_id' => $gateway->id, 'amount' => 100, 'method' => 'online', 'status' => 'succeeded', 'gateway_reference' => 'pi_5', 'paid_at' => now()]);
        app(BillingService::class)->settleInvoice($invoice);
        Http::fake([self::API.'/refund' => Http::response(['id' => 'rf_1', 'payment_intent_id' => 'pi_5', 'status' => 'pending'])]);

        $this->postJson("/api/admin/billing/payments/{$payment->cuid}/refund", ['amount' => 100])->assertCreated()->assertJsonPath('data.status', 'pending');
        Http::assertSent(fn (HttpRequest $request) => $request->url() === self::API.'/refund' && $request['amount'] === 10000 && $request['payment_intent_id'] === 'pi_5');

        $this->webhook(['event' => 'refund.status.updated', 'data' => ['id' => 'rf_1', 'payment_intent_id' => 'pi_5', 'status' => 'completed']])->assertOk();

        $this->assertSame('refunded', $payment->fresh()->status);
        $this->assertSame('refunded', $invoice->fresh()->status);
    }
}
