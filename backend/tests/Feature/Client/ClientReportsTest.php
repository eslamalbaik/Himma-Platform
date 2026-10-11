<?php

namespace Tests\Feature\Client;

use App\Models\Article;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClientReportsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-11 10:00:00');
        $this->tenant = Tenant::factory()->create(['status' => 'active', 'type' => 'government']);
    }

    private function client(string $role = 'government'): User
    {
        return $this->signIn($role, ['tenant_id' => $this->tenant->id]);
    }

    private function login(User $user, string $at): void
    {
        DB::table('audit_logs')->insert(['cuid' => (string) Str::ulid(), 'action' => 'auth.login', 'actor_id' => $user->id, 'tenant_id' => $user->tenant_id, 'created_at' => $at]);
    }

    public function test_reports_need_the_organisation_reports_permission(): void
    {
        $this->getJson('/api/client/reports')->assertStatus(401);

        $this->client('member');
        $this->getJson('/api/client/reports')->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
    }

    public function test_counts_only_the_own_organisation(): void
    {
        $me = $this->client();
        $other = Tenant::factory()->create();
        Article::factory()->create(['tenant_id' => $this->tenant->id, 'created_at' => '2026-09-03']);
        Article::factory()->create(['tenant_id' => $this->tenant->id, 'status' => 'published', 'published_at' => '2026-10-02', 'created_at' => '2026-10-01']);
        Article::factory()->create(['tenant_id' => $other->id, 'created_at' => '2026-10-01']);
        $this->login($me, '2026-10-05 09:00:00');
        $this->login($me, '2026-10-06 09:00:00');
        $this->login(User::factory()->create(['tenant_id' => $other->id]), '2026-10-05 09:00:00');

        $this->getJson('/api/client/reports')->assertOk()
            ->assertJsonPath('data.from', '2025-11-01')
            ->assertJsonPath('data.articles.created.2026-09', 1)
            ->assertJsonPath('data.articles.created.2026-10', 1)
            ->assertJsonPath('data.articles.published.2026-10', 1)
            ->assertJsonPath('data.articles.byStatus.published', 1)
            ->assertJsonPath('data.members.signIns.2026-10', 2)
            ->assertJsonPath('data.members.membersSignedIn.2026-10', 1)
            ->assertJsonPath('data.members.signedIn', 1);
    }

    public function test_billing_figures_only_for_full_settings_access(): void
    {
        $invoice = Invoice::create([
            'tenant_id' => $this->tenant->id, 'amount' => 400, 'currency' => 'AED', 'status' => 'paid',
            'issued_at' => '2026-09-01', 'due_at' => '2026-09-15',
        ]);
        Payment::create(['invoice_id' => $invoice->id, 'amount' => 400, 'method' => 'cash', 'status' => 'succeeded', 'paid_at' => '2026-09-10']);

        $this->client();
        $response = $this->getJson('/api/client/reports')->assertOk()->assertJsonPath('data.billing.currency', 'AED');
        $this->assertEquals(400, $response->json('data.billing.invoiced.2026-09'));
        $this->assertEquals(400, $response->json('data.billing.paidTotal'));

        // The editor template reports on the organisation with restricted settings: no billing figures.
        $this->client('editor');
        $this->getJson('/api/client/reports')->assertOk()->assertJsonPath('data.billing', null);
    }

    public function test_range_is_checked(): void
    {
        $this->client();

        $this->getJson('/api/client/reports?from=2026-10-01&to=2026-09-01')->assertStatus(422)->assertJsonPath('error.code', 'invalid_range');
        $this->getJson('/api/client/reports?from=2020-01-01&to=2026-10-01')->assertStatus(422)->assertJsonPath('error.code', 'range_too_long');
    }

    public function test_exports_csv_in_the_page_language_and_audits_it(): void
    {
        $this->client();

        $response = $this->get('/api/client/reports/export?lang=en&from=2026-09-01&to=2026-10-31')->assertOk();
        $csv = $response->streamedContent();
        $this->assertStringContainsString('Month,"Articles written"', $csv);
        $this->assertStringContainsString('Invoiced', $csv);
        $this->assertStringContainsString('2026-10,', $csv);

        $log = AuditLog::where('action', 'client.reports_exported')->first();
        $this->assertSame($this->tenant->id, $log->tenant_id);
    }

    public function test_export_needs_the_export_permission(): void
    {
        TenantRole::where('key', 'government')->first()->update(['permissions' => ['entity_reports' => 'allowed', 'export_data' => 'denied']]);
        $this->client();

        $this->getJson('/api/client/reports')->assertOk();
        $this->get('/api/client/reports/export')->assertStatus(403);
    }
}
