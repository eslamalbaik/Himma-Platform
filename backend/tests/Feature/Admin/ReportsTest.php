<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\AuditLog;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Refund;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-15 12:00:00');
    }

    public function test_requires_sign_in(): void
    {
        $this->getJson('/api/admin/reports/revenue')->assertStatus(401);
    }

    public function test_each_report_also_needs_its_section(): void
    {
        // Support reads billing but not reports; the editor reads reports but not billing.
        $this->signIn('support');
        $this->getJson('/api/admin/reports/revenue')->assertStatus(403)->assertJsonPath('error.code', 'forbidden');

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/reports/revenue')->assertStatus(403);
        $this->getJson('/api/admin/reports/content')->assertOk();

        $this->signIn('finance');
        $this->getJson('/api/admin/reports/revenue')->assertOk();
        $this->getJson('/api/admin/reports/content')->assertStatus(403);
    }

    public function test_period_checks(): void
    {
        $this->signIn();

        $this->getJson('/api/admin/reports/tenants?from=yesterday')->assertStatus(422)->assertJsonPath('error.code', 'invalid_report_period');
        $this->getJson('/api/admin/reports/tenants?from=2026-05-01&to=2026-04-01')->assertJsonPath('error.code', 'invalid_report_period');
        $this->getJson('/api/admin/reports/tenants?from=2023-01-01&to=2026-01-31')->assertJsonPath('error.code', 'invalid_report_period');

        // Default: the last 12 months, this month included.
        $this->getJson('/api/admin/reports/tenants')->assertOk()
            ->assertJsonPath('data.period', ['from' => '2025-11-01', 'to' => '2026-10-15'])
            ->assertJsonCount(12, 'data.monthly');
    }

    public function test_revenue(): void
    {
        $tenant = Tenant::factory()->create();
        $plan = Plan::create(['name_ar' => 'شهرية', 'name_en' => 'Monthly', 'price' => 100, 'currency' => 'AED', 'interval' => 'monthly']);
        $subscription = Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'active', 'starts_at' => '2026-09-01']);

        $invoice = fn (string $number, string $issued, float $amount, string $status = 'unpaid') => Invoice::create([
            'number' => $number, 'tenant_id' => $tenant->id, 'subscription_id' => $subscription->id, 'amount' => $amount,
            'currency' => 'AED', 'status' => $status, 'issued_at' => $issued, 'due_at' => Carbon::parse($issued)->addDays(14),
        ]);
        $september = $invoice('INV-1', '2026-09-01', 100, 'paid');
        $october = $invoice('INV-2', '2026-10-01', 100);
        $invoice('INV-3', '2026-10-02', 999, 'void');
        $october->update(['due_at' => '2026-10-10']);

        $paid = Payment::create(['invoice_id' => $september->id, 'amount' => 100, 'method' => 'card', 'status' => 'succeeded', 'paid_at' => '2026-09-03 10:00']);
        Payment::create(['invoice_id' => $october->id, 'amount' => 40, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => '2026-10-05 10:00']);
        Payment::create(['invoice_id' => $october->id, 'amount' => 60, 'method' => 'card', 'status' => 'failed', 'paid_at' => '2026-10-05 11:00']);
        Refund::create(['payment_id' => $paid->id, 'amount' => 25, 'status' => 'completed']);

        $this->signIn('finance');

        $this->getJson('/api/admin/reports/revenue?from=2026-09-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.summary.invoiced', 200)
            ->assertJsonPath('data.summary.collected', 140)
            ->assertJsonPath('data.summary.refunded', 25)
            ->assertJsonPath('data.summary.net', 115)
            ->assertJsonPath('data.summary.outstandingNow', 60)
            ->assertJsonPath('data.summary.overdueCountNow', 1)
            ->assertJsonPath('data.monthly', [
                ['month' => '2026-09', 'invoiced' => 100, 'collected' => 100, 'refunded' => 0],
                ['month' => '2026-10', 'invoiced' => 100, 'collected' => 40, 'refunded' => 25],
            ])
            ->assertJsonPath('data.byMethod.0', ['method' => 'card', 'amount' => 100, 'count' => 1])
            ->assertJsonPath('data.byPlan.0.planId', $plan->cuid)
            ->assertJsonPath('data.byPlan.0.amount', 140)
            ->assertJsonPath('data.topClients.0.tenantId', $tenant->cuid);
    }

    public function test_tenants(): void
    {
        Tenant::factory()->create(['type' => 'school', 'created_at' => '2026-10-02']);
        Tenant::factory()->create(['type' => 'government', 'created_at' => '2024-01-01']);
        AuditLog::create(['action' => 'subscription.cancelled', 'created_at' => '2026-10-03']);

        $this->signIn('sales_manager');

        $this->getJson('/api/admin/reports/tenants?from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.summary.newTenants', 1)
            ->assertJsonPath('data.summary.totalNow', 2)
            ->assertJsonPath('data.summary.cancellations', 1)
            ->assertJsonPath('data.newByType.school', 1)
            ->assertJsonPath('data.newByType.government', 0)
            ->assertJsonPath('data.byTypeNow.government', 1);
    }

    public function test_content(): void
    {
        $article = fn (array $attributes) => Article::create($attributes + [
            'title' => 'مقال', 'body' => 'نص', 'language' => 'ar', 'author_name' => 'سارة', 'classification' => 'public', 'status' => 'draft',
        ]);
        $published = $article(['status' => 'published', 'published_at' => '2026-10-04']);
        $article(['status' => 'published', 'published_at' => '2026-10-06', 'language' => 'en', 'author_name' => 'Omar']);
        $article(['status' => 'in_review']);
        ContentReport::create(['article_id' => $published->id, 'reporter_name' => 'x', 'reason' => 'copyright']);

        $this->signIn('platform_editor');

        $this->getJson('/api/admin/reports/content?from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.summary.published', 2)
            ->assertJsonPath('data.summary.inReviewNow', 1)
            ->assertJsonPath('data.publishedByLanguage', ['ar' => 1, 'en' => 1])
            ->assertJsonPath('data.reportsByReason.copyright', 1)
            ->assertJsonPath('data.publishedBySection.0.sectionId', null)
            ->assertJsonPath('data.publishedBySection.0.count', 2);
    }

    public function test_events(): void
    {
        $event = Event::create([
            'title_ar' => 'ورشة', 'title_en' => 'Workshop', 'type' => 'workshop', 'format' => 'onsite', 'location' => 'Dubai',
            'starts_at' => '2026-10-05 09:00', 'ends_at' => '2026-10-05 12:00', 'status' => 'ended', 'capacity' => 10,
        ]);
        foreach (['attended', 'attended', 'registered', 'cancelled'] as $i => $status) {
            EventRegistration::create(['event_id' => $event->id, 'name' => "P$i", 'email' => "p$i@x.test", 'status' => $status]);
        }

        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/reports/events')->assertStatus(403); // no `read reports`

        $this->signIn('auditor');

        $this->getJson('/api/admin/reports/events?from=2026-10-01&to=2026-10-31')
            ->assertOk()
            ->assertJsonPath('data.summary.events', 1)
            ->assertJsonPath('data.summary.registrations', 3)
            ->assertJsonPath('data.summary.attended', 2)
            ->assertJsonPath('data.summary.attendanceRate', 66.7)
            ->assertJsonPath('data.byType.workshop', 1)
            ->assertJsonPath('data.topEvents.0.registered', 3);
    }
}
