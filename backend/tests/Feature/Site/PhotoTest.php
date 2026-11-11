<?php

namespace Tests\Feature\Site;

use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// A person's profile picture and an organization's logo.
class PhotoTest extends TestCase
{
    use RefreshDatabase;

    private function upload(string $url, ?UploadedFile $file = null, ?string $origin = null)
    {
        return $this->call('POST', $url, [], [], $file ? ['file' => $file] : [], [
            'CONTENT_TYPE' => 'multipart/form-data',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_ORIGIN' => $origin ?? config('app.frontend_url'),
        ]);
    }

    public function test_the_avatar_needs_sign_in_a_member_role_and_this_site(): void
    {
        $this->upload('/api/me/profile/avatar')->assertStatus(401);

        $this->signIn('finance');
        $this->upload('/api/me/profile/avatar', UploadedFile::fake()->image('a.png'))->assertStatus(403);

        $this->signIn('member');
        $this->upload('/api/me/profile/avatar', UploadedFile::fake()->image('a.png'), 'https://evil.example')
            ->assertStatus(403)->assertJsonPath('error.code', 'bad_origin');
    }

    public function test_the_avatar_rejects_a_missing_svg_or_big_file(): void
    {
        Storage::fake('public');
        $this->signIn('member');

        $this->upload('/api/me/profile/avatar')->assertStatus(422)->assertJsonPath('error.code', 'invalid_image');
        $this->upload('/api/me/profile/avatar', UploadedFile::fake()->create('a.svg', 10, 'image/svg+xml'))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_image');
        $this->upload('/api/me/profile/avatar', UploadedFile::fake()->image('big.png')->size(3000))
            ->assertStatus(422)->assertJsonPath('error.code', 'image_too_large');
    }

    public function test_a_member_sets_replaces_and_removes_their_picture(): void
    {
        Storage::fake('public');
        $member = $this->signIn('member', ['handle' => 'photo-fan']);

        $first = $this->upload('/api/me/profile/avatar', UploadedFile::fake()->image('a.png'))->assertOk();
        $firstPath = $member->fresh()->avatar_path;
        Storage::disk('public')->assertExists($firstPath);
        $this->assertSame('/storage/'.$firstPath, $first->json('data.avatarUrl'));
        $this->getJson('/api/public/people/photo-fan')->assertJsonPath('data.avatarUrl', '/storage/'.$firstPath);

        $this->upload('/api/me/profile/avatar', UploadedFile::fake()->image('b.jpg'))->assertOk();
        Storage::disk('public')->assertMissing($firstPath);
        $this->assertDatabaseHas('audit_logs', ['action' => 'profile.avatar_changed', 'entity_id' => $member->cuid]);

        $this->deleteJson('/api/me/profile/avatar')->assertOk()->assertJsonPath('data.avatarUrl', null);
        $this->assertNull($member->fresh()->avatar_path);
        $this->assertTrue(AuditLog::where('action', 'profile.avatar_removed')->exists());
    }

    public function test_only_an_organization_admin_changes_the_logo(): void
    {
        Storage::fake('public');
        $tenant = Tenant::factory()->create(['status' => 'active']);

        $this->upload('/api/me/organization/logo', UploadedFile::fake()->image('l.png'))->assertStatus(401);

        $this->signIn('tenant_member', ['tenant_id' => $tenant->id]);
        $this->upload('/api/me/organization/logo', UploadedFile::fake()->image('l.png'))->assertStatus(403);
        $this->deleteJson('/api/me/organization/logo')->assertStatus(403);

        $this->signIn('tenant_admin', ['tenant_id' => $tenant->id]);
        $this->upload('/api/me/organization/logo')->assertStatus(422)->assertJsonPath('error.code', 'invalid_image');
        $this->upload('/api/me/organization/logo', UploadedFile::fake()->image('l.png'))->assertOk();
        $path = $tenant->fresh()->logo_path;
        Storage::disk('public')->assertExists($path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'organization.logo_changed', 'entity_id' => $tenant->cuid]);

        $this->deleteJson('/api/me/organization/logo')->assertOk()->assertJsonPath('data.logoUrl', null);
        Storage::disk('public')->assertMissing($path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'organization.logo_removed', 'entity_id' => $tenant->cuid]);
    }
}
