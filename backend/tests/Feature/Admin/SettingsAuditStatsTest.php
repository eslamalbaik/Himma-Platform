<?php

namespace Tests\Feature\Admin;

use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsAuditStatsTest extends TestCase
{
    use RefreshDatabase;

    private function settings(array $override = []): array
    {
        return $override + [
            'platformNameAr' => 'همّة', 'platformNameEn' => 'Himma', 'defaultLocale' => 'ar',
            'supportEmail' => '', 'maintenanceMode' => false,
        ];
    }

    public function test_only_the_owner_reads_and_changes_settings(): void
    {
        $this->signIn('auditor');
        $this->getJson('/api/admin/settings')->assertStatus(403);
    }

    public function test_updates_settings(): void
    {
        $this->signIn();

        $this->putJson('/api/admin/settings', $this->settings(['defaultLocale' => 'fr']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_locale');
        $this->putJson('/api/admin/settings', $this->settings(['supportEmail' => 'bad']))->assertJsonPath('error.code', 'invalid_email');

        $this->putJson('/api/admin/settings', $this->settings(['supportEmail' => 'help@himma.test']))
            ->assertOk()->assertJsonPath('data.supportEmail', 'help@himma.test');
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.updated']);
    }

    public function test_maintenance_mode_blocks_staff_but_not_the_owner(): void
    {
        PlatformSetting::current()->update(['maintenance_mode' => true]);

        $this->signIn('finance');
        $this->getJson('/api/admin/tenants')->assertStatus(503)->assertJsonPath('error.code', 'maintenance_mode');

        $this->signIn();
        $this->getJson('/api/admin/tenants')->assertOk();
    }

    public function test_auditor_reads_the_audit_log(): void
    {
        $this->signIn('auditor');

        $this->getJson('/api/admin/audit-logs')->assertOk()->assertJsonStructure(['data', 'meta' => ['total'], 'actions']);
    }

    public function test_support_cannot_read_the_audit_log(): void
    {
        $this->signIn('support');

        $this->getJson('/api/admin/audit-logs')->assertStatus(403);
    }

    public function test_stats_shape(): void
    {
        $this->signIn('broadcast_moderator');

        $this->getJson('/api/admin/stats')->assertOk()->assertJsonStructure([
            'tenants' => ['total', 'byStatus', 'byType', 'newThisMonth'],
            'users' => ['total', 'platformStaff', 'tenantUsers'],
            'activity' => ['loginsDaily', 'loginsLast7d', 'loginsPrev7d'],
        ]);
    }
}
