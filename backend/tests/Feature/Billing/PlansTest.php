<?php

namespace Tests\Feature\Billing;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlansTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + [
            'nameAr' => 'الباقة الأساسية', 'nameEn' => 'Basic', 'price' => 1200, 'currency' => 'aed',
            'interval' => 'yearly', 'featuresAr' => 'مزايا', 'featuresEn' => 'Features', 'isActive' => true,
        ];
    }

    public function test_permissions(): void
    {
        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/billing/plans')->assertStatus(403);

        $this->signIn('support');
        $this->getJson('/api/admin/billing/plans')->assertOk();
        $this->postJson('/api/admin/billing/plans', $this->payload())->assertStatus(403);
    }

    public function test_creates_updates_and_deletes_a_plan(): void
    {
        $this->signIn('finance');

        $id = $this->postJson('/api/admin/billing/plans', $this->payload())
            ->assertCreated()->assertJsonPath('data.currency', 'AED')->assertJsonPath('data.price', 1200)->json('data.id');

        $this->putJson("/api/admin/billing/plans/$id", $this->payload(['price' => 1500, 'isActive' => false]))
            ->assertOk()->assertJsonPath('data.price', 1500)->assertJsonPath('data.isActive', false);

        $this->deleteJson("/api/admin/billing/plans/$id")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'plan.deleted', 'entity_id' => $id]);
    }

    public function test_invalid_fields_return_their_codes(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/billing/plans', $this->payload(['nameEn' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_plan_name');
        $this->postJson('/api/admin/billing/plans', $this->payload(['price' => -1]))->assertJsonPath('error.code', 'invalid_price');
        $this->postJson('/api/admin/billing/plans', $this->payload(['currency' => 'dirham']))->assertJsonPath('error.code', 'invalid_currency');
        $this->postJson('/api/admin/billing/plans', $this->payload(['interval' => 'weekly']))->assertJsonPath('error.code', 'invalid_interval');
    }

    public function test_plan_with_subscriptions_cannot_be_deleted(): void
    {
        $this->signIn();
        $plan = Plan::create(['name_ar' => 'أ', 'name_en' => 'A', 'price' => 100, 'interval' => 'monthly']);
        Subscription::create(['tenant_id' => Tenant::factory()->create()->id, 'plan_id' => $plan->id, 'status' => 'active', 'starts_at' => today()]);

        $this->deleteJson("/api/admin/billing/plans/{$plan->cuid}")->assertStatus(409)->assertJsonPath('error.code', 'plan_in_use');
    }
}
