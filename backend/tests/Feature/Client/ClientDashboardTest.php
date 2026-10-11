<?php

namespace Tests\Feature\Client;

use App\Models\Article;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientDashboardTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create(['status' => 'active', 'type' => 'school']);
    }

    private function client(string $role = 'institution', array $attributes = []): User
    {
        return $this->signIn($role, ['tenant_id' => $this->tenant->id] + $attributes);
    }

    private function member(array $data = []): array
    {
        return $data + [
            'email' => 'teacher@school.test',
            'nameAr' => 'معلمة',
            'nameEn' => 'Teacher',
            'role' => 'member',
            'status' => 'active',
            'password' => 'secret-pass',
        ];
    }

    public function test_client_user_signs_in_with_their_organisation_and_permissions(): void
    {
        $user = User::factory()->role('institution')->create(['tenant_id' => $this->tenant->id]);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.kind', 'client')
            ->assertJsonPath('user.tenant.id', $this->tenant->cuid)
            ->assertJsonPath('user.roleNameEn', 'School / institution')
            ->assertJsonPath('user.clientPermissions.manage_entity_members', 'allowed')
            ->assertJsonPath('user.clientPermissions.entity_reports', 'restricted');

        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.kind', 'client');
    }

    public function test_staff_session_is_marked_platform(): void
    {
        $this->signIn();

        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.kind', 'platform');
    }

    public function test_client_role_without_an_organisation_still_cannot_sign_in(): void
    {
        $user = User::factory()->role('institution')->create();

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertStatus(403)->assertJsonPath('error.code', 'dashboard_not_available');
    }

    public function test_client_routes_need_a_signed_in_client_user(): void
    {
        $this->getJson('/api/client/overview')->assertStatus(401);

        $this->signIn('super_admin');
        $this->getJson('/api/client/overview')->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
    }

    public function test_client_users_cannot_open_the_admin_api(): void
    {
        $this->client('government');

        $this->getJson('/api/admin/tenants')->assertStatus(403);
        $this->getJson('/api/admin/stats')->assertStatus(403);
    }

    public function test_overview_counts_only_the_own_organisation(): void
    {
        $this->client();
        User::factory()->role('member')->create(['tenant_id' => $this->tenant->id]);
        User::factory()->role('member')->disabled()->create(['tenant_id' => $this->tenant->id]);
        User::factory()->role('member')->create(['tenant_id' => Tenant::factory()->create()->id]);

        Article::factory()->create(['tenant_id' => $this->tenant->id, 'status' => 'in_review']);
        Article::factory()->create(['status' => 'in_review']);

        $plan = Plan::create(['name_ar' => 'باقة', 'name_en' => 'Plan', 'price' => 500, 'currency' => 'AED', 'interval' => 'month']);
        $subscription = Subscription::create([
            'tenant_id' => $this->tenant->id, 'plan_id' => $plan->id, 'status' => 'active',
            'starts_at' => now()->subMonth(), 'ends_at' => now()->addMonth(),
        ]);
        Invoice::create([
            'tenant_id' => $this->tenant->id, 'subscription_id' => $subscription->id,
            'period_start' => now()->subMonth(), 'period_end' => now(), 'amount' => 500, 'currency' => 'AED',
            'status' => 'unpaid', 'issued_at' => now()->subMonth(), 'due_at' => now()->subDays(3),
        ]);

        $response = $this->getJson('/api/client/overview')->assertOk()
            ->assertJsonPath('data.tenant.id', $this->tenant->cuid)
            ->assertJsonPath('data.subscription.planNameEn', 'Plan')
            ->assertJsonPath('data.members.active', 2)
            ->assertJsonPath('data.members.disabled', 1)
            ->assertJsonPath('data.articles.in_review', 1)
            ->assertJsonPath('data.invoices.unpaid', 1)
            ->assertJsonPath('data.invoices.overdue', 1);
        $this->assertEquals(500, $response->json('data.invoices.outstanding'));
    }

    public function test_overview_hides_billing_from_roles_without_full_settings_access(): void
    {
        $this->client('editor');

        $this->getJson('/api/client/overview')->assertOk()
            ->assertJsonPath('data.subscription', null)
            ->assertJsonPath('data.invoices', null)
            ->assertJsonPath('data.tenant.id', $this->tenant->cuid);
    }

    public function test_members_need_the_manage_members_permission(): void
    {
        $this->client('member');

        $this->getJson('/api/client/members')->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
        $this->postJson('/api/client/members', $this->member())->assertStatus(403);
    }

    public function test_lists_only_the_own_organisation_members(): void
    {
        $me = $this->client();
        User::factory()->role('member')->create(['tenant_id' => Tenant::factory()->create()->id]);
        $colleague = User::factory()->role('member')->create(['tenant_id' => $this->tenant->id]);

        $ids = collect($this->getJson('/api/client/members')->assertOk()->json('data'))->pluck('id');
        $this->assertEqualsCanonicalizing([$me->cuid, $colleague->cuid], $ids->all());
    }

    public function test_roles_mark_what_the_user_may_give(): void
    {
        $this->client();

        $roles = collect($this->getJson('/api/client/roles')->assertOk()->json('data'))->keyBy('key');
        $this->assertFalse($roles->has('system_admin'));
        $this->assertFalse($roles->has('visitor'));
        $this->assertTrue($roles['member']['assignable']);
        $this->assertTrue($roles['institution']['assignable']);
        // A government entity has `entity_reports` allowed; an institution only restricted.
        $this->assertFalse($roles['government']['assignable']);
    }

    public function test_adds_a_member_to_the_own_organisation_and_audits_it(): void
    {
        $me = $this->client();

        $id = $this->postJson('/api/client/members', $this->member())->assertCreated()->json('data.id');

        $member = User::where('cuid', $id)->first();
        $this->assertSame($this->tenant->id, $member->tenant_id);
        $this->assertSame('member', $member->role);
        $log = AuditLog::where('action', 'client.member_created')->first();
        $this->assertSame($me->id, $log->actor_id);
        $this->assertSame($this->tenant->id, $log->tenant_id);
        $this->assertSame($id, $log->entity_id);
    }

    public function test_member_input_is_checked(): void
    {
        $this->client();

        $this->postJson('/api/client/members', $this->member(['email' => 'nope']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_email');
        $this->postJson('/api/client/members', $this->member(['role' => 'pilot']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_role');
        $this->postJson('/api/client/members', $this->member(['password' => 'short']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_password');
    }

    public function test_cannot_give_a_role_beyond_their_own(): void
    {
        $this->client();

        $this->postJson('/api/client/members', $this->member(['role' => 'government']))
            ->assertStatus(403)->assertJsonPath('error.code', 'role_not_assignable');
        $this->postJson('/api/client/members', $this->member(['role' => 'system_admin']))
            ->assertStatus(403)->assertJsonPath('error.code', 'role_not_assignable');
    }

    public function test_custom_role_with_more_rights_cannot_be_given(): void
    {
        $this->client('editor');
        TenantRole::create(['key' => 'custom_x', 'name_ar' => 'خاص', 'name_en' => 'Custom', 'type' => 'custom', 'permissions' => ['manage_entity_members' => 'allowed', 'general_settings' => 'allowed']]);

        $this->postJson('/api/client/members', $this->member(['role' => 'custom_x']))->assertStatus(403);
    }

    public function test_edits_a_member_and_ends_their_sessions_on_password_change(): void
    {
        $this->client();
        $member = User::factory()->role('member')->create(['tenant_id' => $this->tenant->id]);

        $this->putJson("/api/client/members/{$member->cuid}", $this->member(['role' => 'writer', 'status' => 'disabled']))
            ->assertOk()->assertJsonPath('data.role', 'writer')->assertJsonPath('data.status', 'disabled');

        $member->refresh();
        $this->assertSame(1, $member->token_version);
        $this->assertNotSame('teacher@school.test', $member->email); // the email is set once
        $this->assertDatabaseHas('audit_logs', ['action' => 'client.member_updated', 'entity_id' => $member->cuid]);
    }

    public function test_cannot_edit_another_organisations_member(): void
    {
        $this->client();
        $other = User::factory()->role('member')->create(['tenant_id' => Tenant::factory()->create()->id]);

        $this->putJson("/api/client/members/{$other->cuid}", $this->member())->assertStatus(404)->assertJsonPath('error.code', 'member_not_found');
    }

    public function test_cannot_edit_someone_with_more_rights(): void
    {
        $this->client();
        $boss = User::factory()->role('government')->create(['tenant_id' => $this->tenant->id]);

        $this->putJson("/api/client/members/{$boss->cuid}", $this->member(['role' => 'member']))
            ->assertStatus(403)->assertJsonPath('error.code', 'role_not_assignable');
    }

    public function test_cannot_change_own_role_or_disable_self(): void
    {
        $me = $this->client();

        $this->putJson("/api/client/members/{$me->cuid}", $this->member(['role' => 'member', 'password' => null]))
            ->assertStatus(422)->assertJsonPath('error.code', 'cannot_change_own_role');
        $this->putJson("/api/client/members/{$me->cuid}", $this->member(['role' => 'institution', 'status' => 'disabled', 'password' => null]))
            ->assertStatus(422)->assertJsonPath('error.code', 'cannot_disable_self');
    }

    public function test_suspended_organisation_can_read_but_not_change(): void
    {
        $this->tenant->update(['status' => 'suspended']);
        $this->client();

        $this->getJson('/api/client/overview')->assertOk();
        $this->getJson('/api/client/members')->assertOk();
        $this->postJson('/api/client/members', $this->member())->assertStatus(403)->assertJsonPath('error.code', 'tenant_suspended');
    }
}
