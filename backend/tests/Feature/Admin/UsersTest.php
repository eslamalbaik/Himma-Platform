<?php

namespace Tests\Feature\Admin;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + [
            'email' => 'New.Staff@himma.test', 'nameAr' => 'موظف', 'nameEn' => 'Staff',
            'role' => 'finance', 'status' => 'active', 'password' => 'secret-pass',
        ];
    }

    public function test_lists_only_platform_staff(): void
    {
        $this->signIn('support');
        User::factory()->role('writer')->create(['tenant_id' => Tenant::factory()->create()->id]);

        $this->getJson('/api/admin/users')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_creates_staff_with_a_lowercased_email(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/users', $this->payload())->assertCreated()->assertJsonPath('data.email', 'new.staff@himma.test');
        $this->postJson('/api/admin/users', $this->payload())->assertStatus(422)->assertJsonPath('error.code', 'email_taken');
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created']);
    }

    public function test_invalid_fields_return_their_codes(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/users', $this->payload(['email' => 'x']))->assertJsonPath('error.code', 'invalid_email');
        $this->postJson('/api/admin/users', $this->payload(['nameEn' => '']))->assertJsonPath('error.code', 'invalid_user_name');
        $this->postJson('/api/admin/users', $this->payload(['role' => 'writer']))->assertJsonPath('error.code', 'invalid_role');
        $this->postJson('/api/admin/users', $this->payload(['status' => 'x']))->assertJsonPath('error.code', 'invalid_user_status');
        $this->postJson('/api/admin/users', $this->payload(['password' => 'short']))->assertJsonPath('error.code', 'invalid_password');
    }

    public function test_password_change_ends_the_users_sessions(): void
    {
        $this->signIn();
        $target = User::factory()->role('finance')->create();

        $this->putJson("/api/admin/users/{$target->cuid}", $this->payload(['password' => '']))->assertOk();
        $this->assertSame(0, $target->fresh()->token_version);

        $this->putJson("/api/admin/users/{$target->cuid}", $this->payload(['password' => 'another-pass']))->assertOk();
        $this->assertSame(1, $target->fresh()->token_version);
        $this->assertTrue(Hash::check('another-pass', $target->fresh()->password));
    }

    public function test_changing_my_own_password_keeps_my_session(): void
    {
        $me = $this->signIn();

        $this->putJson("/api/admin/users/{$me->cuid}", $this->payload(['role' => 'super_admin', 'password' => 'another-pass']))->assertOk();
        $this->getJson('/api/auth/me')->assertOk();
    }

    public function test_cannot_disable_or_delete_myself(): void
    {
        $me = $this->signIn();

        $this->putJson("/api/admin/users/{$me->cuid}", $this->payload(['status' => 'disabled', 'password' => '']))
            ->assertStatus(422)->assertJsonPath('error.code', 'cannot_disable_self');
        $this->deleteJson("/api/admin/users/{$me->cuid}")->assertStatus(422)->assertJsonPath('error.code', 'cannot_delete_self');
    }

    public function test_unknown_user_is_not_found(): void
    {
        $this->signIn();

        $this->deleteJson('/api/admin/users/missing')->assertStatus(404)->assertJsonPath('error.code', 'user_not_found');
    }

    public function test_support_can_edit_but_not_create(): void
    {
        $this->signIn('support');

        $this->postJson('/api/admin/users', $this->payload())->assertStatus(403);
    }
}
