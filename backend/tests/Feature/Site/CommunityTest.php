<?php

namespace Tests\Feature\Site;

use App\Models\Article;
use App\Models\AuditLog;
use App\Models\Event;
use App\Models\Follow;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

// Profiles, following, the verified badge, an organization's people and broadcasts, and story audiences.
class CommunityTest extends TestCase
{
    use RefreshDatabase;

    private function org(): Tenant
    {
        return Tenant::factory()->create(['status' => 'active']);
    }

    private function orgAdmin(?Tenant $tenant = null): User
    {
        return $this->signIn('tenant_admin', ['tenant_id' => ($tenant ?? $this->org())->id]);
    }

    private function publish(User $author, string $classification = 'public', array $override = []): Article
    {
        return Article::factory()->status('published')->create($override + [
            'author_id' => $author->id,
            'tenant_id' => $author->tenant_id,
            'classification' => $classification,
            'published_at' => now(),
        ]);
    }

    private function broadcastPayload(array $override = []): array
    {
        return $override + [
            'titleAr' => 'بث مباشر', 'titleEn' => 'Live session', 'type' => 'webinar', 'format' => 'online',
            'visibility' => 'public', 'startsAt' => now()->addDay()->toIso8601String(),
            'endsAt' => now()->addDay()->addHour()->toIso8601String(), 'streamUrl' => 'https://youtube.com/live/abc',
        ];
    }

    // ---- profiles

    public function test_a_person_has_a_public_profile_without_private_details(): void
    {
        $person = User::factory()->role('member')->create(['bio_ar' => 'قارئ', 'handle' => 'sara-reader']);
        $staff = User::factory()->role('support')->create();

        $this->getJson('/api/public/people/sara-reader')->assertOk()
            ->assertJsonPath('data.handle', 'sara-reader')
            ->assertJsonPath('data.bioAr', 'قارئ')
            ->assertJsonPath('data.verified', false)
            ->assertJsonPath('data.isFollowing', false)
            ->assertJsonMissingPath('data.email');

        $this->getJson("/api/public/people/{$staff->handle}")->assertStatus(404);
        $this->getJson('/api/public/people/nobody-here')->assertStatus(404);
    }

    public function test_every_new_account_gets_a_unique_handle(): void
    {
        $a = User::factory()->role('member')->create(['name_en' => 'Same Name']);
        $b = User::factory()->role('member')->create(['name_en' => 'Same Name']);

        $this->assertNotEmpty($a->handle);
        $this->assertNotSame($a->handle, $b->handle);
    }

    public function test_an_organization_profile_lists_people_and_public_broadcasts_only(): void
    {
        $tenant = $this->org();
        User::factory()->role('tenant_admin')->create(['tenant_id' => $tenant->id]);
        Event::factory()->status('scheduled')->create(['tenant_id' => $tenant->id, 'title_en' => 'Open session']);
        Event::factory()->status('scheduled')->create(['tenant_id' => $tenant->id, 'visibility' => 'institutional', 'title_en' => 'Staff only']);
        Event::factory()->status('draft')->create(['tenant_id' => $tenant->id, 'title_en' => 'Hidden draft']);

        $response = $this->getJson("/api/public/organizations/{$tenant->slug}")->assertOk()
            ->assertJsonPath('data.membersCount', 1)
            ->assertJsonCount(1, 'data.broadcasts')
            ->assertJsonPath('data.broadcasts.0.titleEn', 'Open session');
        $this->assertNull($response->json('data.broadcasts.0.streamUrl'));

        $this->getJson('/api/public/organizations/missing')->assertStatus(404);
        $tenant->update(['status' => 'suspended']);
        $this->getJson("/api/public/organizations/{$tenant->slug}")->assertStatus(404);
    }

