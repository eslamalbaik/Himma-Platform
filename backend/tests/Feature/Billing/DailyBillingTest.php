<?php

namespace Tests\Feature\Billing;

use App\Billing\BillingService;
use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyBillingTest extends TestCase
{
    use RefreshDatabase;

    private function subscription(string $status, string $endsAt): Subscription
    {
        $plan = Plan::create(['name_ar' => 'شهرية', 'name_en' => 'Monthly', 'price' => 100, 'currency' => 'AED', 'interval' => 'monthly']);

        return Subscription::create([
            'tenant_id' => Tenant::factory()->create(['status' => 'active'])->id,
            'plan_id' => $plan->id,
            'status' => $status,
            'starts_at' => '2026-01-01',
            'ends_at' => $endsAt,
        ]);
    }

    public function test_renewal_invoice_is_issued_once_before_the_period_ends(): void
    {
        $this->travelTo('2026-10-01');
        $subscription = $this->subscription('active', '2026-10-05');

        $this->artisan('billing:run')->assertSuccessful();
        $this->artisan('billing:run')->assertSuccessful();

        $invoice = Invoice::sole();
        $this->assertSame('2026-10-05', $invoice->period_start->toDateString());
        $this->assertSame('2026-11-05', $invoice->period_end->toDateString());
        $this->assertSame('2026-10-05', $invoice->due_at->toDateString());
        $this->assertSame($subscription->id, $invoice->subscription_id);
    }

    public function test_unpaid_client_becomes_past_due_then_suspended_and_payment_restores_it(): void
    {
        $this->travelTo('2026-10-01');
        $subscription = $this->subscription('active', '2026-10-05');
        $billing = app(BillingService::class);
        $billing->runDaily();
        $invoice = Invoice::sole();

        $this->travelTo('2026-10-06');
        $billing->runDaily();
        $this->assertSame('past_due', $subscription->fresh()->status);
        $this->assertSame('active', $subscription->tenant->fresh()->status);

        $this->travelTo('2026-10-20'); // due 10-05 + 14 grace days
        $billing->runDaily();
        $tenant = $subscription->tenant->fresh();
        $this->assertSame('suspended', $tenant->status);
        $this->assertNotNull($tenant->billing_suspended_at);

        $billing->recordManualPayment($invoice, 100, 'bank_transfer', null, now(), User::factory()->create());

        $this->assertSame('active', $tenant->fresh()->status);
        $this->assertNull($tenant->fresh()->billing_suspended_at);
        $this->assertSame('active', $subscription->fresh()->status);
        $this->assertSame('2026-11-05', $subscription->fresh()->ends_at->toDateString());
    }

    public function test_a_person_suspension_is_not_lifted_by_payment(): void
    {
        $this->travelTo('2026-10-01');
        $subscription = $this->subscription('active', '2026-10-05');
        $subscription->tenant->update(['status' => 'suspended']);
        $billing = app(BillingService::class);
        $billing->runDaily();

        $billing->recordManualPayment(Invoice::sole(), 100, 'cash', null, now(), User::factory()->create());

        $this->assertSame('suspended', $subscription->tenant->fresh()->status);
    }

    public function test_cancelled_subscriptions_are_not_renewed(): void
    {
        $this->travelTo('2026-10-01');
        $this->subscription('cancelled', '2026-10-05');

        $this->artisan('billing:run')->assertSuccessful();

        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_billing_settings(): void
    {
        $this->signIn('finance');

        $this->putJson('/api/admin/billing/settings', ['currency' => 'aed', 'invoiceDueDays' => 500, 'renewDaysBefore' => 7, 'graceDays' => 14])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_billing_setting');

        $this->putJson('/api/admin/billing/settings', ['currency' => 'aed', 'invoiceDueDays' => 10, 'renewDaysBefore' => 5, 'graceDays' => 3])
            ->assertOk()->assertJsonPath('data.currency', 'AED')->assertJsonPath('data.graceDays', 3);

        $this->getJson('/api/admin/billing/settings')->assertJsonPath('data.invoiceDueDays', 10);
    }
}
