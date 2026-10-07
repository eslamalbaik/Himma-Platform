<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\MagazineSection;
use App\Models\Tag;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticlesTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + [
            'title' => 'التعلم بالمشاريع', 'summary' => 'ملخص', 'body' => 'نص المقال', 'language' => 'ar',
            'classification' => 'public', 'authorName' => 'سارة', 'audiences' => ['teachers', 'researchers'],
            'isSponsored' => false, 'source' => 'دراسة ميدانية',
        ];
    }

    private function checks(string $value = 'pass', array $override = []): array
    {
        return ['checks' => $override + array_fill_keys(Article::COMPLIANCE_ITEMS, $value)];
    }

    public function test_requires_sign_in_and_permission(): void
    {
        $this->getJson('/api/admin/content/articles')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/content/articles')->assertStatus(403);

        $this->signIn('support');
        $this->getJson('/api/admin/content/articles')->assertOk();
        $this->postJson('/api/admin/content/articles', $this->payload())->assertStatus(403);
    }

    public function test_creates_an_article_as_a_draft_with_tags_and_a_first_version(): void
    {
        $this->signIn('platform_editor');
        $section = MagazineSection::create(['name_ar' => 'المقالات التربوية', 'name_en' => 'Educational articles', 'axis' => 'knowledge']);
        $tag = Tag::create(['name_ar' => 'ذكاء اصطناعي', 'name_en' => 'AI']);

        $id = $this->postJson('/api/admin/content/articles', $this->payload(['sectionId' => $section->cuid, 'tagIds' => [$tag->cuid]]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.sectionId', $section->cuid)
            ->assertJsonPath('data.tags.0.id', $tag->cuid)
            ->json('data.id');

        $this->getJson("/api/admin/content/articles/$id")->assertOk()->assertJsonCount(1, 'data.versions');
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.created', 'entity_id' => $id]);
    }

    public function test_invalid_fields_return_their_codes(): void
    {
        $this->signIn();
        $url = '/api/admin/content/articles';

        $this->postJson($url, $this->payload(['title' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_article_title');
        $this->postJson($url, $this->payload(['body' => '']))->assertJsonPath('error.code', 'invalid_article_body');
        $this->postJson($url, $this->payload(['language' => 'fr']))->assertJsonPath('error.code', 'invalid_language');
        $this->postJson($url, $this->payload(['classification' => 'secret']))->assertJsonPath('error.code', 'invalid_classification');
        $this->postJson($url, $this->payload(['audiences' => ['teachers', 'robots']]))->assertJsonPath('error.code', 'invalid_audience');
        $this->postJson($url, $this->payload(['sectionId' => 'nope']))->assertJsonPath('error.code', 'invalid_section');
        $this->postJson($url, $this->payload(['authorName' => '']))->assertJsonPath('error.code', 'invalid_author');
    }

    // CLS-03: institutional and government content belongs to a named client.
    public function test_institutional_content_needs_a_client(): void
    {
        $this->signIn();
        $url = '/api/admin/content/articles';

        $this->postJson($url, $this->payload(['classification' => 'institutional']))
            ->assertStatus(422)->assertJsonPath('error.code', 'tenant_required_for_classification');

        $tenant = Tenant::factory()->create();
        $this->postJson($url, $this->payload(['classification' => 'institutional', 'tenantId' => $tenant->cuid]))
            ->assertCreated()->assertJsonPath('data.tenantId', $tenant->cuid);
    }

    public function test_full_workflow_from_draft_to_withdrawn(): void
    {
        $this->signIn('platform_editor');
        $article = Article::factory()->create();
        $base = "/api/admin/content/articles/{$article->cuid}";

        $this->postJson("$base/publish")->assertStatus(409)->assertJsonPath('error.code', 'invalid_article_transition');
        $this->postJson("$base/submit")->assertOk()->assertJsonPath('data.status', 'in_review');

        // No approval before a compliance check (CMP-03).
        $this->postJson("$base/approve")->assertStatus(409)->assertJsonPath('error.code', 'compliance_required');
        $this->postJson("$base/compliance", $this->checks())->assertOk()->assertJsonPath('data.complianceResult', 'compliant');
        $this->postJson("$base/approve")->assertOk()->assertJsonPath('data.status', 'approved');
        $this->postJson("$base/publish")->assertOk()->assertJsonPath('data.status', 'published');

        // A published article cannot be edited or deleted; it is withdrawn with a reason.
        $this->putJson($base, $this->payload())->assertStatus(409)->assertJsonPath('error.code', 'article_locked');
        $this->deleteJson($base)->assertStatus(409)->assertJsonPath('error.code', 'article_locked');
        $this->postJson("$base/withdraw", ['reason' => ''])->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("$base/withdraw", ['reason' => 'معلومة غير دقيقة'])->assertOk()->assertJsonPath('data.status', 'withdrawn');

        // Restoring sends it back to review, never straight to publication.
        $this->postJson("$base/restore")->assertOk()->assertJsonPath('data.status', 'in_review')->assertJsonPath('data.complianceResult', null);

        foreach (['submitted', 'compliance_checked', 'approved', 'published', 'withdrawn', 'restored'] as $action) {
            $this->assertDatabaseHas('audit_logs', ['action' => "article.$action", 'entity_id' => $article->cuid]);
        }
    }

    public function test_failed_compliance_blocks_approval_and_warning_sends_to_review(): void
    {
        $this->signIn();
        $draft = Article::factory()->create();
        $this->postJson("/api/admin/content/articles/{$draft->cuid}/compliance", $this->checks('pass', ['source' => 'warn']))
            ->assertOk()->assertJsonPath('data.complianceResult', 'needs_review')->assertJsonPath('data.status', 'in_review');

        $inReview = Article::factory()->status('in_review')->create();
        $this->postJson("/api/admin/content/articles/{$inReview->cuid}/compliance", $this->checks('pass', ['rights' => 'fail']))
            ->assertOk()->assertJsonPath('data.complianceResult', 'non_compliant');
        $this->postJson("/api/admin/content/articles/{$inReview->cuid}/approve")
            ->assertStatus(409)->assertJsonPath('error.code', 'compliance_failed');

        $this->postJson("/api/admin/content/articles/{$inReview->cuid}/compliance", ['checks' => ['rights' => 'pass']])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_compliance_checks');
    }

    public function test_reject_needs_a_reason_and_editing_text_saves_a_version(): void
    {
        $this->signIn();
        $article = Article::factory()->status('in_review')->compliant()->create();
        $base = "/api/admin/content/articles/{$article->cuid}";

        $this->postJson("$base/reject", [])->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("$base/reject", ['reason' => 'يحتاج مصادر'])->assertOk()
            ->assertJsonPath('data.status', 'rejected')->assertJsonPath('data.reviewNote', 'يحتاج مصادر');

        // Changing the text clears the compliance result, since it no longer describes this text.
        $this->putJson($base, $this->payload(['body' => 'نص معدّل']))->assertOk()->assertJsonPath('data.complianceResult', null);
        $this->assertDatabaseCount('article_versions', 1);
    }

    public function test_only_editors_make_editorial_decisions(): void
    {
        $article = Article::factory()->status('in_review')->compliant()->create();

        $this->signIn('support');
        $this->postJson("/api/admin/content/articles/{$article->cuid}/approve")->assertStatus(403);

        $this->signIn('auditor');
        $this->postJson("/api/admin/content/articles/{$article->cuid}/approve")->assertStatus(403);
    }

    public function test_filters_by_status_list(): void
    {
        $this->signIn();
        Article::factory()->create();
        Article::factory()->status('in_review')->create();
        Article::factory()->status('withdrawn')->create();

        $this->getJson('/api/admin/content/articles?status=in_review,withdrawn')->assertOk()->assertJsonPath('meta.total', 2);
    }
}
