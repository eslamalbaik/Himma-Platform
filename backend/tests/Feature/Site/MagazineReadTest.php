<?php

namespace Tests\Feature\Site;

use App\Models\Article;
use App\Models\Issue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The public magazine: published issues and one issue's public articles (the flipbook's data).
class MagazineReadTest extends TestCase
{
    use RefreshDatabase;

    private function issue(int $number, string $status = 'published', array $extra = []): Issue
    {
        return Issue::create($extra + [
            'number' => $number,
            'title_ar' => "العدد $number",
            'title_en' => "Issue $number",
            'status' => $status,
            'published_at' => $status === 'published' ? now() : null,
        ]);
    }

    public function test_the_list_shows_only_published_issues_newest_first_with_their_public_article_count(): void
    {
        $one = $this->issue(1, 'published', ['cover_path' => 'covers/issue-1.jpg']);
        $this->issue(2);
        $this->issue(3, 'draft');
        Article::factory()->status('published')->create(['issue_id' => $one->id, 'classification' => 'public', 'published_at' => now()]);
        Article::factory()->status('published')->create(['issue_id' => $one->id, 'classification' => 'followers', 'published_at' => now()]);
        Article::factory()->create(['issue_id' => $one->id]);

        $this->getJson('/api/public/issues')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.number', 2)
            ->assertJsonPath('data.1.number', 1)
            ->assertJsonPath('data.1.articlesCount', 1)
            ->assertJsonPath('data.1.coverUrl', '/storage/covers/issue-1.jpg')
            ->assertJsonMissingPath('data.0.id');
    }

    public function test_an_issue_comes_with_its_public_articles_and_a_plain_text_excerpt(): void
    {
        $issue = $this->issue(4);
        Article::factory()->status('published')->create([
            'issue_id' => $issue->id,
            'classification' => 'public',
            'title' => 'مقال في العدد',
            'cover_path' => 'covers/a.jpg',
            'body' => "فقرة **أولى** مع [رابط](https://example.com).\n\n## عنوان فرعي\n\n> اقتباس\n\nفقرة ثانية.",
            'published_at' => now(),
        ]);
        Article::factory()->status('published')->create(['issue_id' => $issue->id, 'classification' => 'institutional', 'published_at' => now()]);
        Article::factory()->status('draft')->create(['issue_id' => $issue->id]);

        $response = $this->getJson('/api/public/issues/4')->assertOk()
            ->assertJsonPath('data.number', 4)
            ->assertJsonCount(1, 'data.articles')
            ->assertJsonPath('data.articles.0.title', 'مقال في العدد')
            ->assertJsonPath('data.articles.0.coverUrl', '/storage/covers/a.jpg')
            ->assertJsonPath('data.articles.0.issueNumber', 4);

        $excerpt = $response->json('data.articles.0.excerpt');
        $this->assertSame("فقرة أولى مع رابط.\n\nفقرة ثانية.", $excerpt);
    }

    public function test_a_draft_or_unknown_issue_is_not_found(): void
    {
        $this->issue(5, 'draft');

        $this->getJson('/api/public/issues/5')->assertStatus(404)->assertJsonPath('error.code', 'not_found');
        $this->getJson('/api/public/issues/99')->assertStatus(404);
        $this->getJson('/api/public/issues/abc')->assertStatus(404);
    }
}
