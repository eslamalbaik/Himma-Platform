<?php

namespace App\Http\Controllers\Api;

use App\Ai\AiCenter;
use App\Ai\AiException;
use App\Ai\Tools;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\AiRunFormRequest;
use App\Models\AiUsage;
use App\Models\Article;
use App\Settings\Ai;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

// The AI Center (§8.8): run a tool on an article, see what was used, and record what was applied.
class AiController extends Controller
{
    public function overview()
    {
        $settings = Ai::all();
        $tools = [];
        foreach (Tools::FEATURES as $tool => $feature) {
            $tools[$tool] = (bool) $settings['features'][$feature];
        }

        return $this->item([
            'enabled' => (bool) $settings['enabled'],
            'configured' => filled(Ai::apiKey()),
            'model' => $settings['model'],
            'tools' => $tools,
            'usedThisMonth' => AiCenter::usedThisMonth(),
            'monthlyLimit' => $settings['monthlyLimit'],
        ]);
    }

    public function run(AiRunFormRequest $request, AiCenter $center)
    {
        $tool = $request->input('tool');
        $article = Tools::needsArticle($tool) ? Article::where('cuid', $request->input('articleId'))->firstOrFail() : null;
        $context = [];

        // Confidential content (§2) is not sent to an outside service.
        if ($article?->classification === 'confidential') {
            return $this->error('ai_confidential_content', 409);
        }

        if ($tool === 'issue_builder') {
            $month = Carbon::createFromFormat('Y-m', $request->input('month') ?: now()->format('Y-m'))->startOfMonth();
            $articles = Article::with('section')->where('status', 'published')->where('classification', '!=', 'confidential')
                ->whereBetween('published_at', [$month, $month->copy()->endOfMonth()])
                ->orderBy('published_at')->limit(80)->get();
            if ($articles->isEmpty()) {
                return $this->error('ai_nothing_to_analyze', 422);
            }
            $context = ['month' => $month->format('Y-m'), 'articles' => $articles];
        }

        try {
            $usage = $center->run($request->user(), $tool, $article, $context);
        } catch (AiException $e) {
            if ($e->errorCode === 'ai_refused') {
                $this->audit($request, 'ai.refused', $tool, $article, $context);
            }

            return $this->error($e->errorCode, $e->status);
        }

        // The audit row says who used which tool on what; the generated text stays in the usage log.
        $this->audit($request, 'ai.used', $tool, $article, $context + ['usage' => $usage->cuid]);

        $data = ['usage' => $usage->load(['user', 'article.reviewer'])->toPublicArray(), 'result' => $usage->getAttribute('result')];
        if ($tool === 'issue_builder') {
            // The answer refers to articles by id; the page shows their titles.
            $data['articles'] = $context['articles']->map(fn (Article $a) => ['id' => $a->cuid, 'title' => $a->title])->values();
        }

        return $this->item($data);
    }

    public function usages(Request $request)
    {
        $query = AiUsage::with(['user', 'article.reviewer'])->orderByDesc('created_at')->orderByDesc('id');

        if (in_array($tool = $request->query('tool'), array_keys(Tools::FEATURES), true)) {
            $query->where('tool', $tool);
        }
        if (in_array($status = $request->query('status'), ['completed', 'refused', 'failed'], true)) {
            $query->where('status', $status);
        }
        if ($articleId = $request->query('articleId')) {
            $query->whereHas('article', fn ($q) => $q->where('cuid', $articleId));
        }
        if ($request->boolean('mine')) {
            $query->where('user_id', $request->user()->id);
        }

        return $this->paginated($query->paginate($this->perPage($request)), fn (AiUsage $u) => $u->toPublicArray());
    }

    public function show(AiUsage $aiUsage)
    {
        return $this->item($aiUsage->load(['user', 'article.reviewer'])->toPublicArray(true));
    }

    // AI-P-02 "what was edited": the editor says which suggestions they took into the article.
    public function applied(Request $request, AiUsage $aiUsage)
    {
        $fields = $request->input('fields');
        if (! is_array($fields) || ! $fields || count($fields) > 20 || array_filter($fields, fn ($f) => ! is_string($f) || strlen($f) > 60)) {
            return $this->error('invalid_applied_fields', 422);
        }
        if ($aiUsage->status !== 'completed') {
            return $this->error('ai_usage_not_completed', 409);
        }

        $aiUsage->update([
            'applied_fields' => array_values(array_unique(array_merge($aiUsage->applied_fields ?? [], $fields))),
            'applied_at' => now(),
            'applied_by' => $request->user()->id,
        ]);

        Audit::log($request, [
            'action' => 'ai.applied',
            'actor' => $request->user(),
            'entity_type' => 'ai_usage',
            'entity_id' => $aiUsage->cuid,
            'metadata' => ['tool' => $aiUsage->tool, 'fields' => $fields, 'article' => $aiUsage->article?->cuid],
        ]);

        return $this->item($aiUsage->load(['user', 'article.reviewer'])->toPublicArray());
    }

    private function audit(Request $request, string $action, string $tool, ?Article $article, array $context): void
    {
        Audit::log($request, [
            'action' => $action,
            'actor' => $request->user(),
            'entity_type' => $article ? 'article' : 'ai',
            'entity_id' => $article?->cuid ?? $tool,
            'metadata' => array_filter(['tool' => $tool, 'month' => $context['month'] ?? null, 'usage' => $context['usage'] ?? null]),
        ]);
    }
}
