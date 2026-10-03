<?php

namespace Tests\Feature\Admin;

use App\Models\TenantRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantRequestsTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + [
            'nameAr' => 'جمعية المعلمين', 'nameEn' => 'Teachers Association', 'type' => 'association',
            'contactName' => 'Sara', 'contactEmail' => 'sara@example.com', 'contactPhone' => '',
        ];
    }

    public function test_creates_a_request(): void
    {
        $this->signIn('sales_manager');

        $this->postJson('/api/admin/tenant-requests', $this->payload(['contactEmail' => 'not-an-email']))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_contact_email');

        $this->postJson('/api/admin/tenant-requests', $this->payload())
            ->assertCreated()->assertJsonPath('data.status', 'pending');
    }

    public function test_lists_pending_first_with_count(): void
    {
        $this->signIn();
        TenantRequest::factory()->create(['status' => 'rejected']);
        TenantRequest::factory()->count(2)->create();

        $this->getJson('/api/admin/tenant-requests')
            ->assertOk()
            ->assertJsonPath('meta.pendingCount', 2)
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_approval_creates_a_trial_tenant_once(): void
    {
        $this->signIn();
        $request = TenantRequest::factory()->create(['name_en' => 'New School']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertDatabaseHas('tenants', ['name_en' => 'New School', 'status' => 'trial']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")->assertStatus(409)->assertJsonPath('error.code', 'request_already_reviewed');
        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/reject")->assertStatus(409);
        $this->assertDatabaseCount('tenants', 1);
    }

    public function test_rejection_keeps_the_reason(): void
    {
        $this->signIn();
        $request = TenantRequest::factory()->create();

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/reject", ['reason' => 'Incomplete'])
            ->assertOk()->assertJsonPath('data.status', 'rejected')->assertJsonPath('data.rejectionReason', 'Incomplete');
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_request.rejected', 'entity_id' => $request->cuid]);
    }
}
