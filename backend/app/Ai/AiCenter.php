<?php

namespace App\Ai;

use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\NotFoundException;
use Anthropic\Core\Exceptions\PermissionDeniedException;
use Anthropic\Core\Exceptions\RateLimitException;
use App\Models\AiUsage;
use App\Models\Article;
use App\Models\User;
use App\Settings\Ai;
use Illuminate\Support\Carbon;

// Runs one AI Center tool through Claude and records the use (AI-P-02). Settings → AI decides whether the
// AI Center is on, which tools are on, the model, the effort and the monthly limit.
class AiCenter
{
    public function __construct(private Claude $claude) {}

    public static function usedThisMonth(): int
    {
        return AiUsage::where('status', '!=', 'failed')->where('created_at', '>=', Carbon::now()->startOfMonth())->count();
    }

    public function run(User $user, string $tool, ?Article $article, array $context = []): AiUsage
    {
        $settings = Ai::all();
        if (! $settings['enabled']) {
            throw new AiException('ai_disabled', 409);
        }
        if (! ($settings['features'][Tools::FEATURES[$tool]] ?? false)) {
            throw new AiException('ai_tool_disabled', 409);
        }
        $key = Ai::apiKey();
        if (! $key) {
            throw new AiException('ai_not_configured', 409);
        }
        if ($settings['monthlyLimit'] > 0 && self::usedThisMonth() >= $settings['monthlyLimit']) {
            throw new AiException('ai_limit_reached', 429);
        }

        [$prompt, $schema] = Tools::request($tool, $article, $context);
        $model = $settings['model'];
        $usage = new AiUsage([
            'user_id' => $user->id,
            'tool' => $tool,
            'article_id' => $article?->id,
            'subject' => $context['month'] ?? null,
            'model' => $model,
        ]);

        $params = [
            'model' => $model,
            'maxTokens' => 16000,
            'system' => Tools::system($article?->language ?? ($user->locale === 'en' ? 'en' : 'ar')),
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'outputConfig' => ['effort' => $settings['effort'], 'format' => ['type' => 'json_schema', 'schema' => $schema]],
        ];
        // A declined request is retried on a fallback model chosen by the API (not available for Haiku).
        if ($model !== 'claude-haiku-5-5') {
            $params += ['betas' => ['server-side-fallback-2026-07-01'], 'fallbacks' => 'default'];
        }

        try {
            $message = $this->claude->client($key)->beta->messages->create(...$params);
        } catch (AuthenticationException|PermissionDeniedException $e) {
            $this->fail($usage, 'ai_key_rejected');
        } catch (NotFoundException $e) {
            $this->fail($usage, 'ai_model_unavailable');
        } catch (RateLimitException $e) {
            $this->fail($usage, 'ai_rate_limited', 429);
        } catch (APIStatusException $e) {
            report($e);
            $this->fail($usage, 'ai_provider_error');
        } catch (APIConnectionException $e) {
            report($e);
            $this->fail($usage, 'ai_unreachable');
        }

        $usage->fill([
            'model' => $message->model ?: $model,
            'input_tokens' => $message->usage->inputTokens,
            'output_tokens' => $message->usage->outputTokens,
        ]);

        if ($message->stopReason === 'refusal') {
            $usage->fill(['status' => 'refused', 'error_code' => 'ai_refused'])->save();
            throw new AiException('ai_refused', 422);
        }

        $text = '';
        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $text .= $block->text;
            }
        }
        $output = json_decode($text, true);
        if ($message->stopReason === 'max_tokens' || ! is_array($output)) {
            $usage->fill(['status' => 'failed', 'error_code' => 'ai_incomplete'])->save();
            throw new AiException('ai_incomplete', 502);
        }

        $output = $this->finish($tool, $output, $article);
        $usage->fill([
            'status' => 'completed',
            'output' => $settings['keepGeneratedText'] ? $output : null,
        ])->save();
        $usage->setAttribute('result', $output);

        return $usage;
    }

    // Values the model cannot be trusted to keep in range, and what is computed rather than generated.
    private function finish(string $tool, array $output, ?Article $article): array
    {
        if ($tool === 'editor_report') {
            $output['qualityScore'] = max(0, min(100, (int) ($output['qualityScore'] ?? 0)));
        }
        if ($tool === 'writer_assistant' && $article) {
            $output['readingMinutes'] = Tools::readingMinutes($article);
        }

        return $output;
    }

    private function fail(AiUsage $usage, string $code, int $status = 502): never
    {
        $usage->fill(['status' => 'failed', 'error_code' => $code])->save();

        throw new AiException($code, $status);
    }
}
