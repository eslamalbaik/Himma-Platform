<?php

namespace Tests\Feature\Admin;

use App\Mail\JoinApprovedMail;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

// After a join request is approved, its contact gets an admin account and an email to choose a password.
class JoinInvitationTest extends TestCase
{
    use RefreshDatabase;

    public function test_approving_creates_the_admin_account_and_emails_the_invitation(): void
    {
        Mail::fake();
        $this->signIn();
        $request = TenantRequest::factory()->create(['contact_email' => 'Owner@School.test', 'contact_name' => 'Ahmed']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")->assertOk();

        $user = User::where('email', 'owner@school.test')->first();
        $this->assertSame('tenant_admin', $user->role);
        $this->assertNotNull($user->tenant_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created', 'entity_id' => $user->cuid]);
        Mail::assertQueued(JoinApprovedMail::class, fn ($mail) => $mail->hasTo('owner@school.test') && str_contains($mail->vars['url'], '/set-password?token='));
    }

    public function test_an_existing_member_becomes_the_admin_without_a_new_password(): void
    {
        Mail::fake();
        $this->signIn();
        $member = User::factory()->role('member')->create(['email' => 'reader@school.test']);
        $request = TenantRequest::factory()->create(['contact_email' => 'reader@school.test']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")->assertOk();

        $this->assertSame('tenant_admin', $member->fresh()->role);
        $this->assertNotNull($member->fresh()->tenant_id);
        Mail::assertNothingQueued();
    }

    public function test_an_email_used_by_staff_blocks_the_approval(): void
    {
        $this->signIn();
        User::factory()->role('finance')->create(['email' => 'staff@school.test']);
        $request = TenantRequest::factory()->create(['contact_email' => 'staff@school.test']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")
            ->assertStatus(409)->assertJsonPath('error.code', 'contact_email_in_use');

        $this->assertSame('pending', $request->fresh()->status);
        $this->assertDatabaseCount('tenants', 0);
    }

    public function test_the_contact_chooses_a_password_once_and_is_signed_in(): void
    {
        Mail::fake();
        $this->signIn();
        $request = TenantRequest::factory()->create(['contact_email' => 'owner@school.test']);
        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")->assertOk();
        $user = User::where('email', 'owner@school.test')->first();

        $this->app['auth']->guard('web')->logout();
        $token = Password::broker('invitations')->createToken($user);
        $body = ['email' => 'owner@school.test', 'token' => $token, 'password' => 'a-good-password'];

        $this->postJson('/api/auth/set-password', ['password' => 'short'] + $body)->assertStatus(422)->assertJsonPath('error.code', 'invalid_password');
        $this->postJson('/api/auth/set-password', ['token' => 'wrong'] + $body)->assertStatus(422)->assertJsonPath('error.code', 'invalid_invitation');

        $this->postJson('/api/auth/set-password', $body)->assertOk()->assertJsonPath('user.role', 'tenant_admin');
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.password_set', 'entity_id' => $user->cuid]);

        // The link cannot be used a second time.
        $this->postJson('/api/auth/set-password', $body)->assertStatus(422)->assertJsonPath('error.code', 'invalid_invitation');
    }

    public function test_the_invitation_can_be_sent_again_until_the_contact_signs_in(): void
    {
        Mail::fake();
        $this->signIn();
        $request = TenantRequest::factory()->create(['contact_email' => 'owner@school.test']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/resend-invitation")->assertStatus(409);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")->assertOk();
        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/resend-invitation")->assertOk();
        Mail::assertQueuedCount(2);
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_request.invitation_resent', 'entity_id' => $request->cuid]);

        User::where('email', 'owner@school.test')->update(['last_login_at' => now()]);
        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/resend-invitation")->assertStatus(409)->assertJsonPath('error.code', 'invitation_not_needed');

        $this->signIn('finance');
        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/resend-invitation")->assertStatus(403);
    }

    public function test_resending_creates_the_missing_account_of_an_old_approval(): void
    {
        Mail::fake();
        $this->signIn();
        $tenant = Tenant::factory()->create();
        $request = TenantRequest::factory()->create(['status' => 'approved', 'tenant_id' => $tenant->id, 'contact_email' => 'old@school.test']);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/resend-invitation")->assertOk();

        $this->assertSame($tenant->id, User::where('email', 'old@school.test')->value('tenant_id'));
        Mail::assertQueued(JoinApprovedMail::class);
    }
}