    public function test_updates_own_profile_with_a_free_handle(): void
    {
        User::factory()->role('member')->create(['handle' => 'taken-one']);
        $me = $this->signIn('member');

        $body = ['handle' => 'My-New-Handle', 'nameAr' => 'اسم', 'nameEn' => 'Name', 'bioAr' => 'نبذة', 'bioEn' => 'Bio'];
        $this->putJson('/api/me/profile', ['handle' => 'taken-one'] + $body)->assertStatus(422)->assertJsonPath('error.code', 'handle_taken');
        $this->putJson('/api/me/profile', ['handle' => 'a b'] + $body)->assertStatus(422)->assertJsonPath('error.code', 'invalid_handle');
        $this->putJson('/api/me/profile', ['nameAr' => ''] + $body)->assertStatus(422)->assertJsonPath('error.code', 'invalid_name');

        $this->putJson('/api/me/profile', $body)->assertOk()->assertJsonPath('data.handle', 'my-new-handle');
        $this->assertSame('my-new-handle', $me->fresh()->handle);
        $this->assertDatabaseHas('audit_logs', ['action' => 'profile.updated', 'actor_id' => $me->id]);
    }

    public function test_profile_routes_need_a_member(): void
    {
        $this->getJson('/api/me/profile')->assertStatus(401);
        $this->signIn('finance');
        $this->getJson('/api/me/profile')->assertStatus(403);
    }

    // ---- following

