<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Comment;
use App\Models\ContentReport;
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

    private function subscription(string $status, float $price, string $interval, string $endsAt): Subscription
    {
        $plan = Plan::create(['name_ar' => 'باقة', 'name_en' => 'Plan', 'price' => $price, 'currency' => 'AED', 'interval' => $interval]);

        return Subscription::create([
            'tenant_id' => Tenant::factory()->create(['status' => 'active'])->id,
            'plan_id' => $plan->id,
            'status' => $status,
            'starts_at' => '2026-01-01',
            'ends_at' => $endsAt,
        ]);
    }

    private function invoice(Subscription $subscription, float $amount, string $dueAt): Invoice
    {
        return Invoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'period_start' => '2026-10-01',
            'period_end' => '2026-11-01',
            'amount' => $amount,
            'currency' => 'AED',
            'status' => 'unpaid',
            'issued_at' => '2026-10-01',
            'due_at' => $dueAt,
        ]);
    }

    public function test_requires_sign_in(): void
    {
        $this->getJson('/api/admin/stats/business')->assertStatus(401);
    }

    public function test_client_users_cannot_read_it(): void
    {
        $this->signIn('tenant_admin', ['tenant_id' => Tenant::factory()->create()->id]);

        $this->getJson('/api/admin/stats/business')->assertStatus(403);
    }

    public function test_revenue_subscriptions_and_attention_for_the_owner(): void
    {
        $this->travelTo('2026-10-15 12:00:00');

        $monthly = $this->subscription('active', 300, 'monthly', '2026-11-01');
        $this->subscription('past_due', 1200, 'yearly', '2027-01-01');
        $this->subscription('trial', 500, 'monthly', '2026-10-20');

        // Partly paid and overdue: 1000 owed, 400 paid this month.
        $overdue = $this->invoice($monthly, 1000, '2026-10-10');
        Payment::create(['invoice_id' => $overdue->id, 'amount' => 400, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => '2026-10-12']);
        Payment::create(['invoice_id' => $overdue->id, 'amount' => 50, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => '2026-09-05']);
        Payment::create(['invoice_id' => $overdue->id, 'amount' => 999, 'method' => 'online', 'status' => 'failed', 'paid_at' => '2026-10-12']);
        $this->invoice($monthly, 200, '2026-10-30');

        Article::factory()->count(2)->status('in_review')->create();
        $published = Article::factory()->status('published')->create();
        Comment::create(['article_id' => $published->id, 'author_name' => 'قارئ', 'body' => 'تعليق', 'status' => 'pending']);
        ContentReport::create(['article_id' => $published->id, 'reporter_name' => 'قارئ', 'reason' => 'other', 'status' => 'open']);
        Event::factory()->status('scheduled')->create(['starts_at' => now()->addDays(3), 'ends_at' => now()->addDays(3)->addHour()]);
        Event::factory()->status('live')->create();

        $this->signIn();

        $response = $this->getJson('/api/admin/stats/business')->assertOk();

        // MRR: 300 monthly + 1200 yearly / 12; the trial is not paying yet. Overdue: 1000 less 450 paid.
        // Money is compared by value: JSON turns 400.0 into 400.
        $revenue = $response->json('data.revenue');
        $this->assertEquals(
            ['mrr' => 400, 'arr' => 4800, 'collectedThisMonth' => 400, 'collectedLastMonth' => 50, 'overdueCount' => 1, 'overdueAmount' => 550, 'unpaidAmount' => 750],
            array_intersect_key($revenue, array_flip(['mrr', 'arr', 'collectedThisMonth', 'collectedLastMonth', 'overdueCount', 'overdueAmount', 'unpaidAmount']))
        );
        $this->assertCount(6, $revenue['monthly']);
        $this->assertSame('2026-10', $revenue['monthly'][5]['month']);

        $response->assertJsonPath('data.subscriptions.byStatus.active', 1)
            ->assertJsonPath('data.subscriptions.endingSoonCount', 2)
            ->assertJsonPath('data.subscriptions.endingSoon.0.status', 'trial');

        $response->assertJsonPath('data.attention.articlesInReview', 2)
            ->assertJsonPath('data.attention.commentsPending', 1)
            ->assertJsonPath('data.attention.contentReportsOpen', 1)
            ->assertJsonPath('data.attention.messageReportsOpen', 0)
            ->assertJsonPath('data.attention.invoicesOverdue', 1);

        $response->assertJsonPath('data.events.liveNow', 1)->assertJsonPath('data.events.upcomingCount', 1);
        $response->assertJsonStructure(['data' => ['clients' => ['active', 'trial', 'suspended', 'newThisMonth', 'churnedThisMonth']]]);
    }

    public function test_each_block_follows_the_role(): void
    {
        $this->signIn('finance');
        $this->getJson('/api/admin/stats/business')->assertOk()
            ->assertJsonStructure(['data' => ['revenue', 'subscriptions', 'clients', 'attention' => ['invoicesOverdue']]])
            ->assertJsonMissingPath('data.events')
            ->assertJsonMissingPath('data.attention.articlesInReview');

        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/stats/business')->assertOk()
            ->assertJsonStructure(['data' => ['events']])
            ->assertJsonMissingPath('data.revenue')
            ->assertJsonMissingPath('data.clients')
            ->assertJsonMissingPath('data.attention');
    }
}
