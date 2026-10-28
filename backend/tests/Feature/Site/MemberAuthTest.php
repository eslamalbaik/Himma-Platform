<?php

namespace Tests\Feature\Site;

use App\Models\PlatformSetting;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The two sign-in doors (/login for members, /admin/login for staff) and individual sign-up.
class MemberAuthTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $email, ?string $portal)
    {
        return $this->postJson('/api/auth/login', array_filter(['email' => $email, 'password' => 'password', 'portal' => $portal]));
    }

    public function test_member_signs_in_at_the_member_door_only(): void
    {
        $member = User::factory()->role('member')->create();

        $this->login($member->email, 'admin')->assertStatus(403)->assertJsonPath('error.code', 'use_member_login');
        $this->login($member->email, null)->assertStatus(403)->assertJsonPath('error.code', 'use_member_login');
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login_denied', 'actor_id' => $member->id]);

        $this->login($member->email, 'member')->assertOk()->assertJsonPath('user.role', 'member');
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login', 'actor_id' => $member->id]);
    }

    public function test_staff_sign_in_at_the_admin_door_only(): void
    {
        $staff = User::factory()->role('finance')->create();

        $this->login($staff->email, 'member')->assertStatus(403)->assertJsonPath('error.code', 'use_admin_login');
        $this->login($staff->email, 'admin')->assertOk();
    }

    public function test_users_of_a_suspended_organization_cannot_sign_in(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'suspended']);
        $user = User::factory()->role('tenant_admin')->create(['tenant_id' => $tenant->id]);

        $this->login($user->email, 'member')->assertStatus(403)->assertJsonPath('error.code', 'tenant_inactive');

        $tenant->update(['status' => 'active']);
        $this->login($user->email, 'member')->assertOk();
    }

    public function test_an_individual_signs_up_and_is_signed_in(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'سارة أحمد', 'email' => ' Sara@Example.com ', 'password' => 'long-enough', 'locale' => 'ar',
        ])->assertCreated()->assertJsonPath('user.role', 'member')->assertJsonPath('user.nameEn', 'سارة أحمد');

        $user = User::where('email', 'sara@example.com')->firstOrFail();
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.id', $user->cuid);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.registered', 'actor_id' => $user->id]);
    }

    public function test_sign_up_checks_its_input(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);
        $valid = ['name' => 'سارة', 'email' => 'new@example.com', 'password' => 'long-enough'];

        $this->postJson('/api/auth/register', ['email' => 'taken@example.com'] + $valid)
            ->assertStatus(422)->assertJsonPath('error.code', 'email_taken');
        $this->postJson('/api/auth/register', ['email' => 'not-an-email'] + $valid)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_email');
        $this->postJson('/api/auth/register', ['password' => 'short'] + $valid)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_password');
        $this->postJson('/api/auth/register', ['name' => ''] + $valid)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_name');
    }

    public function test_sign_up_is_closed_during_maintenance(): void
    {
        PlatformSetting::current()->update(['maintenance_mode' => true]);

        $this->postJson('/api/auth/register', ['name' => 'سارة', 'email' => 'new@example.com', 'password' => 'long-enough'])
            ->assertStatus(503)->assertJsonPath('error.code', 'maintenance_mode');
    }

    public function test_sign_up_refuses_other_origins(): void
    {
        $this->withHeader('Origin', 'https://evil.example')
            ->postJson('/api/auth/register', ['name' => 'سارة', 'email' => 'new@example.com', 'password' => 'long-enough'])
            ->assertStatus(403)->assertJsonPath('error.code', 'bad_origin');
    }
}
