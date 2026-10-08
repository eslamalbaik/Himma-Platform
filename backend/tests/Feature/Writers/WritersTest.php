<?php

namespace Tests\Feature\Writers;

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
        return $override + ['nameAr' => 'سارة أحمد', 'nameEn' => 'Sara Ahmed', 'email' => 'Sara@School.test', 'titleAr' => 'معلمة علوم'];
    }

    private function writer(string $status = 'pending', array $attributes = []): Writer
    {
        return Writer::create($attributes + ['name_ar' => 'عمر', 'name_en' => 'Omar', 'status' => $status]);
    }

    private function article(array $override = [])
    {
        return $this->postJson('/api/admin/content/articles', $override + [
            'title' => 'مقال', 'body' => 'نص', 'language' => 'ar', 'classification' => 'public',
        ]);
    }

    public function test_requires_sign_in_and_permission(): void
    {
        $this->getJson('/api/admin/writers')->assertStatus(401);

        $this->signIn('finance');
        $this->getJson('/api/admin/writers')->assertStatus(403);

        // Support reads the registry but does not change it.
        $this->signIn('support');
        $this->getJson('/api/admin/writers')->assertOk();
        $this->postJson('/api/admin/writers', $this->payload())->assertStatus(403);
    }

    public function test_creates_and_updates_a_writer(): void
    {
        $tenant = Tenant::factory()->create();
        $this->signIn('platform_editor');

        $this->postJson('/api/admin/writers', $this->payload(['nameEn' => '']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_writer_name');
        $this->postJson('/api/admin/writers', $this->payload(['email' => 'nope']))->assertJsonPath('error.code', 'invalid_email');

        $id = $this->postJson('/api/admin/writers', $this->payload(['tenantId' => $tenant->cuid]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.email', 'sara@school.test')
            ->assertJsonPath('data.tenantId', $tenant->cuid)
            ->json('data.id');
        $this->postJson('/api/admin/writers', $this->payload())->assertStatus(422)->assertJsonPath('error.code', 'writer_email_taken');

        $this->putJson("/api/admin/writers/$id", $this->payload(['affiliation' => 'جامعة الإمارات']))
            ->assertOk()->assertJsonPath('data.affiliation', 'جامعة الإمارات');

        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.created', 'entity_id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.updated', 'entity_id' => $id]);
    }

    public function test_verifies_and_suspends(): void
    {
        $writer = $this->writer();
        $editor = $this->signIn('platform_editor');

        $this->postJson("/api/admin/writers/{$writer->cuid}/verify", ['method' => 'fax'])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_verification_method');
        $this->postJson("/api/admin/writers/{$writer->cuid}/verify", ['method' => 'other'])
            ->assertJsonPath('error.code', 'verification_note_required');

        $this->postJson("/api/admin/writers/{$writer->cuid}/verify", ['method' => 'organisation_letter', 'note' => 'خطاب المدرسة'])
            ->assertOk()
            ->assertJsonPath('data.status', 'verified')
            ->assertJsonPath('data.verificationMethod', 'organisation_letter')
            ->assertJsonPath('data.verifierNameEn', $editor->name_en);

        $this->postJson("/api/admin/writers/{$writer->cuid}/suspend", [])->assertStatus(422)->assertJsonPath('error.code', 'reason_required');
        $this->postJson("/api/admin/writers/{$writer->cuid}/suspend", ['reason' => 'انتحال'])
            ->assertOk()->assertJsonPath('data.status', 'suspended')->assertJsonPath('data.suspensionReason', 'انتحال');
        $this->postJson("/api/admin/writers/{$writer->cuid}/suspend", ['reason' => 'x'])->assertStatus(409);

        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.verified', 'entity_id' => $writer->cuid]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.suspended', 'entity_id' => $writer->cuid]);
    }

    public function test_articles_link_to_writers(): void
    {
        $writer = $this->writer('verified');
        $this->signIn('platform_editor');

        // The byline defaults to the writer's name in the article's language.
        $id = $this->article(['writerId' => $writer->cuid, 'language' => 'en'])
            ->assertCreated()
            ->assertJsonPath('data.writerId', $writer->cuid)
            ->assertJsonPath('data.authorName', 'Omar')
            ->json('data.id');
        $this->article()->assertStatus(422)->assertJsonPath('error.code', 'invalid_author');
        $this->article(['writerId' => 'nope'])->assertJsonPath('error.code', 'invalid_writer');

        $this->getJson("/api/admin/writers/{$writer->cuid}")->assertOk()
            ->assertJsonPath('data.articlesCount', 1)
            ->assertJsonPath('data.articles.0.id', $id);

        // A suspended writer keeps their articles but gets no new ones.
        $writer->update(['status' => 'suspended']);
        $this->article(['writerId' => $writer->cuid])->assertStatus(409)->assertJsonPath('error.code', 'writer_suspended');
        $this->putJson("/api/admin/content/articles/$id", ['title' => 'مقال', 'body' => 'نص', 'language' => 'en', 'classification' => 'public', 'writerId' => $writer->cuid])
            ->assertOk();

        // Writers with articles stay on record.
        $this->deleteJson("/api/admin/writers/{$writer->cuid}")->assertStatus(409)->assertJsonPath('error.code', 'writer_has_articles');
        $unused = $this->writer();
        $this->deleteJson("/api/admin/writers/{$unused->cuid}")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'writer.deleted', 'entity_id' => $unused->cuid]);
    }

    public function test_verified_writer_rule(): void
    {
        Setting::putGroup('publishing', ['verifiedWriterRequired' => true]);
        $pending = $this->writer();
        $this->signIn('platform_editor');

        $id = $this->article(['writerId' => $pending->cuid])->assertCreated()->json('data.id');
        $this->postJson("/api/admin/content/articles/$id/submit")->assertStatus(409)->assertJsonPath('error.code', 'writer_not_verified');

        $pending->update(['status' => 'verified']);
        $this->postJson("/api/admin/content/articles/$id/submit")->assertOk();
        $this->assertSame('in_review', Article::where('cuid', $id)->value('status'));
    }

    public function test_lists_with_filters_and_counts(): void
    {
        $this->writer('pending', ['name_ar' => 'ليلى', 'name_en' => 'Layla']);
        $this->writer('verified');
        $this->signIn('auditor');

        $this->getJson('/api/admin/writers?status=verified')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.statusCounts', ['pending' => 1, 'verified' => 1, 'suspended' => 0]);
        $this->getJson('/api/admin/writers?search=Layla')->assertJsonCount(1, 'data')->assertJsonPath('data.0.nameAr', 'ليلى');
    }
}