    public function test_follows_and_unfollows_people_and_organizations(): void
    {
        $author = User::factory()->role('member')->create();
        $tenant = $this->org();
        $me = $this->signIn('member');

        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => $author->handle])->assertCreated()
            ->assertJsonPath('data.followersCount', 1);
        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => $author->handle])->assertCreated()
            ->assertJsonPath('data.followersCount', 1);
        $this->postJson('/api/me/follows', ['type' => 'organization', 'key' => $tenant->slug])->assertCreated();
        $this->assertSame(2, Follow::where('follower_id', $me->id)->count());
        $this->assertSame(1, AuditLog::where('action', 'follow.followed')->where('entity_id', $author->handle)->count());

        $this->getJson("/api/public/people/{$author->handle}")->assertJsonPath('data.isFollowing', true)->assertJsonPath('data.followersCount', 1);
        $this->getJson('/api/me/following')->assertOk()->assertJsonCount(2, 'data');

        $this->deleteJson("/api/me/follows/person/{$author->handle}")->assertOk()->assertJsonPath('data.followersCount', 0);
        $this->assertSame(1, Follow::where('follower_id', $me->id)->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'follow.unfollowed', 'actor_id' => $me->id]);
    }

    public function test_follow_checks_its_target(): void
    {
        $me = $this->signIn('member');

        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => $me->handle])->assertStatus(422)->assertJsonPath('error.code', 'cannot_follow_self');
        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => 'nobody'])->assertStatus(404);
        $this->postJson('/api/me/follows', ['type' => 'planet', 'key' => 'x'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_follow_target');
    }

    public function test_following_needs_sign_in_and_a_member_role(): void
    {
        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => 'x'])->assertStatus(401);
        $this->signIn('auditor');
        $this->postJson('/api/me/follows', ['type' => 'person', 'key' => 'x'])->assertStatus(403);
    }

    public function test_followers_only_stories_open_for_followers_only(): void
    {
        $author = User::factory()->role('member')->create();
        $story = $this->publish($author, 'followers');
        $open = $this->publish($author, 'public');

        // A guest sees only the public story, and is told whom to follow for the other.
        $this->getJson("/api/public/articles?authorHandle={$author->handle}")->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson("/api/public/articles/{$story->cuid}")->assertStatus(403)
            ->assertJsonPath('error.code', 'followers_only')->assertJsonPath('target.key', $author->handle);
        $this->getJson('/api/public/articles')->assertJsonPath('meta.total', 1);

        $reader = $this->signIn('member');
        $this->getJson("/api/public/articles/{$story->cuid}")->assertStatus(403);

        Follow::create(['follower_id' => $reader->id, 'followable_type' => 'user', 'followable_id' => $author->id]);
        $this->getJson("/api/public/articles/{$story->cuid}")->assertOk()->assertJsonPath('data.classification', 'followers');
        $this->getJson("/api/public/articles?authorHandle={$author->handle}")->assertJsonPath('meta.total', 2);
        $this->getJson('/api/public/articles?following=1')->assertJsonPath('meta.total', 2);
        $this->getJson("/api/public/articles/{$open->cuid}")->assertOk();
    }

    public function test_organization_only_stories_are_for_its_members(): void
    {
        $tenant = $this->org();
        $writer = User::factory()->role('tenant_member')->create(['tenant_id' => $tenant->id]);
        $story = $this->publish($writer, 'institutional');

        $this->getJson("/api/public/articles/{$story->cuid}")->assertStatus(403)->assertJsonPath('error.code', 'members_only');

        $this->signIn('member');
        $this->getJson("/api/public/articles/{$story->cuid}")->assertStatus(403);

        $this->signIn('tenant_member', ['tenant_id' => $tenant->id]);
        $this->getJson("/api/public/articles/{$story->cuid}")->assertOk();
    }

    public function test_a_story_audience_is_chosen_by_its_writer(): void
    {
        $this->signIn('member');
        $body = ['title' => 'عنوان', 'body' => 'نص', 'language' => 'ar'];

        $this->postJson('/api/me/stories', $body + ['audience' => 'institutional'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_audience');
        $id = $this->postJson('/api/me/stories', $body + ['audience' => 'followers'])->assertCreated()
            ->assertJsonPath('data.audience', 'followers')->json('data.id');
        $this->putJson("/api/me/stories/$id", $body)->assertOk()->assertJsonPath('data.audience', 'followers');

        $this->signIn('tenant_member', ['tenant_id' => $this->org()->id]);
        $this->postJson('/api/me/stories', $body + ['audience' => 'institutional'])->assertCreated()->assertJsonPath('data.audience', 'institutional');
    }

    // ---- verification

    public function test_a_member_asks_for_the_badge_and_staff_approve_it(): void
    {
        $me = $this->signIn('member');

        $this->postJson('/api/me/verification', ['subject' => 'person', 'evidence' => 'short'])->assertStatus(422)->assertJsonPath('error.code', 'verification_evidence_required');
        $id = $this->postJson('/api/me/verification', ['subject' => 'person', 'evidence' => 'Author of two published books, see my site.'])
            ->assertCreated()->assertJsonPath('data.status', 'pending')->json('data.id');
        $this->postJson('/api/me/verification', ['subject' => 'person', 'evidence' => 'Author of two published books, see my site.'])
            ->assertStatus(409)->assertJsonPath('error.code', 'verification_pending');
        $this->getJson('/api/me/verification')->assertOk()->assertJsonPath('person.verified', false)->assertJsonCount(1, 'data');

        $this->postJson("/api/admin/verifications/$id/approve")->assertStatus(403);

        $staff = $this->signIn('sales_manager');
        $this->getJson('/api/admin/verifications?status=pending')->assertOk()->assertJsonPath('meta.pendingCount', 1)
            ->assertJsonPath('data.0.subjectKey', $me->handle);
        $this->postJson("/api/admin/verifications/$id/approve", ['note' => 'Confirmed'])->assertOk()->assertJsonPath('data.status', 'approved');
        $this->postJson("/api/admin/verifications/$id/reject")->assertStatus(409)->assertJsonPath('error.code', 'verification_already_decided');

        $this->assertNotNull($me->fresh()->verified_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'verification.approved', 'actor_id' => $staff->id, 'entity_id' => $id]);

        $this->actingAs($me->fresh());
        $this->getJson("/api/public/people/{$me->handle}")->assertJsonPath('data.verified', true);
        $this->postJson('/api/me/verification', ['subject' => 'person', 'evidence' => 'Already verified, asking again.'])->assertStatus(409)->assertJsonPath('error.code', 'already_verified');
    }

    public function test_only_an_organization_admin_asks_for_the_organization_badge(): void
    {
        $tenant = $this->org();
        $evidence = ['subject' => 'organization', 'evidence' => 'Licensed by the ministry, licence attached.'];

        $this->signIn('tenant_member', ['tenant_id' => $tenant->id]);
        $this->postJson('/api/me/verification', $evidence)->assertStatus(403);

        $this->signIn('member');
        $this->postJson('/api/me/verification', $evidence)->assertStatus(403);

        $this->signIn('tenant_admin', ['tenant_id' => $tenant->id]);
        $id = $this->postJson('/api/me/verification', $evidence)->assertCreated()->assertJsonPath('data.subjectType', 'organization')->json('data.id');

        $this->signIn('platform_editor');
        $this->postJson("/api/admin/verifications/$id/reject", ['note' => 'Licence unreadable'])->assertOk()->assertJsonPath('data.status', 'rejected');
        $this->assertNull($tenant->fresh()->verified_at);
        $this->assertSame('rejected', VerificationRequest::where('cuid', $id)->value('status'));

        $this->signIn('sales_manager');
        $id2 = VerificationRequest::create(['subject_type' => 'tenant', 'subject_id' => $tenant->id, 'requested_by' => User::first()->id, 'evidence' => 'Second try with documents.'])->cuid;
        $this->postJson("/api/admin/verifications/$id2/approve")->assertOk();
        $this->assertNotNull($tenant->fresh()->verified_at);
        $this->getJson("/api/public/organizations/{$tenant->slug}")->assertJsonPath('data.verified', true);
    }

    public function test_verification_list_is_for_staff(): void
    {
        $this->getJson('/api/admin/verifications')->assertStatus(401);
        $this->signIn('member');
        $this->getJson('/api/admin/verifications')->assertStatus(403);
        $this->signIn('finance');
        $this->getJson('/api/admin/verifications')->assertStatus(403);
        $this->signIn('support');
        $this->getJson('/api/admin/verifications')->assertOk();
    }

    // ---- organization people

    public function test_an_admin_adds_and_manages_the_people_of_their_organization(): void
    {
        Mail::fake();
        $admin = $this->orgAdmin();
        $other = User::factory()->role('tenant_member')->create(['tenant_id' => $this->org()->id]);

        $id = $this->postJson('/api/me/organization/members', ['email' => 'New.Person@Example.com', 'nameAr' => 'جديد', 'nameEn' => 'New', 'role' => 'tenant_member'])
            ->assertCreated()->assertJsonPath('data.email', 'new.person@example.com')->json('data.id');
        $member = User::where('cuid', $id)->firstOrFail();
        $this->assertSame($admin->tenant_id, $member->tenant_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'organization_member.created', 'actor_id' => $admin->id, 'entity_id' => $id]);

        $this->getJson('/api/me/organization/members')->assertOk()->assertJsonCount(2, 'data');

        $this->putJson("/api/me/organization/members/$id", ['role' => 'tenant_admin'])->assertOk()->assertJsonPath('data.role', 'tenant_admin');
        $this->putJson("/api/me/organization/members/$id", ['status' => 'disabled'])->assertOk()->assertJsonPath('data.status', 'disabled');

        // Another organization's person is out of reach, and nobody can use this to change an email.
        $this->putJson("/api/me/organization/members/{$other->cuid}", ['status' => 'disabled'])->assertStatus(404);
        $this->putJson("/api/me/organization/members/$id", ['email' => 'x@example.com'])->assertStatus(422);
        $this->assertSame('active', $other->fresh()->status);
    }

    public function test_an_admin_cannot_lock_themselves_out_but_can_demote_another_admin(): void
    {
        $admin = $this->orgAdmin();

        $this->putJson("/api/me/organization/members/{$admin->cuid}", ['status' => 'disabled'])->assertStatus(422)->assertJsonPath('error.code', 'cannot_change_self');
        $this->putJson("/api/me/organization/members/{$admin->cuid}", ['role' => 'tenant_member'])->assertStatus(422)->assertJsonPath('error.code', 'cannot_change_self');

        $second = User::factory()->role('tenant_admin')->create(['tenant_id' => $admin->tenant_id]);
        $this->putJson("/api/me/organization/members/{$second->cuid}", ['role' => 'tenant_member'])->assertOk()->assertJsonPath('data.role', 'tenant_member');
        $this->assertSame($second->token_version + 1, $second->fresh()->token_version);
        $this->assertSame('tenant_admin', $admin->fresh()->role);
    }

    public function test_member_checks_its_input(): void
    {
        $admin = $this->orgAdmin();
        $taken = User::factory()->role('member')->create();
        $ok = ['email' => 'a@example.com', 'nameAr' => 'أ', 'nameEn' => 'Ab', 'role' => 'tenant_member'];

        $this->postJson('/api/me/organization/members', ['email' => $taken->email, 'nameAr' => 'اسم', 'nameEn' => 'Name', 'role' => 'tenant_member'])->assertStatus(422)->assertJsonPath('error.code', 'email_taken');
        $this->postJson('/api/me/organization/members', ['email' => 'nope'] + $ok)->assertStatus(422)->assertJsonPath('error.code', 'invalid_email');
        $this->postJson('/api/me/organization/members', ['role' => 'super_admin', 'nameAr' => 'اسم'] + $ok)->assertStatus(422)->assertJsonPath('error.code', 'invalid_role');
        $this->assertSame(1, User::where('tenant_id', $admin->tenant_id)->count());
    }

    public function test_people_management_is_for_organization_admins_only(): void
    {
        $this->getJson('/api/me/organization/members')->assertStatus(401);

        $this->signIn('member');
        $this->getJson('/api/me/organization/members')->assertStatus(403);
        $this->postJson('/api/me/organization/members', [])->assertStatus(403);

        $this->signIn('tenant_member', ['tenant_id' => $this->org()->id]);
        $this->getJson('/api/me/organization/members')->assertStatus(403);
        $this->putJson('/api/me/organization', [])->assertStatus(403);
    }

    public function test_an_admin_edits_the_organization_profile(): void
    {
        $admin = $this->orgAdmin();
        $body = ['nameAr' => 'جمعية الأمل', 'nameEn' => 'Hope Association', 'bioAr' => 'نبذة', 'bioEn' => 'About', 'website' => 'https://hope.example'];

        $this->putJson('/api/me/organization', ['website' => 'not a url'] + $body)->assertStatus(422)->assertJsonPath('error.code', 'invalid_website');
        $this->putJson('/api/me/organization', $body)->assertOk()->assertJsonPath('data.nameEn', 'Hope Association');

        $this->getJson("/api/public/organizations/{$admin->tenant->slug}")->assertJsonPath('data.website', 'https://hope.example');
        $this->assertDatabaseHas('audit_logs', ['action' => 'organization.profile_updated', 'actor_id' => $admin->id]);
    }

    // ---- organization broadcasts

    public function test_an_admin_runs_a_broadcast_from_draft_to_ended(): void
    {
        $admin = $this->orgAdmin();

        $id = $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload())->assertCreated()
            ->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->assertSame($admin->tenant_id, Event::where('cuid', $id)->value('tenant_id'));

        $this->postJson("/api/me/organization/broadcasts/$id/start")->assertStatus(409)->assertJsonPath('error.code', 'invalid_event_transition');
        $this->postJson("/api/me/organization/broadcasts/$id/schedule")->assertOk()->assertJsonPath('data.status', 'scheduled');

        $this->getJson("/api/public/organizations/{$admin->tenant->slug}")->assertJsonCount(1, 'data.broadcasts')
            ->assertJsonPath('data.broadcasts.0.streamUrl', null);

        $this->postJson("/api/me/organization/broadcasts/$id/start")->assertOk()->assertJsonPath('data.status', 'live');
        $this->getJson("/api/public/organizations/{$admin->tenant->slug}")->assertJsonPath('data.broadcasts.0.streamUrl', 'https://youtube.com/live/abc');

        $this->postJson("/api/me/organization/broadcasts/$id/end", ['recordingUrl' => 'https://youtube.com/watch?v=rec'])->assertOk()->assertJsonPath('data.status', 'ended');
        $this->getJson("/api/public/organizations/{$admin->tenant->slug}")->assertJsonPath('data.broadcasts.0.recordingUrl', 'https://youtube.com/watch?v=rec')
            ->assertJsonPath('data.broadcasts.0.streamUrl', null);

        foreach (['created', 'scheduled', 'started', 'ended'] as $what) {
            $this->assertDatabaseHas('audit_logs', ['action' => "event.$what", 'actor_id' => $admin->id, 'entity_id' => $id]);
        }
    }

    public function test_a_broadcast_needs_a_stream_link_to_go_live(): void
    {
        $this->orgAdmin();
        $id = $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload(['streamUrl' => null]))->assertCreated()->json('data.id');
        $this->postJson("/api/me/organization/broadcasts/$id/schedule")->assertOk();

        $this->postJson("/api/me/organization/broadcasts/$id/start")->assertStatus(409)->assertJsonPath('error.code', 'stream_url_required');
        $this->putJson("/api/me/organization/broadcasts/$id", $this->broadcastPayload())->assertOk();
        $this->postJson("/api/me/organization/broadcasts/$id/start")->assertOk();
    }

    public function test_a_broadcast_checks_its_input_and_can_be_cancelled_or_deleted(): void
    {
        $this->orgAdmin();

        $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload(['titleAr' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_event_title');
        $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload(['visibility' => 'members']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_visibility');
        $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload(['endsAt' => now()->subDay()->toIso8601String()]))->assertStatus(422)->assertJsonPath('error.code', 'invalid_event_dates');
        $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload(['streamUrl' => 'http://insecure.example']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_stream_url');

        $draft = $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload())->json('data.id');
        $this->deleteJson("/api/me/organization/broadcasts/$draft")->assertOk();

        $id = $this->postJson('/api/me/organization/broadcasts', $this->broadcastPayload())->json('data.id');
        $this->postJson("/api/me/organization/broadcasts/$id/schedule");
        $this->deleteJson("/api/me/organization/broadcasts/$id")->assertStatus(409)->assertJsonPath('error.code', 'event_locked');
        $this->postJson("/api/me/organization/broadcasts/$id/cancel", [])->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("/api/me/organization/broadcasts/$id/cancel", ['reason' => 'Speaker unavailable'])->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    public function test_broadcasts_stay_inside_their_organization_and_admins(): void
    {
        $foreign = Event::factory()->create(['tenant_id' => $this->org()->id]);

        $this->getJson('/api/me/organization/broadcasts')->assertStatus(401);
        $this->signIn('tenant_member', ['tenant_id' => $this->org()->id]);
        $this->getJson('/api/me/organization/broadcasts')->assertStatus(403);

        $this->orgAdmin();
        $this->getJson('/api/me/organization/broadcasts')->assertOk()->assertJsonPath('meta.total', 0);
        $this->putJson("/api/me/organization/broadcasts/{$foreign->cuid}", $this->broadcastPayload())->assertStatus(404);
        $this->postJson("/api/me/organization/broadcasts/{$foreign->cuid}/schedule")->assertStatus(404);
        $this->deleteJson("/api/me/organization/broadcasts/{$foreign->cuid}")->assertStatus(404);
        $this->assertSame('draft', $foreign->fresh()->status);
    }

    public function test_members_only_broadcasts_are_hidden_from_visitors(): void
    {
        $tenant = $this->org();
        Event::factory()->status('scheduled')->create(['tenant_id' => $tenant->id, 'visibility' => 'institutional']);

        $this->getJson("/api/public/organizations/{$tenant->slug}")->assertJsonCount(0, 'data.broadcasts');

        $this->signIn('tenant_member', ['tenant_id' => $tenant->id]);
        $this->getJson("/api/public/organizations/{$tenant->slug}")->assertJsonCount(1, 'data.broadcasts')->assertJsonPath('data.isMember', true);
    }
}
