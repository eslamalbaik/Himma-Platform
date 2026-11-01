<?php

namespace Tests\Feature\Site;

use App\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Pictures a member adds inside a story.
class StoryImageTest extends TestCase
{
    use RefreshDatabase;

    // A browser upload: multipart, from this site.
    private function upload(?UploadedFile $file = null, ?string $origin = null)
    {
        return $this->call('POST', '/api/me/media', [], [], $file ? ['file' => $file] : [], [
            'CONTENT_TYPE' => 'multipart/form-data',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_ORIGIN' => $origin ?? config('app.frontend_url'),
        ]);
    }

    public function test_requires_sign_in_and_a_member_role(): void
    {
        $this->upload()->assertStatus(401);

        $this->signIn('finance');
        $this->upload(UploadedFile::fake()->image('a.png'))->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
    }

    public function test_refuses_another_origin_and_a_json_body(): void
    {
        $this->signIn('member');

        $this->upload(UploadedFile::fake()->image('a.png'), 'https://evil.example')
            ->assertStatus(403)->assertJsonPath('error.code', 'bad_origin');
        $this->postJson('/api/me/media', ['file' => 'x'])->assertStatus(403)->assertJsonPath('error.code', 'bad_origin');
    }

    public function test_rejects_a_missing_or_non_image_file_and_a_big_one(): void
    {
        Storage::fake('public');
        $this->signIn('member');

        $this->upload()->assertStatus(422)->assertJsonPath('error.code', 'invalid_image');
        $this->upload(UploadedFile::fake()->create('a.pdf', 10, 'application/pdf'))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_image');
        $this->upload(UploadedFile::fake()->create('a.svg', 10, 'image/svg+xml'))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_image');
        $this->upload(UploadedFile::fake()->image('big.png')->size(6000))
            ->assertStatus(422)->assertJsonPath('error.code', 'image_too_large');
    }

    public function test_stores_a_picture_and_audits_it(): void
    {
        Storage::fake('public');
        $member = $this->signIn('member');

        $res = $this->upload(UploadedFile::fake()->image('photo.jpg', 800, 600))->assertCreated();

        $media = Media::where('cuid', $res->json('data.id'))->firstOrFail();
        $this->assertSame($member->id, $media->uploaded_by);
        $this->assertStringContainsString('/storage/stories/', $res->json('data.url'));
        Storage::disk('public')->assertExists($media->path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'media.uploaded', 'actor_id' => $member->id, 'entity_id' => $media->cuid]);
    }
}
