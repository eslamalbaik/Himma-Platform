<?php

namespace Tests\Feature\Admin;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantsTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + ['nameAr' => 'مدرسة النور', 'nameEn' => 'Al Noor School', 'type' => 'school', 'status' => 'active'];
    }

    public function test_requires_a_session_before_looking_up_the_tenant(): void
    {
        $this->getJson('/api/admin/tenants')->assertStatus(401);
        $this->getJson('/api/admin/tenants/missing')->assertStatus(401);
    }

    public function test_role_without_permission_is_forbidden(): void
    {
        $this->signIn('broadcast_moderator');

        $this->getJson('/api/admin/tenants')->assertStatus(403)->assertExactJson(['error' => ['code' => 'forbidden']]);
    }

    public function test_read_only_role_cannot_create(): void
    {
        $this->signIn('finance');

        $this->getJson('/api/admin/tenants')->assertOk();
        $this->postJson('/api/admin/tenants', $this->payload())->assertStatus(403);
    }

    public function test_lists_with_filters_and_meta(): void
    {
        $this->signIn();
        Tenant::factory()->count(3)->create(['type' => 'school']);
        Tenant::factory()->create(['type' => 'government', 'name_en' => 'Ministry X']);

        $this->getJson('/api/admin/tenants?type=school&perPage=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.lastPage', 2);

        $this->getJson('/api/admin/tenants?search=Ministry')->assertJsonPath('meta.total', 1);
    }

    public function test_creates_updates_and_deletes_with_audit(): void
    {
        $this->signIn();

        $id = $this->postJson('/api/admin/tenants', $this->payload())->assertCreated()->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant.created', 'entity_id' => $id]);

        $this->putJson("/api/admin/tenants/$id", $this->payload(['status' => 'suspended']))
            ->assertOk()->assertJsonPath('data.status', 'suspended');

        $this->getJson("/api/admin/tenants/$id")->assertOk()->assertJsonPath('data.nameEn', 'Al Noor School');

        $this->deleteJson("/api/admin/tenants/$id")->assertOk();
        $this->assertDatabaseMissing('tenants', ['cuid' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant.deleted', 'entity_id' => $id]);
    }

    public function test_invalid_fields_return_their_codes(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/tenants', $this->payload(['nameAr' => '  ']))->assertStatus(422)->assertExactJson(['error' => ['code' => 'invalid_tenant_name']]);
        $this->postJson('/api/admin/tenants', $this->payload(['type' => 'club']))->assertJsonPath('error.code', 'invalid_tenant_type');
        $this->postJson('/api/admin/tenants', $this->payload(['status' => 'x']))->assertJsonPath('error.code', 'invalid_tenant_status');
    }

    public function test_missing_tenant_is_not_found(): void
    {
        $this->signIn();

        $this->getJson('/api/admin/tenants/missing')->assertStatus(404)->assertExactJson(['error' => ['code' => 'not_found']]);
    }
}
