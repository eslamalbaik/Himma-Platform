<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\LibraryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// The library (under Articles) and the magazine's stories (articles of kind `story`).
class LibraryTest extends TestCase
{
    use RefreshDatabase;

    private array $book = ['type' => 'book', 'title' => 'فن الكتابة', 'authorName' => 'كاتب', 'isbn' => '978-0-306-40615-7', 'year' => 2024];

    private function upload(string $url, UploadedFile $file)
    {
        return $this->call('POST', $url, [], [], ['file' => $file], [
            'CONTENT_TYPE' => 'multipart/form-data',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_ORIGIN' => config('app.frontend_url'),
        ]);
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/content/library')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/content/library')->assertStatus(403);

        $this->signIn('auditor');
        $this->getJson('/api/admin/content/library')->assertOk();
        $this->postJson('/api/admin/content/library', $this->book)->assertStatus(403);
    }

    public function test_manages_uploads_and_publishes_an_item(): void
    {
        Storage::fake('public');
        $this->signIn();

        $this->postJson('/api/admin/content/library', ['type' => 'film'] + $this->book)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_library_type');
        $this->postJson('/api/admin/content/library', ['isbn' => 'abc'] + $this->book)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_isbn');

        $id = $this->postJson('/api/admin/content/library', $this->book)
            ->assertCreated()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.isbn', '9780306406157')
            ->assertJsonPath('data.community', 'ar')->json('data.id');

        $this->postJson("/api/admin/content/library/$id/publish")->assertStatus(409)->assertJsonPath('error.code', 'library_needs_file');

        $this->upload("/api/admin/content/library/$id/file", UploadedFile::fake()->create('book.exe', 10))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_library_file');
        $this->upload("/api/admin/content/library/$id/cover", UploadedFile::fake()->image('c.png'))
            ->assertOk()->assertJsonPath('data.coverUrl', fn ($url) => str_starts_with($url, '/storage/library/covers/'));
        $this->upload("/api/admin/content/library/$id/file", UploadedFile::fake()->create('book.pdf', 100, 'application/pdf'))
            ->assertOk()->assertJsonPath('data.fileName', 'book.pdf');

        $this->getJson("/api/public/library/$id")->assertStatus(404);
        $this->postJson("/api/admin/content/library/$id/publish")->assertOk()->assertJsonPath('data.status', 'published');

        $this->getJson('/api/public/library')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->getJson('/api/public/library', ['X-Community' => 'en'])->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/public/library/$id")->assertOk()->assertJsonPath('data.views', 1)->assertJsonMissingPath('data.status');

        $this->putJson("/api/admin/content/library/$id", ['title' => 'فن الكتابة الجديد'] + $this->book)->assertOk();
        $this->postJson("/api/admin/content/library/$id/unpublish")->assertOk()->assertJsonPath('data.status', 'draft');
        $this->deleteJson("/api/admin/content/library/$id")->assertOk();

        $this->assertSame(0, LibraryItem::count());
        foreach (['created', 'cover_uploaded', 'file_uploaded', 'published', 'updated', 'unpublished', 'deleted'] as $what) {
            $this->assertDatabaseHas('audit_logs', ['action' => "library.$what", 'entity_id' => $id]);
        }
    }

    public function test_an_item_of_the_other_community_is_hidden_from_limited_staff(): void
    {
        $item = LibraryItem::create(['community' => 'en', 'type' => 'guide', 'title' => 'Guide', 'author_name' => 'A']);

        $this->signIn('platform_editor', ['community' => 'ar']);
        $this->getJson("/api/admin/content/library/{$item->cuid}")->assertStatus(404);
    }

    public function test_stories_are_articles_of_kind_story(): void
    {
        $this->signIn();

        $this->postJson('/api/admin/content/articles', [
            'title' => 'قصة', 'body' => 'نص', 'classification' => 'public', 'authorName' => 'كاتب', 'kind' => 'poem',
        ])->assertStatus(422)->assertJsonPath('error.code', 'invalid_article_kind');

        $id = $this->postJson('/api/admin/content/articles', [
            'title' => 'قصة', 'body' => 'نص', 'classification' => 'public', 'authorName' => 'كاتب', 'kind' => 'story',
        ])->assertCreated()->assertJsonPath('data.kind', 'story')->json('data.id');

        Article::where('cuid', $id)->update(['status' => 'published', 'published_at' => now()]);
        Article::factory()->status('published')->create(['published_at' => now()]);

        $this->getJson('/api/public/articles?kind=story')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'story');
        $this->getJson('/api/public/articles')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/admin/content/articles?kind=article')->assertOk()->assertJsonCount(1, 'data');
    }
}
