<?php

namespace Tests\Feature\Permissions;

use App\Models\RoleTemplate;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleTemplatesTest extends TestCase
{
    use RefreshDatabase;

    private function role(string $key): RoleTemplate
    {
        return RoleTemplate::where('key', $key)->firstOrFail();
    }

    public function test_requires_sign_in_and_permission(): void
    {
        $this->getJson('/api/admin/role-templates')->assertStatus(401);

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/role-templates')->assertStatus(403);

        // Auditors read the matrix but cannot change it.
        $this->signIn('auditor');
        $this->getJson('/api/admin/role-templates')->assertOk();
        $this->putJson("/api/admin/role-templates/{$this->role('writer')->cuid}/permissions/publish", ['state' => 'allowed'])->assertStatus(403);
    }

    public function test_lists_the_system_roles_with_their_matrix(): void
    {
        User::factory()->create(['role' => 'institution', 'tenant_id' => Tenant::factory()->create()->id]);
        $this->signIn();

        $response = $this->getJson('/api/admin/role-templates')->assertOk()
            ->assertJsonCount(8, 'data')
            ->assertJsonPath('data.0.key', 'visitor')
            ->assertJsonPath('data.0.usersCount', null)
            ->assertJsonPath('data.0.permissions.read_public', 'allowed')
            ->assertJsonPath('data.0.permissions.publish', 'denied')
            ->assertJsonPath('data.2.permissions.publish', 'restricted')
            ->assertJsonPath('groups.reports', ['view_general_reports', 'view_entity_reports', 'export_data'])
            ->assertJsonPath('recentEvents', []);

        $byKey = collect($response->json('data'))->keyBy('key');
        $this->assertSame(1, $byKey['institution']['usersCount']);
        $this->assertSame(1, $byKey['system_admin']['usersCount']); // the signed-in owner
        $this->assertCount(13, $byKey['editor']['permissions']);
    }

    public function test_changes_one_permission_and_audits_it(): void
    {
        $writer = $this->role('writer');
        $this->signIn();

        $this->putJson("/api/admin/role-templates/{$writer->cuid}/permissions/publish", ['state' => 'maybe'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_permission_state');
        $this->putJson("/api/admin/role-templates/{$writer->cuid}/permissions/fly", ['state' => 'allowed'])->assertStatus(404);

        $this->putJson("/api/admin/role-templates/{$writer->cuid}/permissions/publish", ['state' => 'allowed'])
            ->assertOk()->assertJsonPath('data.permissions.publish', 'allowed');
        // Setting the same state again records nothing.
        $this->putJson("/api/admin/role-templates/{$writer->cuid}/permissions/publish", ['state' => 'allowed'])->assertOk();

        $this->assertDatabaseCount('audit_logs', 1);
        $this->getJson('/api/admin/role-templates')
            ->assertJsonPath('recentEvents.0.action', 'role_template.permission_changed')
            ->assertJsonPath('recentEvents.0.metadata.from', 'restricted')
            ->assertJsonPath('recentEvents.0.metadata.to', 'allowed');
    }

    public function test_adds_a_custom_role_copying_permissions(): void
    {
        $editor = $this->role('editor');
        $this->signIn();

        $this->postJson('/api/admin/role-templates', ['nameAr' => 'منسق'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_role_name');
        $this->postJson('/api/admin/role-templates', ['nameAr' => 'منسق', 'nameEn' => 'Coordinator', 'copyFrom' => 'nope'])
            ->assertJsonPath('error.code', 'invalid_role_template');

        $id = $this->postJson('/api/admin/role-templates', [
            'nameAr' => 'منسق المنطقة', 'nameEn' => 'Area coordinator', 'descriptionAr' => 'يتابع مدارس المنطقة', 'copyFrom' => $editor->cuid,
        ])->assertCreated()
            ->assertJsonPath('data.type', 'custom')
            ->assertJsonPath('data.key', 'custom_area_coordinator')
            ->assertJsonPath('data.permissions', $editor->states())
            ->json('data.id');

        // Without copyFrom everything starts denied; keys stay unique.
        $this->postJson('/api/admin/role-templates', ['nameAr' => 'منسق ثان', 'nameEn' => 'Area coordinator'])
            ->assertCreated()
            ->assertJsonPath('data.key', 'custom_area_coordinator_2')
            ->assertJsonPath('data.permissions.read_public', 'denied');

        $this->putJson("/api/admin/role-templates/$id", ['nameAr' => 'منسق', 'nameEn' => 'Coordinator'])
            ->assertOk()->assertJsonPath('data.nameEn', 'Coordinator');

        $this->assertDatabaseHas('audit_logs', ['action' => 'role_template.created', 'entity_id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'role_template.updated', 'entity_id' => $id]);
    }

    public function test_only_unused_custom_roles_are_deleted(): void
    {
        $this->signIn();

        $this->deleteJson("/api/admin/role-templates/{$this->role('member')->cuid}")
            ->assertStatus(409)->assertJsonPath('error.code', 'system_role_locked');

        $custom = RoleTemplate::create(['key' => 'coordinator', 'name_ar' => 'منسق', 'name_en' => 'Coordinator', 'type' => 'custom', 'permissions' => RoleTemplate::allDenied()]);
        $holder = User::factory()->create(['role' => 'coordinator', 'tenant_id' => Tenant::factory()->create()->id]);
        $this->deleteJson("/api/admin/role-templates/{$custom->cuid}")->assertStatus(409)->assertJsonPath('error.code', 'role_in_use');

        $holder->delete();
        $this->deleteJson("/api/admin/role-templates/{$custom->cuid}")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'role_template.deleted', 'entity_id' => $custom->cuid]);
    }
}
