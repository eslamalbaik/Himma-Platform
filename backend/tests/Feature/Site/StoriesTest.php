<?php

namespace Tests\Feature\Site;

use App\Models\Article;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// A member writing their own stories and sending them to the editors.
class StoriesTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + ['title' => 'قصتي مع التعليم', 'summary' => 'ملخص', 'body' => 'فقرة أولى', 'language' => 'ar'];
    }

    public function test_requires_sign_in_and_a_member_role(): void
    {
        $this->getJson('/api/me/stories')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/me/stories')->assertStatus(403)->assertJsonPath('error.code', 'forbidden');
    }

    public function test_writes_a_draft_then_submits_it_for_review(): void
    {
        $member = $this->signIn('member');

        $id = $this->postJson('/api/me/stories', $this->payload())->assertCreated()
            ->assertJsonPath('data.status', 'draft')->json('data.id');

        $article = Article::where('cuid', $id)->firstOrFail();
        $this->assertSame($member->id, $article->author_id);
        $this->assertSame('public', $article->classification);
        $this->assertSame($member->name_ar, $article->author_name);

        $this->putJson("/api/me/stories/$id", $this->payload(['body' => 'نص معدل']))->assertOk()->assertJsonPath('data.body', 'نص معدل');
        $this->assertSame(2, $article->versions()->count());

        $this->postJson("/api/me/stories/$id/submit")->assertOk()->assertJsonPath('data.status', 'in_review');
        $this->postJson("/api/me/stories/$id/submit")->assertStatus(409)->assertJsonPath('error.code', 'invalid_article_transition');
        $this->deleteJson("/api/me/stories/$id")->assertStatus(409)->assertJsonPath('error.code', 'article_locked');

        $this->getJson('/api/me/stories')->assertOk()->assertJsonPath('meta.total', 1);
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.created', 'actor_id' => $member->id, 'entity_id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.submitted', 'actor_id' => $member->id, 'entity_id' => $id]);
    }

    public function test_cannot_publish_or_choose_who_reads_it(): void
    {
        $this->signIn('member');

        $id = $this->postJson('/api/me/stories', $this->payload(['classification' => 'confidential', 'status' => 'published']))
            ->assertCreated()->json('data.id');

        $article = Article::where('cuid', $id)->firstOrFail();
        $this->assertSame('draft', $article->status);
        $this->assertSame('public', $article->classification);
        $this->postJson("/api/admin/content/articles/$id/publish")->assertStatus(403);
    }

    public function test_checks_its_input(): void
    {
        $this->signIn('member');

        $this->postJson('/api/me/stories', $this->payload(['title' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_article_title');
        $this->postJson('/api/me/stories', $this->payload(['body' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_article_body');
        $this->postJson('/api/me/stories', $this->payload(['language' => 'fr']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_language');
        $this->postJson('/api/me/stories', $this->payload(['sectionId' => 'nope']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_section');
    }

    public function test_someone_elses_story_is_not_found(): void
    {
        $other = Article::factory()->create();

        $this->signIn('member');
        $this->getJson("/api/me/stories/{$other->cuid}")->assertStatus(404);
        $this->putJson("/api/me/stories/{$other->cuid}", $this->payload())->assertStatus(404);
        $this->postJson("/api/me/stories/{$other->cuid}/submit")->assertStatus(404);
        $this->deleteJson("/api/me/stories/{$other->cuid}")->assertStatus(404);
    }

    public function test_deletes_a_draft(): void
    {
        $member = $this->signIn('member');
        $article = Article::factory()->create(['author_id' => $member->id]);

        $this->deleteJson("/api/me/stories/{$article->cuid}")->assertOk()->assertExactJson(['ok' => true]);
        $this->assertModelMissing($article);
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.deleted', 'entity_id' => $article->cuid]);
    }
}
