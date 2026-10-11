<?php

namespace Tests\Feature\Admin;

use App\Ai\Claude;
use App\Models\Article;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Settings\Policies;
use GuzzleHttp\Client as Guzzle;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

// Settings → Publishing, Policies, YouTube and AI.
class PlatformSettingsPagesTest extends TestCase
{
    use RefreshDatabase;

    private function publishing(array $override = []): array
    {
        return $override + [
            'requireSource' => false, 'requireRightsNote' => false, 'requireSection' => false,
            'publishNeedsCompliant' => false, 'separatePublisher' => false,
            'sponsoredLabelAr' => 'محتوى مدعوم', 'sponsoredLabelEn' => 'Sponsored content',
        ];
    }

    private function ai(array $override = []): array
    {
        return $override + [
            'enabled' => true, 'model' => 'claude-opus-5-5', 'effort' => 'high', 'monthlyLimit' => 500,
            'keepGeneratedText' => true,
            'features' => ['writerAssistant' => true, 'smartReviewer' => true, 'complianceDetection' => true, 'editorReport' => false, 'issueBuilder' => true],
        ];
    }

    // The Anthropic SDK with canned HTTP responses instead of the network.
    private function fakeClaude(Response ...$responses): void
    {
        $this->app->instance(Claude::class, new Claude(new Guzzle(['handler' => HandlerStack::create(new MockHandler($responses))])));
    }

    public function test_only_the_owner_reads_and_changes_them(): void
    {
        foreach (['publishing', 'policies', 'youtube', 'ai'] as $group) {
            $this->getJson("/api/admin/settings/$group")->assertStatus(401);
        }

        $this->signIn('auditor');
        $this->getJson('/api/admin/settings/ai')->assertStatus(403);
        $this->putJson('/api/admin/settings/publishing', $this->publishing())->assertStatus(403);

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/settings/policies')->assertStatus(403);
    }

    public function test_publishing_rules_are_saved_and_enforced(): void
    {
        $owner = $this->signIn();

        $this->putJson('/api/admin/settings/publishing', $this->publishing(['sponsoredLabelEn' => '']))
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_sponsored_label');
        $this->putJson('/api/admin/settings/publishing', $this->publishing(['requireSource' => 'yes']))
            ->assertJsonPath('error.code', 'invalid_publishing_setting');

        $this->putJson('/api/admin/settings/publishing', $this->publishing(['requireSource' => true, 'separatePublisher' => true, 'publishNeedsCompliant' => true]))
            ->assertOk()->assertJsonPath('data.requireSource', true)->assertJsonPath('data.requireSection', false);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.publishing_updated', 'actor_id' => $owner->id]);

        // Submitting without a source is refused.
        $draft = Article::factory()->create(['source' => null]);
        $this->postJson("/api/admin/content/articles/{$draft->cuid}/submit")->assertStatus(409)->assertJsonPath('error.code', 'source_required');
        $draft->update(['source' => 'وزارة التربية']);
        $this->postJson("/api/admin/content/articles/{$draft->cuid}/submit")->assertOk();

        // "Needs review" is not enough to publish, and the approver cannot publish.
        $approved = Article::factory()->status('approved')->create(['compliance_result' => 'needs_review', 'reviewed_by' => $owner->id]);
        $this->postJson("/api/admin/content/articles/{$approved->cuid}/publish")->assertStatus(409)->assertJsonPath('error.code', 'compliance_not_clear');
        $approved->update(['compliance_result' => 'compliant']);
        $this->postJson("/api/admin/content/articles/{$approved->cuid}/publish")->assertStatus(409)->assertJsonPath('error.code', 'approver_cannot_publish');

        $this->signIn();
        $this->postJson("/api/admin/content/articles/{$approved->cuid}/publish")->assertOk()->assertJsonPath('data.status', 'published');
    }

    public function test_policies(): void
    {
        $this->signIn();

        $this->getJson('/api/admin/settings/policies')->assertOk()
            ->assertJsonPath('data.keys', Policies::KEYS)
            ->assertJsonPath('data.policies.ai.en', 'Artificial intelligence assists editing and analysis; it does not replace human responsibility for published content.')
            ->assertJsonPath('data.policies.privacy.ar', '');

        $this->putJson('/api/admin/settings/policies/unknown', ['ar' => 'x', 'en' => 'x'])->assertStatus(404);
        $this->putJson('/api/admin/settings/policies/privacy', ['ar' => str_repeat('أ', 20001), 'en' => ''])
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_policy_text');

        $this->putJson('/api/admin/settings/policies/privacy', ['ar' => 'نحمي بياناتك.', 'en' => 'We protect your data.'])
            ->assertOk()->assertJsonPath('data.ar', 'نحمي بياناتك.');
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.policy_updated', 'entity_id' => 'privacy']);

        // The public page needs no session and lists only policies that have text.
        auth()->forgetGuards();
        $this->flushSession();
        $public = $this->getJson('/api/site/policies')->assertOk()
            ->assertJsonPath('data.policies.privacy.en', 'We protect your data.')
            ->assertJsonPath('data.sponsoredLabel.ar', 'محتوى مدعوم');
        $this->assertEqualsCanonicalizing(['ai', 'privacy'], array_keys($public->json('data.policies')));
    }

