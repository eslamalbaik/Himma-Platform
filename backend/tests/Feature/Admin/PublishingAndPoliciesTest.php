<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Policy;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublishingAndPoliciesTest extends TestCase
{
    use RefreshDatabase;

    private function rules(array $override = []): array
    {
        return $override + [
            'requiredOnSubmit' => [], 'separateApprover' => false, 'sponsoredChecks' => false,
            'defaultClassification' => 'public', 'defaultLanguage' => 'ar',
        ];
    }

    private function article(array $override = []): string
    {
        return $this->postJson('/api/admin/content/articles', $override + [
            'title' => 'مقال', 'body' => 'نص', 'language' => 'ar', 'classification' => 'public', 'authorName' => 'سارة',
        ])->assertCreated()->json('data.id');
    }

    private function passChecks(string $id, array $override = []): void
    {
        $this->postJson("/api/admin/content/articles/$id/compliance", [
            'checks' => $override + array_fill_keys(Article::COMPLIANCE_ITEMS, 'pass'),
        ])->assertOk();
    }

    // ---- Publishing settings

    public function test_publishing_settings_permissions(): void
    {
        $this->getJson('/api/admin/settings/publishing')->assertStatus(401);

        // Editors read the rules (the article form shows them) but cannot change them.
        $this->signIn('platform_editor');
        $this->getJson('/api/admin/settings/publishing')->assertOk()->assertJsonPath('data.separateApprover', false);
        $this->putJson('/api/admin/settings/publishing', $this->rules())->assertStatus(403);

        $this->signIn('finance');
        $this->getJson('/api/admin/settings/publishing')->assertStatus(403);
    }

    public function test_updates_publishing_settings(): void
    {
        $this->signIn();

        $this->putJson('/api/admin/settings/publishing', $this->rules(['requiredOnSubmit' => ['title']]))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_required_fields');
        $this->putJson('/api/admin/settings/publishing', $this->rules(['defaultClassification' => 'secret']))
            ->assertJsonPath('error.code', 'invalid_classification');

        $this->putJson('/api/admin/settings/publishing', $this->rules(['requiredOnSubmit' => ['source', 'summary'], 'separateApprover' => true]))
            ->assertOk()
            ->assertJsonPath('data.requiredOnSubmit', ['summary', 'source'])
            ->assertJsonPath('data.separateApprover', true);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.publishing_updated']);
    }

    public function test_required_fields_block_submission(): void
    {
        Setting::putGroup('publishing', ['requiredOnSubmit' => ['source', 'rightsNote']]);
        $this->signIn('platform_editor');
        $id = $this->article();

        $this->postJson("/api/admin/content/articles/$id/submit")->assertStatus(409)->assertJsonPath('error.code', 'article_missing_source');

        $this->putJson("/api/admin/content/articles/$id", [
            'title' => 'مقال', 'body' => 'نص', 'language' => 'ar', 'classification' => 'public', 'authorName' => 'سارة',
            'source' => 'دراسة', 'rightsNote' => 'بإذن الكاتب',
        ])->assertOk();
        $this->postJson("/api/admin/content/articles/$id/submit")->assertOk()->assertJsonPath('data.status', 'in_review');
    }

    public function test_four_eyes_rule(): void
    {
        Setting::putGroup('publishing', ['separateApprover' => true]);
        $this->signIn('platform_editor');
        $id = $this->article();
        $this->passChecks($id);
        $this->postJson("/api/admin/content/articles/$id/submit")->assertOk();

        $this->postJson("/api/admin/content/articles/$id/approve")->assertStatus(409)->assertJsonPath('error.code', 'approver_is_last_editor');

        $this->signIn('platform_editor');
        $this->postJson("/api/admin/content/articles/$id/approve")->assertOk()->assertJsonPath('data.status', 'approved');
    }

    public function test_sponsored_content_needs_advertising_and_approvals_checks(): void
    {
        Setting::putGroup('publishing', ['sponsoredChecks' => true]);
        $this->signIn('platform_editor');
        $id = $this->article(['isSponsored' => true]);
        $this->passChecks($id, ['approvals' => 'warn']);

        $this->postJson("/api/admin/content/articles/$id/approve")->assertStatus(409)->assertJsonPath('error.code', 'sponsored_checks_required');

        $this->passChecks($id);
        $this->postJson("/api/admin/content/articles/$id/approve")->assertOk();
    }

    // ---- Policies

    public function test_policies_permissions(): void
    {
        $this->getJson('/api/admin/policies')->assertStatus(401);

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/policies')->assertStatus(403);
        $this->putJson('/api/admin/policies/privacy', ['bodyAr' => 'نص', 'bodyEn' => 'Text', 'isPublished' => true])->assertStatus(403);
    }

    public function test_lists_every_policy_kind(): void
    {
        $this->signIn();

        $this->getJson('/api/admin/policies')->assertOk()
            ->assertJsonCount(count(Policy::KINDS), 'data')
            ->assertJsonPath('data.0.kind', 'publishing')
            ->assertJsonPath('data.0.version', 0);
        $this->putJson('/api/admin/policies/unknown', ['isPublished' => false])->assertStatus(404);
    }

    public function test_saves_versions_and_publishes(): void
    {
        $this->signIn();

        // A draft may be incomplete; publishing needs both languages.
        $this->putJson('/api/admin/policies/privacy', ['bodyAr' => 'مسودة', 'isPublished' => false])
            ->assertOk()->assertJsonPath('data.version', 1)->assertJsonPath('data.publishedAt', null);
        $this->putJson('/api/admin/policies/privacy', ['bodyAr' => 'نص', 'isPublished' => true])
            ->assertStatus(422)->assertJsonPath('error.code', 'policy_text_required');

        $this->getJson('/api/policies')->assertOk()->assertJsonCount(0, 'data');

        $this->putJson('/api/admin/policies/privacy', ['bodyAr' => 'نص الخصوصية', 'bodyEn' => 'Privacy text', 'isPublished' => true])
            ->assertOk()->assertJsonPath('data.version', 2)->assertJsonPath('data.isPublished', true);
        // Saving the same text again adds no version.
        $this->putJson('/api/admin/policies/privacy', ['bodyAr' => 'نص الخصوصية', 'bodyEn' => 'Privacy text', 'isPublished' => true])
            ->assertJsonPath('data.version', 2);

        $this->getJson('/api/admin/policies/privacy/versions')->assertOk()
            ->assertJsonCount(2, 'data')->assertJsonPath('data.0.version', 2)->assertJsonPath('data.1.bodyAr', 'مسودة');
        $this->assertDatabaseCount('audit_logs', 2);
        $this->assertDatabaseHas('audit_logs', ['action' => 'policy.updated', 'entity_id' => 'privacy']);

        // The public page needs no sign-in.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/policies')->assertOk()
            ->assertJsonPath('data.0.kind', 'privacy')
            ->assertJsonPath('data.0.bodyEn', 'Privacy text');
    }
}
