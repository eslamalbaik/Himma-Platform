<?php

namespace Tests\Feature\Admin;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_permissions_and_blocks_follow_the_role(): void
    {
        $this->getJson('/api/admin/stats/business')->assertStatus(401);

        $this->signIn('broadcast_moderator');
        $data = $this->getJson('/api/admin/stats/business')->assertOk()->json('data');
        $this->assertArrayHasKey('events', $data);
        $this->assertArrayNotHasKey('revenue', $data);
        $this->assertArrayNotHasKey('clients', $data);

        $this->signIn('finance');
        $data = $this->getJson('/api/admin/stats/business')->assertOk()->json('data');
        $this->assertArrayHasKey('revenue', $data);
        $this->assertArrayNotHasKey('events', $data);
    }

    public function test_revenue_and_subscription_figures(): void
    {
        $this->travelTo('2026-10-15');
        $monthly = Plan::create(['name_ar' => 'شهرية', 'name_en' => 'Monthly', 'price' => 300, 'currency' => 'AED', 'interval' => 'monthly']);
        $yearly = Plan::create(['name_ar' => 'سنوية', 'name_en' => 'Yearly', 'price' => 1200, 'currency' => 'AED', 'interval' => 'yearly']);

        $sub = fn (Plan $plan, string $status, string $ends) => Subscription::create([
            'tenant_id' => Tenant::factory()->create()->id, 'plan_id' => $plan->id,
            'status' => $status, 'starts_at' => '2026-01-01', 'ends_at' => $ends,
        ]);
        $active = $sub($monthly, 'active', '2026-10-25');   // 300 a month, ends within 30 days
        $sub($yearly, 'past_due', '2027-03-01');             // 1200 / 12 = 100 a month
        $sub($monthly, 'trial', '2026-12-30');               // trials are not revenue

        $invoice = Invoice::create([
            'tenant_id' => $active->tenant_id, 'amount' => 300, 'currency' => 'AED', 'status' => 'unpaid',
            'issued_at' => '2026-09-20', 'due_at' => '2026-10-01',
        ]);
        Payment::create(['invoice_id' => $invoice->id, 'amount' => 100, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => '2026-10-05']);
        Payment::create(['invoice_id' => $invoice->id, 'amount' => 50, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => '2026-09-10']);

        $this->signIn('super_admin');
        $this->getJson('/api/admin/stats/business')->assertOk()
            ->assertJsonPath('data.revenue.mrr', 400)
            ->assertJsonPath('data.revenue.arr', 4800)
            ->assertJsonPath('data.revenue.collectedThisMonth', 100)
            ->assertJsonPath('data.revenue.collectedLastMonth', 50)
            ->assertJsonCount(6, 'data.revenue.monthly')
            ->assertJsonPath('data.revenue.overdueCount', 1)
            ->assertJsonPath('data.revenue.overdueAmount', 150)
            ->assertJsonPath('data.subscriptions.endingSoonCount', 1)
            ->assertJsonPath('data.subscriptions.endingSoon.0.endsAt', '2026-10-25')
            ->assertJsonPath('data.attention.invoicesOverdue', 1);
    }
}
