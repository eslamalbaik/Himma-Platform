<?php

namespace Tests\Feature\Billing;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionsAndInvoicesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create(['status' => 'trial']);
        $this->plan = Plan::create(['name_ar' => 'سنوية', 'name_en' => 'Yearly', 'price' => 1200, 'currency' => 'AED', 'interval' => 'yearly']);
    }

    private function subscribe(array $override = [])
    {
        return $this->postJson('/api/admin/billing/subscriptions', $override + [
            'tenantId' => $this->tenant->cuid, 'planId' => $this->plan->cuid, 'startsAt' => '2026-10-01',
        ]);
    }

    public function test_subscription_issues_the_first_invoice(): void
    {
        $this->signIn('sales_manager');

        $this->subscribe()->assertCreated()->assertJsonPath('data.status', 'active');

        $invoice = Invoice::firstOrFail();
        $this->assertSame('1200.00', $invoice->amount);
        $this->assertSame('2026-10-01', $invoice->period_start->toDateString());
        $this->assertSame('2027-10-01', $invoice->period_end->toDateString());
        $this->assertSame('INV-'.today()->format('Y').'-'.str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT), $invoice->number);

        $this->subscribe()->assertStatus(409)->assertJsonPath('error.code', 'tenant_already_subscribed');
    }

    public function test_trial_issues_no_invoice(): void
    {
        $this->signIn();

        $this->subscribe(['trialDays' => 30])->assertCreated()->assertJsonPath('data.status', 'trial')->assertJsonPath('data.endsAt', '2026-10-31');
        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_unknown_tenant_or_plan(): void
    {
        $this->signIn();

        $this->subscribe(['tenantId' => 'nope'])->assertStatus(422)->assertJsonPath('error.code', 'tenant_not_found');
        $this->plan->update(['is_active' => false]);
        $this->subscribe()->assertJsonPath('error.code', 'plan_not_found');
    }

    public function test_manual_payments_settle_the_invoice_and_extend_the_subscription(): void
    {
        $this->signIn('finance');
        $subscriptionId = $this->subscribe()->json('data.id');
        $invoice = Invoice::firstOrFail();

        $this->postJson('/api/admin/billing/payments', ['invoiceId' => $invoice->cuid, 'amount' => 2000, 'method' => 'bank_transfer'])
            ->assertStatus(422)->assertJsonPath('error.code', 'amount_exceeds_balance');

        $this->postJson('/api/admin/billing/payments', ['invoiceId' => $invoice->cuid, 'amount' => 200, 'method' => 'cash'])->assertCreated();
        $this->assertSame('unpaid', $invoice->fresh()->status);

        $this->postJson('/api/admin/billing/payments', ['invoiceId' => $invoice->cuid, 'amount' => 1000, 'method' => 'bank_transfer', 'reference' => 'TRX-1'])->assertCreated();

        $this->assertSame('paid', $invoice->fresh()->status);
        $this->getJson("/api/admin/billing/subscriptions/$subscriptionId")
            ->assertJsonPath('data.endsAt', '2027-10-01')
            ->assertJsonPath('data.invoices.0.paidAmount', 1200);
        $this->assertSame('active', $this->tenant->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'invoice.paid', 'entity_id' => $invoice->cuid]);

        $this->postJson('/api/admin/billing/payments', ['invoiceId' => $invoice->cuid, 'amount' => 1, 'method' => 'cash'])
            ->assertStatus(409)->assertJsonPath('error.code', 'invoice_not_payable');
    }

    public function test_sales_can_issue_but_not_record_payments(): void
    {
        $this->signIn('sales_manager');

        $id = $this->postJson('/api/admin/billing/invoices', ['tenantId' => $this->tenant->cuid, 'amount' => 300])
            ->assertCreated()->assertJsonPath('data.currency', 'AED')->json('data.id');

        $this->postJson('/api/admin/billing/payments', ['invoiceId' => $id, 'amount' => 300, 'method' => 'cash'])->assertStatus(403);
    }

    public function test_void_only_unpaid_invoices(): void
    {
        $this->signIn('finance');
        $id = $this->postJson('/api/admin/billing/invoices', ['tenantId' => $this->tenant->cuid, 'amount' => 300])->json('data.id');

        $this->postJson("/api/admin/billing/invoices/$id/void")->assertOk()->assertJsonPath('data.status', 'void');
        $this->postJson("/api/admin/billing/invoices/$id/void")->assertStatus(409)->assertJsonPath('error.code', 'invoice_not_voidable');
    }

    public function test_manual_refund_marks_payment_and_invoice_refunded(): void
    {
        $this->signIn();
        $invoiceId = $this->postJson('/api/admin/billing/invoices', ['tenantId' => $this->tenant->cuid, 'amount' => 300])->json('data.id');
        $paymentId = $this->postJson('/api/admin/billing/payments', ['invoiceId' => $invoiceId, 'amount' => 300, 'method' => 'cash'])->json('data.id');

        $this->postJson("/api/admin/billing/payments/$paymentId/refund", ['amount' => 400])->assertStatus(422)->assertJsonPath('error.code', 'refund_exceeds_payment');
        $this->postJson("/api/admin/billing/payments/$paymentId/refund", ['amount' => 300, 'reason' => 'Duplicate'])
            ->assertCreated()->assertJsonPath('data.status', 'completed');

        $this->getJson("/api/admin/billing/payments/$paymentId")->assertJsonPath('data.status', 'refunded')->assertJsonPath('data.refundable', 0);
        $this->getJson("/api/admin/billing/invoices/$invoiceId")->assertJsonPath('data.status', 'refunded');
    }
}
