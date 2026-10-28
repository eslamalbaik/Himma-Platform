<?php

namespace Tests\Feature\Site;

use App\Models\Article;
use App\Models\MagazineSection;
use App\Models\TenantRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Reading published articles and asking to join, without signing in.
class PublicSiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_only_published_public_articles(): void
    {
        $section = MagazineSection::create(['name_ar' => 'مقالات', 'name_en' => 'Articles', 'axis' => 'knowledge']);
        $visible = Article::factory()->status('published')->create(['published_at' => now(), 'section_id' => $section->id]);
        Article::factory()->status('in_review')->create();
        Article::factory()->status('published')->create(['classification' => 'members', 'published_at' => now()]);

        $this->getJson('/api/public/articles')->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $visible->cuid)
            ->assertJsonPath('data.0.sectionNameEn', 'Articles')
            ->assertJsonMissingPath('data.0.complianceChecks')
            ->assertJsonMissingPath('data.0.body');

        MagazineSection::create(['name_ar' => 'قديم', 'name_en' => 'Old', 'axis' => 'data', 'is_active' => false]);
        $this->getJson('/api/public/sections')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.articlesCount', 1);
    }

    public function test_reads_one_published_article_and_hides_the_rest(): void
    {
        $published = Article::factory()->status('published')->create(['published_at' => now(), 'body' => 'نص كامل']);
        $draft = Article::factory()->create();

        $this->getJson("/api/public/articles/{$published->cuid}")->assertOk()->assertJsonPath('data.body', 'نص كامل');
        $this->getJson("/api/public/articles/{$draft->cuid}")->assertStatus(404)->assertJsonPath('error.code', 'not_found');
    }

    public function test_an_organization_asks_to_join(): void
    {
        $payload = [
            'nameAr' => 'مدرسة النور', 'nameEn' => 'Al Noor School', 'type' => 'school',
            'contactName' => 'أحمد', 'contactEmail' => 'ahmed@example.com', 'message' => 'نرغب بالانضمام',
        ];

        $this->postJson('/api/public/join-requests', ['contactEmail' => 'bad'] + $payload)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_contact_email');

        $id = $this->postJson('/api/public/join-requests', $payload)->assertCreated()->json('data.id');

        $this->assertSame('pending', TenantRequest::where('cuid', $id)->value('status'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'tenant_request.created', 'entity_id' => $id, 'actor_id' => null]);
    }
}
