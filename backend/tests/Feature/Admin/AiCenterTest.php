<?php

namespace Tests\Feature\Admin;

use App\Ai\Claude;
use App\Models\AiUsage;
use App\Models\Article;
use App\Models\MagazineSection;
use App\Models\Setting;
use App\Settings\Secrets;
use GuzzleHttp\Client as Guzzle;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Psr\Http\Message\RequestInterface;
use Tests\TestCase;

class AiCenterTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<int, array{request: RequestInterface}> */
    private array $sent = [];

    protected function setUp(): void
    {
        parent::setUp();
        Setting::putGroup('ai', ['enabled' => true, 'apiKey' => Secrets::seal('sk-ant-test')]);
    }

    // Claude answers with these messages, in order; every request the SDK sends is kept in $this->sent.
    private function claudeAnswers(array ...$answers): void
    {
        $responses = array_map(fn (array $a) => new Response($a['status'] ?? 200, ['Content-Type' => 'application/json'], json_encode($a['body'] ?? [
            'id' => 'msg_test', 'type' => 'message', 'role' => 'assistant', 'model' => $a['model'] ?? 'claude-opus-5-5',
            'content' => [['type' => 'text', 'text' => json_encode($a['json'] ?? [])]],
            'stop_reason' => $a['stop'] ?? 'end_turn', 'stop_sequence' => null,
            'usage' => ['input_tokens' => 1200, 'output_tokens' => 300],
        ])), $answers);

        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($this->sent));
        $this->app->instance(Claude::class, new Claude(new Guzzle(['handler' => $stack])));
    }

    private function body(int $i = 0): array
    {
        return json_decode((string) $this->sent[$i]['request']->getBody(), true);
    }

    private function writerAnswer(): array
    {
        return ['json' => [
            'titles' => ['عنوان ١', 'عنوان ٢', 'عنوان ٣'], 'subtitle' => 'عنوان فرعي', 'summary' => 'ملخص',
            'languageFixes' => [['original' => 'خطا', 'suggestion' => 'خطأ', 'reason' => 'همزة']],
            'tags' => ['تعليم'], 'sectionId' => 'none', 'discussionQuestions' => ['سؤال؟'],
        ]];
    }

    public function test_permissions(): void
    {
        $article = Article::factory()->create();
        $this->getJson('/api/admin/ai')->assertStatus(401);

        $this->signIn('support');
        $this->getJson('/api/admin/ai')->assertStatus(403);

        // The auditor reads the usage log but does not run tools.
        $this->signIn('auditor');
        $this->getJson('/api/admin/ai/usages')->assertOk();
        $this->postJson('/api/admin/ai/run', ['tool' => 'editor_report', 'articleId' => $article->cuid])->assertStatus(403);

        $this->signIn('platform_editor');
        $this->getJson('/api/admin/ai')->assertOk()->assertJsonPath('data.enabled', true)->assertJsonPath('data.tools.issue_builder', true);
    }

    public function test_settings_gate_every_run(): void
    {
        $article = Article::factory()->create();
        $run = fn () => $this->postJson('/api/admin/ai/run', ['tool' => 'editor_report', 'articleId' => $article->cuid]);
        $this->signIn('platform_editor');

        $this->postJson('/api/admin/ai/run', ['tool' => 'poem', 'articleId' => $article->cuid])->assertStatus(422)->assertJsonPath('error.code', 'invalid_ai_tool');
        $this->postJson('/api/admin/ai/run', ['tool' => 'editor_report'])->assertStatus(422)->assertJsonPath('error.code', 'article_not_found');

        Setting::putGroup('ai', ['enabled' => false]);
        $run()->assertStatus(409)->assertJsonPath('error.code', 'ai_disabled');

        Setting::putGroup('ai', ['enabled' => true, 'features' => ['editorReport' => false]]);
        $run()->assertStatus(409)->assertJsonPath('error.code', 'ai_tool_disabled');

        Setting::putGroup('ai', ['features' => [], 'apiKey' => null]);
        $run()->assertStatus(409)->assertJsonPath('error.code', 'ai_not_configured');

        Setting::putGroup('ai', ['apiKey' => Secrets::seal('sk-ant-test'), 'monthlyLimit' => 1]);
        AiUsage::create(['tool' => 'editor_report', 'model' => 'claude-opus-5-5', 'status' => 'completed']);
        $run()->assertStatus(429)->assertJsonPath('error.code', 'ai_limit_reached');

        // Confidential content never leaves the platform.
        Setting::putGroup('ai', ['monthlyLimit' => 0]);
        $secret = Article::factory()->create(['classification' => 'confidential']);
        $this->postJson('/api/admin/ai/run', ['tool' => 'editor_report', 'articleId' => $secret->cuid])
            ->assertStatus(409)->assertJsonPath('error.code', 'ai_confidential_content');

        $this->assertCount(0, $this->sent);
    }

    public function test_writer_assistant_calls_claude_and_logs_the_use(): void
    {
        $editor = $this->signIn('platform_editor');
        $article = Article::factory()->create(['body' => str_repeat('كلمة ', 400), 'title' => 'التعلم بالمشاريع']);
        $this->claudeAnswers($this->writerAnswer());

        $response = $this->postJson('/api/admin/ai/run', ['tool' => 'writer_assistant', 'articleId' => $article->cuid])->assertOk()
            ->assertJsonPath('data.result.titles.1', 'عنوان ٢')
            ->assertJsonPath('data.result.readingMinutes', 3) // 400 Arabic words at ~180 a minute
            ->assertJsonPath('data.usage.status', 'completed')
            ->assertJsonPath('data.usage.articleId', $article->cuid);

        // What was sent: the model and effort from Settings → AI, a JSON schema, refusal fallbacks, and the article as data.
        $body = $this->body();
        $this->assertSame('claude-opus-5-5', $body['model']);
        $this->assertSame('high', $body['output_config']['effort']);
        $this->assertSame('json_schema', $body['output_config']['format']['type']);
        $this->assertContains('none', $body['output_config']['format']['schema']['properties']['sectionId']['enum']);
        $this->assertSame('default', $body['fallbacks']);
        $this->assertStringContainsString('server-side-fallback-2026-07-01', $this->sent[0]['request']->getHeaderLine('anthropic-beta'));
        $this->assertSame('sk-ant-test', $this->sent[0]['request']->getHeaderLine('x-api-key'));
        $this->assertStringContainsString('Write every text value in Arabic', json_encode($body['system'], JSON_UNESCAPED_UNICODE));
        $this->assertStringContainsString('<article>', $body['messages'][0]['content']);
        $this->assertStringContainsString('التعلم بالمشاريع', $body['messages'][0]['content']);

        $usage = AiUsage::sole();
        $this->assertSame([$editor->id, 'writer_assistant', 1200, 300], [$usage->user_id, $usage->tool, $usage->input_tokens, $usage->output_tokens]);
        $this->assertSame('عنوان فرعي', $usage->output['subtitle']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'ai.used', 'actor_id' => $editor->id, 'entity_id' => $article->cuid]);

        // The editor records which suggestions went into the article.
        $id = $response->json('data.usage.id');
        $this->postJson("/api/admin/ai/usages/$id/applied", ['fields' => []])->assertStatus(422)->assertJsonPath('error.code', 'invalid_applied_fields');
        $this->postJson("/api/admin/ai/usages/$id/applied", ['fields' => ['title', 'summary']])->assertOk()
            ->assertJsonPath('data.appliedFields', ['title', 'summary']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'ai.applied', 'entity_id' => $id]);

        $this->getJson("/api/admin/ai/usages/$id")->assertOk()->assertJsonPath('data.output.titles.0', 'عنوان ١');
    }

    public function test_generated_text_is_not_kept_when_the_setting_is_off_and_haiku_has_no_fallback(): void
    {
        Setting::putGroup('ai', ['keepGeneratedText' => false, 'model' => 'claude-haiku-5-5', 'effort' => 'low']);
        $this->signIn('platform_editor');
        $article = Article::factory()->create(['language' => 'en']);
        $this->claudeAnswers(['model' => 'claude-haiku-5-5', 'json' => ['qualityScore' => 150, 'strengths' => ['Clear'], 'improvements' => [], 'recommendation' => 'Add sources']]);

        $this->postJson('/api/admin/ai/run', ['tool' => 'editor_report', 'articleId' => $article->cuid])->assertOk()
            ->assertJsonPath('data.result.qualityScore', 100); // kept in range

        $body = $this->body();
        $this->assertSame('claude-haiku-5-5', $body['model']);
        $this->assertArrayNotHasKey('fallbacks', $body);
        $this->assertStringContainsString('Write every text value in English', json_encode($body['system']));
        $this->assertNull(AiUsage::sole()->output);
    }

    public function test_refusals_and_errors_are_logged(): void
    {
        $this->signIn('platform_editor');
        $article = Article::factory()->create();
        $this->claudeAnswers(
            ['stop' => 'refusal', 'body' => [
                'id' => 'msg_r', 'type' => 'message', 'role' => 'assistant', 'model' => 'claude-opus-5-5', 'content' => [],
                'stop_reason' => 'refusal', 'stop_sequence' => null, 'usage' => ['input_tokens' => 900, 'output_tokens' => 0],
            ]],
            ['status' => 401, 'body' => ['type' => 'error', 'error' => ['type' => 'authentication_error', 'message' => 'invalid x-api-key']]],
        );

        $run = fn () => $this->postJson('/api/admin/ai/run', ['tool' => 'compliance_detection', 'articleId' => $article->cuid]);
        $run()->assertStatus(422)->assertJsonPath('error.code', 'ai_refused');
        $run()->assertStatus(502)->assertJsonPath('error.code', 'ai_key_rejected');

        $this->assertSame(['refused', 'failed'], AiUsage::orderBy('id')->pluck('status')->all());
        $this->assertDatabaseHas('audit_logs', ['action' => 'ai.refused', 'entity_id' => $article->cuid]);
        $this->getJson('/api/admin/ai/usages?status=failed')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.errorCode', 'ai_key_rejected');
    }

    public function test_issue_builder_nominates_from_the_months_articles(): void
    {
        $this->travelTo('2026-10-20 10:00:00');
        $this->signIn('platform_editor');

        $this->postJson('/api/admin/ai/run', ['tool' => 'issue_builder', 'month' => '2026-09'])
            ->assertStatus(422)->assertJsonPath('error.code', 'ai_nothing_to_analyze');

        $section = MagazineSection::create(['name_ar' => 'الهوية الوطنية', 'name_en' => 'National identity', 'axis' => 'identity']);
        $a = Article::factory()->status('published')->create(['published_at' => '2026-10-03', 'section_id' => $section->id]);
        $b = Article::factory()->status('published')->create(['published_at' => '2026-10-09']);
        Article::factory()->status('published')->create(['published_at' => '2026-10-10', 'classification' => 'confidential']);
        Article::factory()->status('published')->create(['published_at' => '2026-09-30']);

        $this->claudeAnswers(['json' => [
            'nominations' => [['category' => 'best_emirati', 'articleId' => $a->cuid, 'reason' => 'يعزز الهوية']],
            'draft' => ['themeAr' => 'الهوية', 'themeEn' => 'Identity', 'editorialNoteAr' => 'افتتاحية', 'editorialNoteEn' => 'Editorial', 'articleIds' => [$a->cuid, $b->cuid]],
        ]]);

        $this->postJson('/api/admin/ai/run', ['tool' => 'issue_builder'])->assertOk()
            ->assertJsonPath('data.result.nominations.0.articleId', $a->cuid)
            ->assertJsonPath('data.usage.subject', '2026-10')
            ->assertJsonCount(2, 'data.articles');

        // Only this month's non-confidential published articles can be nominated.
        $enum = $this->body()['output_config']['format']['schema']['properties']['nominations']['items']['properties']['articleId']['enum'];
        $this->assertEqualsCanonicalizing([$a->cuid, $b->cuid], $enum);
    }

    public function test_ai_usage_report(): void
    {
        $this->travelTo('2026-10-20 10:00:00');
        $editor = $this->signIn('platform_editor');
        $article = Article::factory()->status('published')->create(['published_at' => now()]);
        AiUsage::create(['user_id' => $editor->id, 'tool' => 'editor_report', 'article_id' => $article->id, 'model' => 'claude-opus-5-5',
            'status' => 'completed', 'input_tokens' => 1000, 'output_tokens' => 200, 'applied_fields' => ['title'], 'applied_at' => now()]);
        AiUsage::create(['user_id' => $editor->id, 'tool' => 'writer_assistant', 'model' => 'claude-opus-5-5', 'status' => 'completed']);
        AiUsage::create(['user_id' => $editor->id, 'tool' => 'writer_assistant', 'model' => 'claude-opus-5-5', 'status' => 'refused']);

        // Platform editors use the AI Center and read reports.
        $this->getJson('/api/admin/reports/ai?from=2026-10-01&to=2026-10-31')->assertOk()
            ->assertJsonPath('data.totals.uses', 3)->assertJsonPath('data.totals.completed', 2)
            ->assertJsonPath('data.totals.applied', 1)->assertJsonPath('data.totals.appliedRate', 50)
            ->assertJsonPath('data.byTool.writer_assistant', 2)->assertJsonPath('data.byUser.0.uses', 3)
            ->assertJsonPath('data.usages.2.articleStatus', 'published');

        $csv = $this->get('/api/admin/reports/ai/export?from=2026-10-01&to=2026-10-31&lang=en')->assertOk()->streamedContent();
        $this->assertStringContainsString('Editor report', $csv);

        $this->signIn('finance');
        $this->getJson('/api/admin/reports/ai')->assertStatus(403);
    }
}
