<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorrectionsAndVersionsTest extends TestCase
{
    use RefreshDatabase;

    private function published(): Article
    {
        $article = Article::factory()->status('published')->create(['published_at' => now(), 'title' => 'العنوان', 'body' => 'نص أول']);
        $article->saveVersion(null);

        return $article;
    }

    public function test_corrections_need_permission_and_a_published_article(): void
    {
        $article = $this->published();
        $url = "/api/admin/content/articles/{$article->cuid}/corrections";

        $this->postJson($url, ['kind' => 'correction', 'note' => 'x'])->assertStatus(401);

        // Support reads content but does not take editorial decisions.
        $this->signIn('support');
        $this->postJson($url, ['kind' => 'correction', 'note' => 'x'])->assertStatus(403);

        $this->signIn('platform_editor');
        $this->postJson($url, ['kind' => 'oops', 'note' => 'x'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_correction_kind');
        $this->postJson($url, ['kind' => 'correction', 'note' => ''])->assertJsonPath('error.code', 'correction_note_required');

        $draft = Article::factory()->create();
        $this->postJson("/api/admin/content/articles/{$draft->cuid}/corrections", ['kind' => 'correction', 'note' => 'x'])
            ->assertStatus(409)->assertJsonPath('error.code', 'article_not_published');
    }

    public function test_a_correction_changes_the_text_and_stays_visible(): void
    {
        $editor = $this->signIn('platform_editor');
        $article = $this->published();
        $url = "/api/admin/content/articles/{$article->cuid}/corrections";

        // A clarification without a text change: no new version.
        $this->postJson($url, ['kind' => 'clarification', 'note' => 'المقصود بالنسبة طلاب المرحلة الثانوية فقط.'])->assertOk()
            ->assertJsonPath('data.corrections.0.kind', 'clarification')
            ->assertJsonPath('data.corrections.0.version', null);

        $this->postJson($url, ['kind' => 'correction', 'note' => 'صُحّح الرقم من 40٪ إلى 34٪.', 'body' => 'نص مصحح'])->assertOk()
            ->assertJsonPath('data.body', 'نص مصحح')
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.corrections.1.version', 2)
            ->assertJsonPath('data.corrections.1.correctorNameEn', $editor->name_en)
            ->assertJsonCount(2, 'data.versions');

        $this->assertSame(2, AuditLog::where('action', 'article.corrected')->where('entity_id', $article->cuid)->count());
    }

    public function test_restoring_an_earlier_version(): void
    {
        $this->signIn('platform_editor');
        $article = Article::factory()->status('in_review')->create(['title' => 'أ', 'body' => 'نص ١', 'compliance_result' => 'compliant']);
        $article->saveVersion(null);
        $article->update(['title' => 'ب', 'body' => 'نص ٢']);
        $article->saveVersion(null);

        $this->postJson("/api/admin/content/articles/{$article->cuid}/versions/9/restore")->assertStatus(404)->assertJsonPath('error.code', 'version_not_found');

        // The old text comes back as a new version, and needs a fresh compliance check.
        $this->postJson("/api/admin/content/articles/{$article->cuid}/versions/1/restore")->assertOk()
            ->assertJsonPath('data.title', 'أ')->assertJsonPath('data.body', 'نص ١')
            ->assertJsonPath('data.complianceResult', null)
            ->assertJsonCount(3, 'data.versions');
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.version_restored', 'entity_id' => $article->cuid]);

        // A published article is changed through a correction instead.
        $published = $this->published();
        $this->postJson("/api/admin/content/articles/{$published->cuid}/versions/1/restore")
            ->assertStatus(409)->assertJsonPath('error.code', 'article_locked');

        $this->signIn('support');
        $this->postJson("/api/admin/content/articles/{$article->cuid}/versions/1/restore")->assertStatus(403);
    }

    public function test_opening_confidential_content_is_audited(): void
    {
        $user = $this->signIn('auditor');
        $public = Article::factory()->create();
        $secret = Article::factory()->create(['classification' => 'confidential']);

        $this->getJson("/api/admin/content/articles/{$public->cuid}")->assertOk();
        $this->getJson("/api/admin/content/articles/{$secret->cuid}")->assertOk();
        $this->getJson("/api/admin/content/articles/{$secret->cuid}")->assertOk();

        $this->assertSame(0, AuditLog::where('action', 'article.confidential_viewed')->where('entity_id', $public->cuid)->count());
        $this->assertSame(2, AuditLog::where('action', 'article.confidential_viewed')->where('entity_id', $secret->cuid)->where('actor_id', $user->id)->count());
    }
}