    public function test_youtube_key_is_write_only_and_links_can_be_restricted(): void
    {
        $this->signIn();
        $settings = ['channelId' => 'UC'.str_repeat('a', 22), 'restrictStreamHosts' => false];

        $this->putJson('/api/admin/settings/youtube', ['channelId' => 'not-a-channel'] + $settings)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_youtube_channel');

        $this->putJson('/api/admin/settings/youtube', $settings + ['apiKey' => 'AIza-secret'])
            ->assertOk()->assertJsonPath('data.hasApiKey', true)->assertJsonMissingPath('data.apiKey');
        $stored = Setting::where('group', 'youtube')->where('key', 'apiKey')->value('value');
        $this->assertStringNotContainsString('AIza-secret', $stored);
        $this->assertSame(0, AuditLog::where('metadata', 'like', '%AIza-secret%')->count());

        // An empty key keeps the stored one.
        $this->putJson('/api/admin/settings/youtube', $settings + ['apiKey' => ''])->assertJsonPath('data.hasApiKey', true);

        Http::fake(['www.googleapis.com/*' => Http::response(['items' => [['snippet' => ['title' => 'Himma Live']]]])]);
        $this->postJson('/api/admin/settings/youtube/test')->assertOk()->assertJsonPath('data.channelTitle', 'Himma Live');
        Http::assertSent(fn ($request) => $request['key'] === 'AIza-secret' && $request['id'] === $settings['channelId']);

        // With the restriction on, stream links must be YouTube links.
        $this->putJson('/api/admin/settings/youtube', ['restrictStreamHosts' => true] + $settings)->assertOk();
        $event = [
            'titleAr' => 'ندوة', 'titleEn' => 'Webinar', 'type' => 'webinar', 'format' => 'online', 'visibility' => 'public',
            'startsAt' => now()->addDays(3)->toIso8601String(), 'endsAt' => now()->addDays(3)->addHour()->toIso8601String(),
        ];
        $this->postJson('/api/admin/events', $event + ['streamUrl' => 'https://vimeo.com/123'])
            ->assertStatus(422)->assertJsonPath('error.code', 'stream_url_not_youtube');
        $this->postJson('/api/admin/events', $event + ['streamUrl' => 'https://youtu.be/abc123'])->assertCreated();

        $this->putJson('/api/admin/settings/youtube', $settings + ['clearApiKey' => true])->assertJsonPath('data.hasApiKey', false);
        $this->postJson('/api/admin/settings/youtube/test')->assertStatus(409)->assertJsonPath('error.code', 'youtube_not_configured');
    }

    public function test_ai_settings_and_connection_check(): void
    {
        $owner = $this->signIn();

        $this->getJson('/api/admin/settings/ai')->assertOk()
            ->assertJsonPath('data.enabled', false)->assertJsonPath('data.model', 'claude-opus-5-5')
            ->assertJsonPath('data.features.editorReport', true)->assertJsonPath('data.hasApiKey', false);

        $this->putJson('/api/admin/settings/ai', $this->ai(['model' => 'gpt-4']))->assertStatus(422)->assertJsonPath('error.code', 'invalid_ai_model');
        $this->putJson('/api/admin/settings/ai', $this->ai(['monthlyLimit' => -1]))->assertJsonPath('error.code', 'invalid_ai_limit');

        $this->postJson('/api/admin/settings/ai/test')->assertStatus(409)->assertJsonPath('error.code', 'ai_not_configured');

        $this->putJson('/api/admin/settings/ai', $this->ai(['apiKey' => 'sk-ant-secret']))->assertOk()
            ->assertJsonPath('data.hasApiKey', true)->assertJsonPath('data.features.editorReport', false)
            ->assertJsonPath('data.monthlyLimit', 500)->assertJsonMissingPath('data.apiKey');
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.ai_updated', 'actor_id' => $owner->id]);
        $this->assertSame(0, AuditLog::where('metadata', 'like', '%sk-ant-secret%')->count());

        $this->fakeClaude(
            new Response(200, ['Content-Type' => 'application/json'], json_encode([
                'type' => 'model', 'id' => 'claude-opus-5-5', 'display_name' => 'Claude Opus 5.5', 'created_at' => '2026-09-01T00:00:00Z',
            ])),
            new Response(401, ['Content-Type' => 'application/json'], json_encode(['type' => 'error', 'error' => ['type' => 'authentication_error', 'message' => 'invalid x-api-key']])),
            new Response(404, ['Content-Type' => 'application/json'], json_encode(['type' => 'error', 'error' => ['type' => 'not_found_error', 'message' => 'model not found']])),
        );

        $this->postJson('/api/admin/settings/ai/test')->assertOk()->assertJsonPath('data.modelName', 'Claude Opus 5.5');
        $this->postJson('/api/admin/settings/ai/test')->assertStatus(422)->assertJsonPath('error.code', 'ai_key_rejected');
        $this->postJson('/api/admin/settings/ai/test')->assertStatus(422)->assertJsonPath('error.code', 'ai_model_unavailable');
    }
}
