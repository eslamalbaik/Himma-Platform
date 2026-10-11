<?php

namespace Tests\Feature\Client;

use App\Billing\BillingService;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ClientBillingTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://api-v2.ziina.com/api';

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create(['status' => 'active']);
    }

    private function client(string $role = 'institution'): void
    {
        $this->signIn($role, ['tenant_id' => $this->tenant->id]);
    }

    private function invoice(?Tenant $tenant = null, float $amount = 300): Invoice
    {
        return app(BillingService::class)->issueInvoice($tenant ?? $this->tenant, $amount, 'AED');
    }

    private function gateway(): PaymentGateway
    {
        return PaymentGateway::create([
            'driver' => 'ziina', 'name_ar' => 'زينا', 'name_en' => 'Ziina', 'api_key' => 'ziina-token',
            'webhook_secret' => 'hook-secret', 'is_active' => true, 'test_mode' => true,
        ]);
    }

    private function fakeZiina(): void
    {
        Http::fake([self::API.'/payment_intent' => Http::response(['id' => 'pi_1', 'redirect_url' => 'https://pay.ziina.com/pi_1', 'status' => 'requires_payment_instrument'])]);
    }

    public function test_billing_needs_a_client_user_with_full_settings_access(): void
    {
        $this->getJson('/api/client/billing/invoices')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/client/billing/invoices')->assertStatus(403);
    }

    public function test_restricted_settings_is_not_enough(): void
    {
        $this->client('editor');

        $this->getJson('/api/client/billing')->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
        $this->getJson('/api/client/billing/invoices')->assertStatus(403);
    }

    public function test_lists_only_the_own_invoices_with_their_balance(): void
    {
        $this->client();
        $mine = $this->invoice();
        $this->invoice(Tenant::factory()->create());

        $this->getJson('/api/client/billing/invoices')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->cuid)
            ->assertJsonPath('meta.total', 1);
        $this->assertEquals(300, $this->getJson('/api/client/billing/invoices')->json('data.0.balance'));
    }

    public function test_summary_lists_online_gateways_only(): void
    {
        $this->client();
        $this->gateway();
        PaymentGateway::create(['driver' => 'manual', 'name_ar' => 'تحويل', 'name_en' => 'Transfer', 'is_active' => true]);

        $this->getJson('/api/client/billing')->assertOk()
            ->assertJsonCount(1, 'data.gateways')
            ->assertJsonPath('data.gateways.0.nameEn', 'Ziina');
    }

    public function test_another_organisations_invoice_is_not_found(): void
    {
        $this->client();
        $other = $this->invoice(Tenant::factory()->create());

        $this->getJson("/api/client/billing/invoices/{$other->cuid}")->assertStatus(404)->assertJsonPath('error.code', 'invoice_not_found');
        $this->getJson("/api/client/billing/invoices/{$other->cuid}/pdf")->assertStatus(404);
        $this->postJson("/api/client/billing/invoices/{$other->cuid}/pay")->assertStatus(404);
    }

    public function test_downloads_the_own_invoice_pdf(): void
    {
        $this->client();
        $invoice = $this->invoice();

        $response = $this->get("/api/client/billing/invoices/{$invoice->cuid}/pdf")->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_pays_online_and_reuses_the_open_checkout(): void
    {
        $this->client();
        $this->gateway();
        $this->fakeZiina();
        $invoice = $this->invoice();

        $first = $this->postJson("/api/client/billing/invoices/{$invoice->cuid}/pay")->assertCreated()
            ->assertJsonPath('data.checkoutUrl', 'https://pay.ziina.com/pi_1');
        $this->postJson("/api/client/billing/invoices/{$invoice->cuid}/pay")->assertOk()
            ->assertJsonPath('data.paymentId', $first->json('data.paymentId'));

        $this->assertSame(1, Payment::count());
        $log = AuditLog::where('action', 'payment.checkout_created')->first();
        $this->assertSame($this->tenant->id, $log->tenant_id);
    }

    public function test_paid_invoice_cannot_be_paid_again(): void
    {
        $this->client();
        $this->gateway();
        $invoice = $this->invoice();
        $invoice->update(['status' => 'paid']);

        $this->postJson("/api/client/billing/invoices/{$invoice->cuid}/pay")->assertStatus(409)->assertJsonPath('error.code', 'invoice_not_payable');
    }

    public function test_without_an_online_gateway(): void
    {
        $this->client();

        $this->postJson("/api/client/billing/invoices/{$this->invoice()->cuid}/pay")->assertStatus(409)->assertJsonPath('error.code', 'no_active_gateway');
    }

    public function test_suspended_organisation_can_still_pay(): void
    {
        $this->tenant->update(['status' => 'suspended']);
        $this->client();
        $this->gateway();
        $this->fakeZiina();

        $this->postJson("/api/client/billing/invoices/{$this->invoice()->cuid}/pay")->assertCreated();
        $this->postJson('/api/client/members', [])->assertStatus(403)->assertJsonPath('error.code', 'tenant_suspended');
    }
}
