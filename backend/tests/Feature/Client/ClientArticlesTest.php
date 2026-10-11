<?php

namespace Tests\Feature\Client;

use App\Models\Article;
use App\Models\AuditLog;
use App\Models\MagazineSection;
use App\Models\Setting;
use App\Models\Tenant;
use App\Models\User;
use App\Settings\Publishing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientArticlesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create(['status' => 'active', 'type' => 'school']);
    }

    private function client(string $role = 'institution'): User
    {
        return $this->signIn($role, ['tenant_id' => $this->tenant->id, 'name_ar' => 'مديرة المدرسة', 'name_en' => 'School Principal']);
    }

    private function payload(array $data = []): array
    {
        return $data + [
            'title' => 'يوم مفتوح في المدرسة',
            'summary' => 'ملخص',
            'body' => 'نص المقال',
            'language' => 'ar',
            'classification' => 'public',
            'audiences' => ['parents'],
            'source' => 'إدارة المدرسة',
        ];
    }

    private function article(array $attributes = []): Article
    {
        return Article::factory()->create($attributes + ['tenant_id' => $this->tenant->id]);
    }

    public function test_articles_need_a_client_user_with_the_publish_permission(): void
    {
        $this->getJson('/api/client/articles')->assertStatus(401);

        $this->signIn('editor');
        $this->getJson('/api/client/articles')->assertStatus(403);
    }

    public function test_writes_a_draft_for_the_own_organisation_and_audits_it(): void
    {
        $me = $this->client();

        $id = $this->postJson('/api/client/articles', $this->payload())->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.authorName', 'مديرة المدرسة')
            ->assertJsonPath('data.canSubmit', true)
            ->json('data.id');

        $article = Article::where('cuid', $id)->first();
        $this->assertSame($this->tenant->id, $article->tenant_id);
        $this->assertSame($me->id, $article->author_id);
        $this->assertSame(1, $article->versions()->count());
        $log = AuditLog::where('action', 'article.created')->first();
        $this->assertSame($this->tenant->id, $log->tenant_id);
    }

    public function test_input_is_checked(): void
    {
        $this->client();
        $inactive = MagazineSection::create(['name_ar' => 'قسم', 'name_en' => 'Section', 'axis' => 'knowledge', 'is_active' => false]);

        $this->postJson('/api/client/articles', $this->payload(['title' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_article_title');
        $this->postJson('/api/client/articles', $this->payload(['classification' => 'confidential']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_classification');
        $this->postJson('/api/client/articles', $this->payload(['classification' => 'government']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_classification');
        $this->postJson('/api/client/articles', $this->payload(['sectionId' => $inactive->cuid]))->assertStatus(422)->assertJsonPath('error.code', 'invalid_section');
        $this->postJson('/api/client/articles', $this->payload(['classification' => 'institutional']))->assertCreated();
    }

    public function test_restricted_publish_sees_only_own_articles(): void
    {
        $me = $this->client('member');
        $mine = $this->article(['author_id' => $me->id]);
        $this->article(['author_id' => User::factory()->create(['tenant_id' => $this->tenant->id])->id]);
        $this->article(['tenant_id' => Tenant::factory()->create()->id]);

        $this->getJson('/api/client/articles')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mine->cuid);
    }

    public function test_allowed_publish_sees_every_article_of_the_organisation_only(): void
    {
        $this->client();
        $this->article();
        $this->article(['status' => 'published']);
        $other = $this->article(['tenant_id' => Tenant::factory()->create()->id]);

        $this->getJson('/api/client/articles')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/client/articles/{$other->cuid}")->assertStatus(404)->assertJsonPath('error.code', 'article_not_found');
    }

    public function test_editing_keeps_versions_and_stops_once_in_review(): void
    {
        $me = $this->client();
        $article = $this->article(['author_id' => $me->id]);

        $this->putJson("/api/client/articles/{$article->cuid}", $this->payload(['body' => 'نص جديد']))->assertOk();
        $this->assertSame(1, $article->versions()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.updated', 'entity_id' => $article->cuid]);

        $article->update(['status' => 'in_review']);
        $this->putJson("/api/client/articles/{$article->cuid}", $this->payload())->assertStatus(409)->assertJsonPath('error.code', 'article_locked');
        $this->deleteJson("/api/client/articles/{$article->cuid}")->assertStatus(409);
    }

    public function test_submits_for_editorial_review(): void
    {
        $me = $this->client();
        $article = $this->article(['author_id' => $me->id]);

        $this->postJson("/api/client/articles/{$article->cuid}/submit")->assertOk()->assertJsonPath('data.status', 'in_review');
        $this->postJson("/api/client/articles/{$article->cuid}/submit")->assertStatus(409)->assertJsonPath('error.code', 'invalid_article_transition');
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.submitted', 'entity_id' => $article->cuid]);
    }

    public function test_submission_follows_the_publishing_rules_except_the_writer_rule(): void
    {
        Setting::putGroup('publishing', ['requireRightsNote' => true, 'requireVerifiedWriter' => true] + Publishing::DEFAULTS);
        $me = $this->client();
        $article = $this->article(['author_id' => $me->id, 'rights_note' => null]);

        $this->postJson("/api/client/articles/{$article->cuid}/submit")->assertStatus(409)->assertJsonPath('error.code', 'rights_note_required');

        $article->update(['rights_note' => 'حقوق المدرسة']);
        $this->postJson("/api/client/articles/{$article->cuid}/submit")->assertOk();
    }

    public function test_restricted_submit_reaches_only_own_articles(): void
    {
        $this->client('member');
        $colleagues = $this->article(['author_id' => User::factory()->create(['tenant_id' => $this->tenant->id])->id]);

        $this->postJson("/api/client/articles/{$colleagues->cuid}/submit")->assertStatus(404);
    }

    public function test_deletes_a_draft(): void
    {
        $me = $this->client();
        $article = $this->article(['author_id' => $me->id]);

        $this->deleteJson("/api/client/articles/{$article->cuid}")->assertOk();
        $this->assertModelMissing($article);
        $this->assertDatabaseHas('audit_logs', ['action' => 'article.deleted', 'entity_id' => $article->cuid]);
    }

    public function test_suspended_organisation_cannot_write(): void
    {
        $this->tenant->update(['status' => 'suspended']);
        $this->client();

        $this->getJson('/api/client/articles')->assertOk();
        $this->postJson('/api/client/articles', $this->payload())->assertStatus(403)->assertJsonPath('error.code', 'tenant_suspended');
    }
}
