<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Invoice;
use App\Models\MagazineSection;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Refund;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-10-15 12:00:00');
    }

    private function paidInvoice(Tenant $tenant, float $amount, string $issuedAt, ?string $paidAt): Invoice
    {
        $invoice = Invoice::create([
            'tenant_id' => $tenant->id, 'period_start' => $issuedAt, 'period_end' => $issuedAt,
            'amount' => $amount, 'currency' => 'AED', 'status' => $paidAt ? 'paid' : 'unpaid',
            'issued_at' => $issuedAt, 'due_at' => $issuedAt,
        ]);
        if ($paidAt) {
            Payment::create(['invoice_id' => $invoice->id, 'amount' => $amount, 'method' => 'bank_transfer', 'status' => 'succeeded', 'paid_at' => $paidAt, 'reference' => 'TRX']);
        }

        return $invoice;
    }

    public function test_requires_sign_in(): void
    {
        $this->getJson('/api/admin/reports/revenue')->assertStatus(401);
        $this->getJson('/api/admin/reports/revenue/export')->assertStatus(401);
    }

    public function test_each_report_needs_reports_and_its_area(): void
    {
        // The platform editor reads reports and content, but not billing.
        $this->signIn('platform_editor');
        $this->getJson('/api/admin/reports/revenue')->assertStatus(403);
        $this->getJson('/api/admin/reports/revenue/export')->assertStatus(403);
        $this->getJson('/api/admin/reports/content')->assertOk();

        // Support reads content, but not reports.
        $this->signIn('support');
        $this->getJson('/api/admin/reports/content')->assertStatus(403);

        $this->signIn('finance');
        $this->getJson('/api/admin/reports/revenue')->assertOk();
        $this->getJson('/api/admin/reports/events')->assertStatus(403);
    }

    public function test_period_is_checked(): void
    {
        $this->signIn();

        $this->getJson('/api/admin/reports/tenants?from=2026-13-01')->assertStatus(422)->assertJsonPath('error.code', 'invalid_date');
        $this->getJson('/api/admin/reports/tenants?from=2026-10-01&to=2026-09-01')->assertStatus(422)->assertJsonPath('error.code', 'invalid_range');
        $this->getJson('/api/admin/reports/tenants?from=2020-01-01&to=2026-01-01')->assertStatus(422)->assertJsonPath('error.code', 'range_too_long');
        $this->getJson('/api/admin/reports/tenants/export?lang=fr')->assertStatus(422)->assertJsonPath('error.code', 'invalid_locale');

        // Default: the last 12 months, month by month.
        $this->getJson('/api/admin/reports/tenants')->assertOk()
            ->assertJsonPath('data.from', '2025-11-01')->assertJsonPath('data.to', '2026-10-15')
            ->assertJsonCount(12, 'data.monthly');
    }

    public function test_revenue(): void
    {
        $tenant = Tenant::factory()->create(['name_ar' => 'مدرسة النور', 'name_en' => 'Al Noor School']);
        $this->paidInvoice($tenant, 1000, '2026-09-01', '2026-09-03');
        $refunded = $this->paidInvoice($tenant, 500, '2026-10-01', '2026-10-02');
        $this->paidInvoice($tenant, 300, '2026-10-05', null);
        $this->paidInvoice($tenant, 999, '2026-06-01', '2026-06-01'); // before the period
        Refund::create(['payment_id' => $refunded->payments()->first()->id, 'amount' => 100, 'status' => 'completed']);

        $plan = Plan::create(['name_ar' => 'سنوية', 'name_en' => 'Yearly', 'price' => 1200, 'currency' => 'AED', 'interval' => 'yearly']);
        Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'active', 'starts_at' => '2026-01-01', 'ends_at' => '2027-01-01']);

        $this->signIn('finance');
        $response = $this->getJson('/api/admin/reports/revenue?from=2026-09-01&to=2026-10-31')->assertOk();

        $this->assertEquals(
            ['invoiced' => 1800, 'collected' => 1500, 'refunded' => 100, 'net' => 1400, 'outstanding' => 300],
            $response->json('data.totals')
        );
        $this->assertEquals(
            [['month' => '2026-09', 'invoiced' => 1000, 'collected' => 1000, 'refunded' => 0], ['month' => '2026-10', 'invoiced' => 800, 'collected' => 500, 'refunded' => 100]],
            $response->json('data.monthly')
        );
        $response->assertJsonPath('data.byPlan.0.planNameEn', 'Yearly')->assertJsonPath('data.byPlan.0.subscriptions', 1)
            ->assertJsonPath('data.byMethod.0.method', 'bank_transfer')->assertJsonPath('data.byMethod.0.payments', 2)
            ->assertJsonPath('data.topClients.0.tenantNameEn', 'Al Noor School');
        $this->assertEquals(100, $response->json('data.byPlan.0.mrr'));
        $this->assertEquals(1500, $response->json('data.topClients.0.amount'));
    }

    public function test_tenants(): void
    {
        Tenant::factory()->count(2)->create(['status' => 'active', 'type' => 'school']);
        $old = Tenant::factory()->create(['status' => 'suspended', 'type' => 'association', 'created_at' => '2025-01-01']);
        $plan = Plan::create(['name_ar' => 'شهرية', 'name_en' => 'Monthly', 'price' => 100, 'currency' => 'AED', 'interval' => 'monthly']);
        Subscription::create(['tenant_id' => $old->id, 'plan_id' => $plan->id, 'status' => 'cancelled', 'starts_at' => '2025-01-01', 'ends_at' => '2026-11-01']);
        TenantRequest::factory()->create(['status' => 'approved']);
        TenantRequest::factory()->create();

        $this->signIn('sales_manager');
        $response = $this->getJson('/api/admin/reports/tenants?from=2026-10-01&to=2026-10-31')->assertOk();

        $response->assertJsonPath('data.totals.clients', 3)->assertJsonPath('data.totals.new', 2)->assertJsonPath('data.totals.cancelled', 1)
            ->assertJsonPath('data.byType.school', 2)->assertJsonPath('data.byStatus.suspended', 1)
            ->assertJsonPath('data.requests.approved', 1)->assertJsonPath('data.requests.pending', 1)
            ->assertJsonPath('data.monthly.0.new', 2);
    }

    public function test_content(): void
    {
        $section = MagazineSection::create(['name_ar' => 'المقالات التربوية', 'name_en' => 'Educational articles', 'axis' => 'knowledge']);
        Article::factory()->count(2)->status('published')->create(['published_at' => '2026-10-02', 'section_id' => $section->id, 'author_name' => 'سارة']);
        Article::factory()->status('published')->create(['published_at' => '2026-03-01']);
        Article::factory()->status('in_review')->create();

        $this->signIn('platform_editor');
        $response = $this->getJson('/api/admin/reports/content?from=2026-10-01&to=2026-10-31')->assertOk();

        $response->assertJsonPath('data.totals.published', 2)->assertJsonPath('data.totals.created', 4)
            ->assertJsonPath('data.bySection.0.nameEn', 'Educational articles')->assertJsonPath('data.bySection.0.articles', 2)
            ->assertJsonPath('data.topAuthors.0.author', 'سارة')
            ->assertJsonPath('data.byStatus.in_review', 1)->assertJsonPath('data.byLanguage.ar', 2);
    }

    public function test_events(): void
    {
        $event = Event::factory()->status('ended')->create(['starts_at' => '2026-10-05 17:00', 'ends_at' => '2026-10-05 19:00']);
        foreach (['attended', 'attended', 'registered', 'cancelled'] as $i => $status) {
            EventRegistration::create(['event_id' => $event->id, 'name' => "P$i", 'email' => "p$i@test.local", 'status' => $status]);
        }
        Event::factory()->status('cancelled')->create(['starts_at' => '2026-10-20 17:00', 'ends_at' => '2026-10-20 19:00']);

        $this->signIn('auditor');
        $response = $this->getJson('/api/admin/reports/events?from=2026-10-01&to=2026-10-31')->assertOk();

        $response->assertJsonPath('data.totals.events', 2)->assertJsonPath('data.totals.held', 1)->assertJsonPath('data.totals.cancelled', 1)
            ->assertJsonPath('data.totals.registrations', 3)->assertJsonPath('data.totals.attended', 2)
            ->assertJsonPath('data.totals.attendanceRate', 67)
            ->assertJsonPath('data.events.1.registered', 3)->assertJsonPath('data.events.1.attended', 2);
    }

    public function test_export_is_a_translated_csv_and_audited(): void
    {
        $tenant = Tenant::factory()->create(['name_ar' => 'مدرسة النور', 'name_en' => 'Al Noor School']);
        $this->paidInvoice($tenant, 1000, '2026-10-01', '2026-10-03');

        $user = $this->signIn('finance');
        $response = $this->get('/api/admin/reports/revenue/export?from=2026-10-01&to=2026-10-31&lang=en')->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('himma-revenue-2026-10-01-2026-10-31.csv', $response->headers->get('Content-Disposition'));
        $csv = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $lines = array_values(array_filter(explode("\n", substr($csv, 3))));
        $this->assertSame('Date,Invoice,Client,Method,Amount,Currency,Reference', $lines[0]);
        $this->assertStringContainsString('"Al Noor School","Bank transfer",1000,AED,TRX', $lines[1]);

        $arabic = $this->get('/api/admin/reports/revenue/export?from=2026-10-01&to=2026-10-31&lang=ar')->streamedContent();
        $this->assertStringContainsString('التاريخ,الفاتورة,العميل', $arabic);
        $this->assertStringContainsString('مدرسة النور', $arabic);

        $this->assertDatabaseHas('audit_logs', ['action' => 'reports.exported', 'actor_id' => $user->id, 'entity_type' => 'report', 'entity_id' => 'revenue']);
    }
}
