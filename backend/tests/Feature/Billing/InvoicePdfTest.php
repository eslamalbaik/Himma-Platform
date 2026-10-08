<?php

namespace Tests\Feature\Billing;

use App\Billing\BillingService;
use App\Mail\BillingNoticeMail;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoicePdfTest extends TestCase
{
    use RefreshDatabase;

    private function invoice()
    {
        $tenant = Tenant::factory()->create(['name_ar' => 'جمعية المعلمين', 'name_en' => 'Teachers Association']);

        return app(BillingService::class)->issueInvoice($tenant, 250);
    }

    public function test_pdf_route_permissions_and_download(): void
    {
        $invoice = $this->invoice();
        $url = "/api/admin/billing/invoices/{$invoice->cuid}/pdf";

        $this->get($url)->assertStatus(401);

        $this->signIn('platform_editor');
        $this->get($url)->assertStatus(403);

        $this->signIn('support');
        $response = $this->get($url)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertStringContainsString($invoice->number.'.pdf', $response->headers->get('Content-Disposition'));

        $this->get('/api/admin/billing/invoices/unknown/pdf')->assertStatus(404);
    }

    public function test_invoice_emails_carry_the_pdf(): void
    {
        $invoice = $this->invoice();
        $vars = ['invoiceId' => $invoice->cuid, 'number' => $invoice->number];

        $attachments = (new BillingNoticeMail('invoice_issued', $vars))->attachments();
        $this->assertCount(1, $attachments);
        $this->assertSame($invoice->number.'.pdf', $attachments[0]->as);

        $this->assertSame([], (new BillingNoticeMail('renewal_reminder', $vars))->attachments());

        app(BillingService::class)->recordManualPayment($invoice, 250, 'cash', null, now(), User::factory()->create());
        $this->assertCount(1, (new BillingNoticeMail('payment_received', $vars))->attachments());
    }
}
