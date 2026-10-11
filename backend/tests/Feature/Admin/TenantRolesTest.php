<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\TenantRole;
use App\Models\User;
use App\Support\TenantPermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantRolesTest extends TestCase
{
    use RefreshDatabase;

    private function role(string $key): TenantRole
    {
        return TenantRole::where('key', $key)->firstOrFail();
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/tenant-roles')->assertStatus(401);

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/tenant-roles')->assertStatus(403);

        // The auditor reads the matrix but cannot change it.
        $this->signIn('auditor');
        $this->getJson('/api/admin/tenant-roles')->assertOk();
        $this->postJson('/api/admin/tenant-roles', ['nameAr' => 'دور', 'nameEn' => 'Role'])->assertStatus(403);
        $this->putJson("/api/admin/tenant-roles/{$this->role('member')->cuid}/permissions", ['permissions' => ['publish' => 'allowed']])->assertStatus(403);
    }

    public function test_the_system_roles_and_matrix(): void
    {
        $this->signIn();
        $count = count(TenantPermissions::keys());

        $response = $this->getJson('/api/admin/tenant-roles')->assertOk()
            ->assertJsonCount(8, 'data.roles')
            ->assertJsonPath('data.roles.0.key', 'visitor')
            ->assertJsonPath('data.roles.0.type', 'system')
            ->assertJsonPath('data.roles.0.permissions.read_public', 'allowed')
            ->assertJsonPath('data.roles.2.key', 'writer')
            ->assertJsonPath('data.roles.2.permissions.approve_publish', 'denied')
            ->assertJsonPath('data.groups.restricted', ['view_restricted', 'download_restricted'])
            ->assertJsonPath('data.stats.total', 8 * $count);

        $stats = $response->json('data.stats');
        $this->assertSame($stats['total'], $stats['allowed'] + $stats['restricted'] + $stats['denied']);
    }

    public function test_custom_role_copied_from_another(): void
    {
        $owner = $this->signIn();
        $editor = $this->role('editor');

        $this->postJson('/api/admin/tenant-roles', ['nameAr' => '', 'nameEn' => 'Region supervisor'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_role_name');
        $this->postJson('/api/admin/tenant-roles', ['nameAr' => 'مشرف منطقة', 'nameEn' => 'Region supervisor', 'copyFrom' => 'nope'])
            ->assertJsonPath('error.code', 'invalid_copy_from');

        $created = $this->postJson('/api/admin/tenant-roles', [
            'nameAr' => 'مشرف منطقة', 'nameEn' => 'Region supervisor', 'descriptionAr' => 'يتابع مدارس المنطقة', 'copyFrom' => $editor->cuid,
        ])->assertCreated()->assertJsonPath('data.type', 'custom')->assertJsonPath('data.usersCount', 0)->json('data');

        $this->assertStringStartsWith('custom_', $created['key']);
        $this->assertSame($editor->toPublicArray()['permissions'], $created['permissions']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_role.created', 'actor_id' => $owner->id, 'entity_id' => $created['id']]);

        // Without copyFrom every permission starts denied.
        $blank = $this->postJson('/api/admin/tenant-roles', ['nameAr' => 'فارغ', 'nameEn' => 'Blank'])->json('data.permissions');
        $this->assertSame(['denied'], array_values(array_unique($blank)));

        $this->putJson("/api/admin/tenant-roles/{$created['id']}", ['nameAr' => 'مشرف المنطقة', 'nameEn' => 'Area supervisor'])
            ->assertOk()->assertJsonPath('data.nameEn', 'Area supervisor');
    }

    public function test_changing_cells_is_checked_and_audited(): void
    {
        $this->signIn();
        $member = $this->role('member');
        $url = "/api/admin/tenant-roles/{$member->cuid}/permissions";

        $this->putJson($url, ['permissions' => ['fly' => 'allowed']])->assertStatus(422)->assertJsonPath('error.code', 'unknown_permission');
        $this->putJson($url, ['permissions' => ['publish' => 'sometimes']])->assertStatus(422)->assertJsonPath('error.code', 'invalid_permission_state');
        $this->putJson($url, ['permissions' => []])->assertStatus(422)->assertJsonPath('error.code', 'invalid_permissions');

        $this->putJson($url, ['permissions' => ['publish' => 'allowed', 'read_public' => 'allowed']])->assertOk()
            ->assertJsonPath('data.permissions.publish', 'allowed');

        $log = AuditLog::where('action', 'tenant_role.permissions_updated')->sole();
        // Only the cell that changed is recorded.
        $this->assertSame(['publish' => ['from' => 'restricted', 'to' => 'allowed']], json_decode($log->metadata, true)['changes']);

        // Nothing changed: no new audit row.
        $this->putJson($url, ['permissions' => ['publish' => 'allowed']])->assertOk();
        $this->assertSame(1, AuditLog::where('action', 'tenant_role.permissions_updated')->count());

        $this->getJson('/api/admin/tenant-roles')->assertJsonPath('data.recent.0.action', 'tenant_role.permissions_updated');
    }

    public function test_deleting_roles(): void
    {
        $this->signIn();

        $this->deleteJson("/api/admin/tenant-roles/{$this->role('visitor')->cuid}")->assertStatus(409)->assertJsonPath('error.code', 'cannot_delete_system_role');

        $id = $this->postJson('/api/admin/tenant-roles', ['nameAr' => 'دور', 'nameEn' => 'Role'])->json('data.id');
        $role = TenantRole::where('cuid', $id)->sole();
        $user = User::factory()->create(['role' => $role->key]);

        $this->getJson('/api/admin/tenant-roles')->assertJsonPath('data.roles.8.usersCount', 1);
        $this->deleteJson("/api/admin/tenant-roles/$id")->assertStatus(409)->assertJsonPath('error.code', 'role_in_use');

        $user->delete();
        $this->deleteJson("/api/admin/tenant-roles/$id")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_role.deleted', 'entity_id' => $id]);
    }
}
