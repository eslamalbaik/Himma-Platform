<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\Setting;
use App\Models\Tenant;
use App\Models\Writer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WritersTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return $override + ['nameAr' => 'سارة أحمد', 'nameEn' => 'Sara Ahmed', 'email' => 'Sara@School.test', 'affiliation' => 'مدرسة النور'];
    }

    private function article(array $override = []): array
    {
        return $override + [
            'title' => 'التعلم بالمشاريع', 'body' => 'نص المقال', 'language' => 'ar',
            'classification' => 'public', 'authorName' => 'سارة', 'source' => 'دراسة ميدانية',
        ];
    }

    public function test_permissions(): void
    {
        $this->getJson('/api/admin/writers')->assertStatus(401);

        $this->signIn('broadcast_moderator');
        $this->getJson('/api/admin/writers')->assertStatus(403);

        // Support reads users but does not edit editorial records.
        $this->signIn('support');
        $this->getJson('/api/admin/writers')->assertOk();
        $this->postJson('/api/admin/writers', $this->payload())->assertStatus(403);

        $this->signIn('sales_manager');
        $writer = Writer::factory()->create();
        $this->postJson("/api/admin/writers/{$writer->cuid}/verify", ['reason' => 'هوية'])->assertStatus(403);
    }

    public function test_register_and_edit(): void
    {
        $editor = $this->signIn('platform_editor');
        $tenant = Tenant::factory()->create();

        $this->postJson('/api/admin/writers', $this->payload(['nameEn' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_writer_name');
        $this->postJson('/api/admin/writers', $this->payload(['email' => 'nope']))->assertJsonPath('error.code', 'invalid_email');
        $this->postJson('/api/admin/writers', $this->payload(['tenantId' => 'missing']))->assertJsonPath('error.code', 'invalid_tenant');

        $id = $this->postJson('/api/admin/writers', $this->payload(['tenantId' => $tenant->cuid]))->assertCreated()
            ->assertJsonPath('data.status', 'pending')->assertJsonPath('data.email', 'sara@school.test')
            ->assertJsonPath('data.tenantId', $tenant->cuid)->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.created', 'actor_id' => $editor->id, 'entity_id' => $id]);

        $this->postJson('/api/admin/writers', $this->payload())->assertStatus(422)->assertJsonPath('error.code', 'email_taken');

        // Its own email is not "taken" when editing.
        $this->putJson("/api/admin/writers/$id", $this->payload(['phone' => '+971500000000']))->assertOk()
            ->assertJsonPath('data.phone', '+971500000000')->assertJsonPath('data.tenantId', null);
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.updated', 'entity_id' => $id]);
    }

    public function test_verify_suspend_and_list(): void
    {
        $editor = $this->signIn('platform_editor');
        $writer = Writer::factory()->create();
        $url = "/api/admin/writers/{$writer->cuid}";

        $this->postJson("$url/verify", [])->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("$url/verify", ['reason' => 'تحقق من الهوية وخطاب المدرسة'])->assertOk()
            ->assertJsonPath('data.status', 'verified')->assertJsonPath('data.verifierNameEn', $editor->name_en)
            ->assertJsonPath('data.verificationNote', 'تحقق من الهوية وخطاب المدرسة');
        $this->postJson("$url/verify", ['reason' => 'مرة أخرى'])->assertStatus(409)->assertJsonPath('error.code', 'writer_already_verified');
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.verified', 'entity_id' => $writer->cuid]);

        $this->postJson("$url/suspend", ['reason' => 'انتحال'])->assertOk()->assertJsonPath('data.status', 'suspended');
        $this->postJson("$url/suspend", ['reason' => 'انتحال'])->assertStatus(409)->assertJsonPath('error.code', 'writer_already_suspended');
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.suspended', 'entity_id' => $writer->cuid]);

        // A suspended writer cannot be named on an article.
        $this->postJson('/api/admin/content/articles', $this->article(['writerId' => $writer->cuid]))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_writer');

        Writer::factory()->count(2)->create();
        $this->getJson('/api/admin/writers?status=pending')->assertOk()
            ->assertJsonPath('meta.total', 2)->assertJsonPath('meta.byStatus.suspended', 1)->assertJsonPath('meta.byStatus.pending', 2);
        $this->getJson('/api/admin/writers?search=Writer')->assertJsonPath('meta.total', 3);
        $this->getJson('/api/admin/writers?search=Writer&status=suspended')->assertJsonPath('meta.total', 1);
    }

    public function test_articles_name_their_writer_and_the_rule_can_require_a_verified_one(): void
    {
        $this->signIn();
        $pending = Writer::factory()->create();
        $verified = Writer::factory()->verified()->create(['name_en' => 'Verified Writer']);

        $articleId = $this->postJson('/api/admin/content/articles', $this->article(['writerId' => $pending->cuid]))->assertCreated()
            ->assertJsonPath('data.writerId', $pending->cuid)->assertJsonPath('data.writerStatus', 'pending')->json('data.id');

        Setting::putGroup('publishing', ['requireVerifiedWriter' => true]);
        $this->postJson("/api/admin/content/articles/$articleId/submit")->assertStatus(409)->assertJsonPath('error.code', 'verified_writer_required');

        $this->putJson("/api/admin/content/articles/$articleId", $this->article(['writerId' => $verified->cuid]))->assertOk()
            ->assertJsonPath('data.writerNameEn', 'Verified Writer');
        $this->postJson("/api/admin/content/articles/$articleId/submit")->assertOk()->assertJsonPath('data.status', 'in_review');

        // A writer with articles stays on record; one without can be deleted.
        $this->deleteJson("/api/admin/writers/{$verified->cuid}")->assertStatus(409)->assertJsonPath('error.code', 'writer_has_articles');
        $this->deleteJson("/api/admin/writers/{$pending->cuid}")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.deleted', 'entity_id' => $pending->cuid]);

        $this->getJson("/api/admin/writers/{$verified->cuid}")->assertOk()
            ->assertJsonPath('data.articlesCount', 1)->assertJsonPath('data.recentArticles.0.id', $articleId);
        $this->assertSame(1, Article::where('writer_id', $verified->id)->count());
    }
}
