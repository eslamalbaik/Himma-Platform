<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $email, string $password = 'password')
    {
        return $this->postJson('/api/auth/login', ['email' => $email, 'password' => $password]);
    }

    public function test_signs_in_and_reads_me(): void
    {
        $user = User::factory()->create(['email' => 'owner@himma.test']);

        $this->login('OWNER@himma.test')->assertOk()->assertJsonPath('user.id', $user->cuid);
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.email', 'owner@himma.test');

        $this->assertNotNull($user->fresh()->last_login_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login', 'actor_id' => $user->id]);
    }

    public function test_wrong_password_is_rejected_and_audited(): void
    {
        $user = User::factory()->create();

        $this->login($user->email, 'wrong-password')->assertStatus(401)->assertExactJson(['error' => ['code' => 'invalid_credentials']]);
        $this->assertSame('wrong_password', json_decode(AuditLog::where('action', 'auth.login_failed')->value('metadata'), true)['reason']);
    }

    public function test_blocks_after_five_failures_for_one_account(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 5) as $i) {
            $this->login($user->email, 'wrong-password')->assertStatus(401);
        }

        $this->login($user->email)->assertStatus(429)->assertJsonPath('error.code', 'too_many_attempts');
    }

    public function test_disabled_account_cannot_sign_in(): void
    {
        $user = User::factory()->disabled()->create();

        $this->login($user->email)->assertStatus(401)->assertJsonPath('error.code', 'invalid_credentials');
    }

    public function test_role_without_a_dashboard_cannot_sign_in(): void
    {
        $user = User::factory()->role('writer')->create();

        $this->login($user->email)->assertStatus(403)->assertJsonPath('error.code', 'dashboard_not_available');
    }

    public function test_maintenance_mode_lets_only_the_owner_in(): void
    {
        PlatformSetting::current()->update(['maintenance_mode' => true]);
        $finance = User::factory()->role('finance')->create();
        $owner = User::factory()->create();

        $this->login($finance->email)->assertStatus(503)->assertJsonPath('error.code', 'maintenance_mode');
        $this->login($owner->email)->assertOk();
    }

    public function test_me_requires_a_session(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401)->assertExactJson(['error' => ['code' => 'unauthenticated']]);
    }

    public function test_password_change_ends_other_sessions(): void
    {
        $user = $this->signIn('finance');
        $user->increment('token_version');

        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_disabling_an_account_ends_its_session(): void
    {
        $user = $this->signIn('finance');
        $user->update(['status' => 'disabled']);

        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_session_without_version_is_rejected(): void
    {
        $this->actingAs(User::factory()->create()->fresh());

        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_logout(): void
    {
        $this->signIn();

        $this->postJson('/api/auth/logout')->assertOk()->assertExactJson(['ok' => true]);
    }

    public function test_writes_from_another_origin_are_refused(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'a@b.c', 'password' => 'x'], ['Origin' => 'https://evil.example'])
            ->assertStatus(403)->assertJsonPath('error.code', 'bad_origin');

        $this->post('/api/auth/login', ['email' => 'a@b.c', 'password' => 'x'])
            ->assertStatus(403)->assertJsonPath('error.code', 'bad_origin');
    }

    public function test_unknown_routes_answer_with_a_code(): void
    {
        $this->getJson('/api/nothing-here')->assertStatus(404)->assertExactJson(['error' => ['code' => 'not_found']]);
        $this->deleteJson('/api/auth/me')->assertStatus(405)->assertExactJson(['error' => ['code' => 'method_not_allowed']]);
    }
}
