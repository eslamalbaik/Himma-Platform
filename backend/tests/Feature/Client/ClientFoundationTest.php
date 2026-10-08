<?php

namespace Tests\Feature\Client;

use App\Models\Event;
use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientFoundationTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $email, string $password = 'password')
    {
        return $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/auth/login', compact('email', 'password'));
    }

    public function test_client_accounts_sign_in_when_their_client_is_active(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active', 'name_en' => 'Al Noor School']);
        User::factory()->create(['email' => 'head@alnoor.test', 'role' => 'institution', 'tenant_id' => $tenant->id]);

        $this->login('head@alnoor.test')->assertOk()
            ->assertJsonPath('user.kind', 'client')
            ->assertJsonPath('user.tenant.id', $tenant->cuid)
            ->assertJsonPath('user.tenant.nameEn', 'Al Noor School')
            ->assertJsonPath('user.tenant.billingSuspended', false);
    }

    public function test_suspended_or_cancelled_clients_cannot_sign_in(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'suspended']);
        User::factory()->create(['email' => 'head@closed.test', 'role' => 'institution', 'tenant_id' => $tenant->id]);

        $this->login('head@closed.test')->assertStatus(403)->assertJsonPath('error.code', 'tenant_inactive');
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login_denied', 'actor_email' => 'head@closed.test']);

        // A staff-less account without a platform role still has no dashboard.
        User::factory()->create(['email' => 'odd@himma.test', 'role' => 'institution']);
        $this->login('odd@himma.test')->assertStatus(403)->assertJsonPath('error.code', 'dashboard_not_available');
    }

    public function test_the_two_dashboards_are_separate(): void
    {
        $this->getJson('/api/client/overview')->assertStatus(401);

        $this->signIn('super_admin');
        $this->getJson('/api/client/overview')->assertStatus(403)->assertJsonPath('error.code', 'not_a_client');

        $this->signInClient();
        $this->getJson('/api/admin/stats')->assertStatus(403);
        // Even platform routes that need no particular permission, and before any record lookup.
        $this->getJson('/api/admin/notifications')->assertStatus(403);
        $this->getJson('/api/admin/tenants/nope')->assertStatus(403);
    }

    public function test_a_client_suspended_by_its_client_status_is_shut_out(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active']);
        $this->signInClient($tenant);
        $tenant->update(['status' => 'cancelled']);

        $this->getJson('/api/client/overview')->assertStatus(403)->assertJsonPath('error.code', 'tenant_inactive');
    }

    public function test_overview(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active', 'billing_suspended_at' => now()]);
        $plan = Plan::create(['name_ar' => 'سنوية', 'name_en' => 'Yearly', 'price' => 1200, 'currency' => 'AED', 'interval' => 'yearly']);
        Subscription::create(['tenant_id' => $tenant->id, 'plan_id' => $plan->id, 'status' => 'past_due', 'starts_at' => today()->subYear(), 'ends_at' => today()->addDays(9)]);
        Invoice::create(['number' => 'INV-C-1', 'tenant_id' => $tenant->id, 'amount' => 1200, 'currency' => 'AED', 'status' => 'unpaid', 'issued_at' => today()->subDays(20), 'due_at' => today()->subDays(6)]);
        Event::factory()->status('scheduled')->create(['tenant_id' => $tenant->id, 'visibility' => 'institutional']);
        // Another client's data never shows.
        $other = Tenant::factory()->create();
        Invoice::create(['number' => 'INV-C-2', 'tenant_id' => $other->id, 'amount' => 999, 'currency' => 'AED', 'status' => 'unpaid', 'issued_at' => today(), 'due_at' => today()]);
        Event::factory()->status('scheduled')->create(['tenant_id' => $other->id, 'visibility' => 'institutional']);

        // Suspended for unpaid invoices: the home page and profile stay open.
        $this->signInClient($tenant);

        $this->getJson('/api/client/overview')->assertOk()
            ->assertJsonPath('data.subscription.planNameEn', 'Yearly')
            ->assertJsonPath('data.subscription.daysLeft', 9)
            ->assertJsonPath('data.billing.unpaidCount', 1)
            ->assertJsonPath('data.billing.unpaidAmount', 1200)
            ->assertJsonPath('data.billing.overdueCount', 1)
            ->assertJsonPath('data.billing.suspended', true)
            ->assertJsonCount(1, 'data.upcomingEvents')
            ->assertJsonPath('data.accountsCount', 1);
    }

    public function test_profile(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active']);
        $this->signInClient($tenant);

        $this->getJson('/api/client/profile')->assertOk()->assertJsonPath('data.id', $tenant->cuid);

        $this->putJson('/api/client/profile', ['billingEmail' => 'nope'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_billing_email');
        $this->putJson('/api/client/profile', ['contactPhone' => 'call me'])->assertJsonPath('error.code', 'invalid_phone');
        $this->putJson('/api/client/profile', ['youtubeChannelUrl' => 'https://youtu.be/abc123'])->assertJsonPath('error.code', 'invalid_youtube_channel');

        // Names and status are not the client's to change.
        $this->putJson('/api/client/profile', [
            'billingEmail' => 'Accounts@AlNoor.test', 'contactPhone' => '+971 4 123 4567',
            'youtubeChannelUrl' => 'https://www.youtube.com/@alnoor', 'nameEn' => 'Hacked', 'status' => 'active',
        ])->assertOk()
            ->assertJsonPath('data.billingEmail', 'accounts@alnoor.test')
            ->assertJsonPath('data.contactPhone', '+971 4 123 4567')
            ->assertJsonPath('data.youtubeChannelUrl', 'https://www.youtube.com/@alnoor')
            ->assertJsonPath('data.nameEn', $tenant->name_en);

        $this->assertDatabaseHas('audit_logs', ['action' => 'client.profile_updated', 'entity_id' => $tenant->cuid, 'tenant_id' => $tenant->id]);
    }

    public function test_changes_own_password(): void
    {
        $user = $this->signInClient();
        $version = $user->token_version;

        $this->putJson('/api/client/account/password', ['currentPassword' => 'wrong', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1'])
            ->assertStatus(422)->assertJsonPath('error.code', 'wrong_current_password');
        $this->putJson('/api/client/account/password', ['currentPassword' => 'password', 'password' => 'new-password-1', 'password_confirmation' => 'other'])
            ->assertJsonPath('error.code', 'password_mismatch');

        $this->putJson('/api/client/account/password', ['currentPassword' => 'password', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1'])
            ->assertOk();

        // Other sessions end; this one goes on.
        $this->assertSame($version + 1, $user->fresh()->token_version);
        $this->getJson('/api/client/overview')->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'account.password_changed', 'entity_id' => $user->cuid]);
    }

    // ---- Platform side: Clients → accounts

    public function test_platform_team_manages_client_accounts(): void
    {
        $tenant = Tenant::factory()->create();
        $base = "/api/admin/tenants/{$tenant->cuid}/users";
        $payload = ['nameAr' => 'مدير المدرسة', 'nameEn' => 'Principal', 'email' => 'Principal@School.test', 'role' => 'institution', 'status' => 'active', 'password' => 'first-pass-1'];

        $this->getJson($base)->assertStatus(401);
        $this->signIn('finance');
        $this->getJson($base)->assertOk()->assertJsonPath('roles.0.key', 'member');
        $this->postJson($base, $payload)->assertStatus(403);

        $this->signIn('sales_manager');
        $this->postJson($base, ['role' => 'system_admin'] + $payload)->assertStatus(422)->assertJsonPath('error.code', 'invalid_role');
        $this->postJson($base, ['password' => 'short'] + $payload)->assertJsonPath('error.code', 'invalid_password');

        $id = $this->postJson($base, $payload)->assertCreated()
            ->assertJsonPath('data.email', 'principal@school.test')
            ->assertJsonPath('data.kind', 'client')
            ->json('data.id');
        $this->postJson($base, $payload)->assertStatus(422)->assertJsonPath('error.code', 'email_taken');

        // Resetting the password ends the account's sessions.
        $before = User::where('cuid', $id)->value('token_version');
        $this->putJson("$base/$id", ['password' => 'second-pass-2'] + $payload)->assertOk();
        $this->assertSame($before + 1, User::where('cuid', $id)->value('token_version'));

        // Another client's account is out of reach.
        $foreign = User::factory()->create(['role' => 'institution', 'tenant_id' => Tenant::factory()->create()->id]);
        $this->putJson("$base/{$foreign->cuid}", $payload)->assertStatus(404);

        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_user.created', 'entity_id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_user.updated', 'entity_id' => $id]);
    }
}
