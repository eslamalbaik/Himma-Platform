<?php

namespace Tests\Feature\Magazine;

use App\Models\Article;
use App\Models\Issue;
use App\Models\MagazineSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MagazineTest extends TestCase
{
    use RefreshDatabase;

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/magazine/sections')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/magazine/sections')->assertStatus(403);

        $this->signIn('auditor');
        $this->getJson('/api/admin/magazine/sections')->assertOk();
        $this->postJson('/api/admin/magazine/tags', ['nameAr' => 'أ', 'nameEn' => 'A'])->assertStatus(403);
    }

    public function test_manages_sections(): void
    {
        $this->signIn('platform_editor');

        $id = $this->postJson('/api/admin/magazine/sections', [
            'nameAr' => 'الابتكار والذكاء الاصطناعي', 'nameEn' => 'Innovation and AI', 'axis' => 'knowledge', 'sortOrder' => 6,
        ])->assertCreated()->assertJsonPath('data.axis', 'knowledge')->json('data.id');

        $this->postJson('/api/admin/magazine/sections', ['nameAr' => 'أ', 'nameEn' => 'A', 'axis' => 'space'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_axis');

        $this->putJson("/api/admin/magazine/sections/$id", [
            'nameAr' => 'الابتكار', 'nameEn' => 'Innovation', 'axis' => 'knowledge', 'isActive' => false,
        ])->assertOk()->assertJsonPath('data.isActive', false);

        Article::factory()->create(['section_id' => MagazineSection::where('cuid', $id)->value('id')]);
        $this->deleteJson("/api/admin/magazine/sections/$id")->assertStatus(409)->assertJsonPath('error.code', 'section_in_use');

        $this->assertDatabaseHas('audit_logs', ['action' => 'magazine_section.updated', 'entity_id' => $id]);
    }

    public function test_manages_tags(): void
    {
        $this->signIn();

        $id = $this->postJson('/api/admin/magazine/tags', ['nameAr' => 'تقويم', 'nameEn' => 'Assessment'])->assertCreated()->json('data.id');
        $this->postJson('/api/admin/magazine/tags', ['nameAr' => '', 'nameEn' => 'X'])->assertStatus(422)->assertJsonPath('error.code', 'invalid_tag_name');
        $this->deleteJson("/api/admin/magazine/tags/$id")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'tag.deleted', 'entity_id' => $id]);
    }

    public function test_issue_numbers_are_unique_and_publishing_needs_published_articles(): void
    {
        $this->signIn('platform_editor');
        $payload = ['number' => 1, 'titleAr' => 'العدد الأول', 'titleEn' => 'Issue 1', 'themeAr' => 'الذكاء الاصطناعي في التعليم'];

        $id = $this->postJson('/api/admin/magazine/issues', $payload)->assertCreated()->assertJsonPath('data.status', 'draft')->json('data.id');
        $this->postJson('/api/admin/magazine/issues', $payload)->assertStatus(422)->assertJsonPath('error.code', 'issue_number_taken');
        $this->putJson("/api/admin/magazine/issues/$id", $payload + ['titleEn' => 'First issue'])->assertOk();

        $this->postJson("/api/admin/magazine/issues/$id/publish")->assertStatus(409)->assertJsonPath('error.code', 'issue_empty');

        $issue = Issue::where('cuid', $id)->first();
        $article = Article::factory()->status('approved')->create(['issue_id' => $issue->id]);
        $this->postJson("/api/admin/magazine/issues/$id/publish")->assertStatus(409)->assertJsonPath('error.code', 'issue_has_unpublished_articles');

        $article->update(['status' => 'published']);
        $this->postJson("/api/admin/magazine/issues/$id/publish")->assertOk()->assertJsonPath('data.status', 'published');
        $this->deleteJson("/api/admin/magazine/issues/$id")->assertStatus(409)->assertJsonPath('error.code', 'issue_in_use');
        $this->assertDatabaseHas('audit_logs', ['action' => 'issue.published', 'entity_id' => $id]);
    }
}
