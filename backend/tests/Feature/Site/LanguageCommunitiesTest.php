<?php

namespace Tests\Feature\Site;

use App\Models\Article;
use App\Models\Issue;
use App\Models\Tenant;
use App\Models\TenantRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Hinnah's two language communities: `/` is Arabic, `/en` English (the browser sends `X-Community`).
class LanguageCommunitiesTest extends TestCase
{
    use RefreshDatabase;

    private const EN = ['X-Community' => 'en'];

    public function test_the_public_site_lists_one_community(): void
    {
        $arabic = Article::factory()->status('published')->create(['published_at' => now(), 'language' => 'ar']);
        $english = Article::factory()->status('published')->create(['published_at' => now(), 'language' => 'en']);

        $this->getJson('/api/public/articles')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $arabic->cuid);
        $this->getJson('/api/public/articles', self::EN)->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $english->cuid);

        // One story opens from either path and says its language.
        $this->getJson("/api/public/articles/{$english->cuid}")->assertOk()->assertJsonPath('data.language', 'en');
    }

    public function test_each_community_has_its_own_issue_numbers(): void
    {
        $this->signIn('platform_editor');
        $issue = ['number' => 1, 'titleAr' => 'العدد الأول', 'titleEn' => 'First issue'];

        $this->postJson('/api/admin/magazine/issues', $issue)->assertCreated()->assertJsonPath('data.community', 'ar');
        $this->postJson('/api/admin/magazine/issues', $issue)->assertStatus(422)->assertJsonPath('error.code', 'issue_number_taken');
        $this->postJson('/api/admin/magazine/issues', $issue, self::EN)->assertCreated()->assertJsonPath('data.community', 'en');

        $this->getJson('/api/admin/magazine/issues', self::EN)->assertOk()->assertJsonPath('meta.total', 1);
        $this->assertSame(2, Issue::count());
    }

    public function test_signing_up_from_the_english_path_makes_an_english_account(): void
    {
        $this->postJson('/api/auth/register', ['name' => 'Sam', 'email' => 'sam@example.com', 'password' => 'secret-pass'], self::EN)
            ->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'sam@example.com', 'community' => 'en', 'locale' => 'en']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.registered']);
    }

    public function test_an_english_join_request_becomes_an_english_organization(): void
    {
        $this->postJson('/api/public/join-requests', [
            'nameEn' => 'Oak School', 'type' => 'school', // the English form asks for the English name only
            'contactName' => 'Ann', 'contactEmail' => 'ann@example.com',
        ], self::EN)->assertCreated();
        $request = TenantRequest::firstOrFail();
        $this->assertSame('en', $request->community);

        $this->signIn();
        $this->getJson('/api/admin/tenant-requests')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/admin/tenant-requests', self::EN)->assertOk()->assertJsonPath('meta.total', 1);

        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve", [], self::EN)->assertOk();
        $this->assertDatabaseHas('tenants', ['name_en' => 'Oak School', 'name_ar' => 'Oak School', 'community' => 'en']);
        $this->assertDatabaseHas('users', ['email' => 'ann@example.com', 'community' => 'en', 'locale' => 'en']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_request.approved', 'entity_id' => $request->cuid]);
    }

    public function test_a_member_of_the_other_community_cannot_become_the_contact(): void
    {
        User::factory()->role('member')->create(['email' => 'ann@example.com']); // Arabic
        $request = TenantRequest::factory()->create(['contact_email' => 'ann@example.com', 'community' => 'en']);

        $this->signIn();
        $this->postJson("/api/admin/tenant-requests/{$request->cuid}/approve")
            ->assertStatus(409)->assertJsonPath('error.code', 'contact_email_other_community');
    }

    public function test_staff_limited_to_one_community_cannot_open_the_other(): void
    {
        $arabic = Tenant::factory()->create();
        $english = Tenant::factory()->create(['community' => 'en']);

        $this->signIn('sales_manager', ['community' => 'en']);

        // The switcher cannot widen a limited account: it always gets its own community.
        $this->getJson('/api/admin/tenants')->assertOk()
            ->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $english->cuid);
        $this->getJson("/api/admin/tenants/{$english->cuid}")->assertOk();
        $this->getJson("/api/admin/tenants/{$arabic->cuid}")->assertNotFound()->assertJsonPath('error.code', 'not_found');
    }

    public function test_staff_accounts_can_be_limited_to_a_community(): void
    {
        $this->signIn();
        $payload = ['email' => 'en-desk@example.com', 'nameAr' => 'مكتب', 'nameEn' => 'Desk', 'role' => 'support', 'status' => 'active', 'password' => 'secret-pass'];

        $this->postJson('/api/admin/users', $payload + ['community' => 'fr'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_community');
        $this->postJson('/api/admin/users', $payload + ['community' => 'en'])
            ->assertCreated()->assertJsonPath('data.community', 'en');
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created']);
    }

    public function test_members_follow_and_write_inside_their_community(): void
    {
        $english = User::factory()->role('member')->create(['community' => 'en']);
        $this->signIn('member'); // Arabic

        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => $english->handle])
            ->assertStatus(422)->assertJsonPath('error.code', 'other_community');

        // A story is written in the writer's community whatever language the form says.
        $this->postJson('/api/me/stories', ['title' => 'قصة', 'body' => 'نص', 'language' => 'en'])->assertCreated();
        $this->assertDatabaseHas('articles', ['title' => 'قصة', 'language' => 'ar']);
    }

    public function test_staff_of_one_community_write_to_its_people_only(): void
    {
        $english = User::factory()->role('member')->create(['community' => 'en']);
        $arabic = User::factory()->role('member')->create();
        $this->signIn('sales_manager', ['community' => 'ar']);

        $this->postJson('/api/admin/messages/conversations', ['userId' => $english->cuid, 'body' => 'Hello'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_recipient');
        $this->getJson('/api/admin/messages/recipients')->assertOk()
            ->assertJsonMissing(['id' => $english->cuid])->assertJsonFragment(['id' => $arabic->cuid]);
    }
}
