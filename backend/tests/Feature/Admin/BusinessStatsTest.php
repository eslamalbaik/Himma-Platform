<?php

namespace Tests\Feature\Admin;

use App\Models\Event;
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

    public function test_requires_sign_in(): void
    {
        $this->getJson('/api/admin/stats/business')->assertStatus(401);
    }

    public function test_revenue_subscriptions_and_attention(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active']);
        $monthly = Plan::create(['name_ar' => 'شهرية', 'name_en' => 'Monthly', 'price' => 100, 'currency' => 'AED', 'interval' => 'monthly']);
        $yearly = Plan::create(['name_ar' => 'سنوية', 'name_en' => 'Yearly', 'price' => 1200, 'currency' => 'AED', 'interval' => 'yearly']);

        Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $monthly->id, 'status' => 'active', 'starts_at' => today()->subMonth(), 'ends_at' => today()->addDays(10)]);
        Subscription::create(['tenant_id' => Tenant::factory()->create(['status' => 'trial'])->id, 'plan_id' => $yearly->id, 'status' => 'past_due', 'starts_at' => today()->subYear(), 'ends_at' => today()->addYear()]);
        // Trials bring no revenue.
        Subscription::create(['tenant_id' => Tenant::factory()->create(['status' => 'trial'])->id, 'plan_id' => $yearly->id, 'status' => 'trial', 'starts_at' => today(), 'ends_at' => today()->addDays(60)]);

        $invoice = Invoice::create([
            'number' => 'INV-T-1', 'tenant_id' => $tenant->id, 'amount' => 300, 'currency' => 'AED', 'status' => 'unpaid',
            'issued_at' => today()->subDays(20), 'due_at' => today()->subDays(5),
        ]);
        Payment::create(['invoice_id' => $invoice->id, 'amount' => 50, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => now()]);

        $this->signIn('finance');

        $this->getJson('/api/admin/stats/business')
            ->assertOk()
            ->assertJsonPath('data.revenue.mrr', 200)
            ->assertJsonPath('data.revenue.arr', 2400)
            ->assertJsonPath('data.revenue.collectedThisMonth', 50)
            ->assertJsonPath('data.revenue.overdueCount', 1)
            ->assertJsonPath('data.revenue.overdueAmount', 250)
            ->assertJsonCount(6, 'data.revenue.monthly')
            ->assertJsonPath('data.subscriptions.endingSoonCount', 1)
            ->assertJsonPath('data.subscriptions.endingSoon.0.tenantId', $tenant->cuid)
            ->assertJsonPath('data.clients.active', 1)
            ->assertJsonPath('data.attention.invoicesOverdue', 1)
            // Finance does not read content, events or messages.
            ->assertJsonMissingPath('data.events')
            ->assertJsonMissingPath('data.attention.articlesInReview')
            ->assertJsonMissingPath('data.attention.messageReportsOpen');
    }

    public function test_broadcast_moderator_sees_only_events(): void
    {
        Event::create([
            'title_ar' => 'ندوة', 'title_en' => 'Webinar', 'type' => 'webinar', 'format' => 'online',
            'starts_at' => now()->addDays(3), 'ends_at' => now()->addDays(3)->addHour(), 'status' => 'scheduled',
        ]);

        $this->signIn('broadcast_moderator');

        $response = $this->getJson('/api/admin/stats/business')
            ->assertOk()
            ->assertJsonPath('data.events.upcomingCount', 1)
            ->assertJsonPath('data.events.upcoming.0.titleEn', 'Webinar');

        $this->assertSame(['events'], array_keys($response->json('data')));
    }
}
