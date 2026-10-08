<?php

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ArticleFormRequest;
use App\Http\Requests\Content\ComplianceFormRequest;
use App\Http\Requests\Content\ReasonFormRequest;
use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\MagazineSection;
use App\Support\Audit;
use App\Support\PublishingRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ArticleController extends Controller
{
    private const AUDIT_NAMES = [
        'submit' => 'submitted',
        'approve' => 'approved',
        'reject' => 'rejected',
        'publish' => 'published',
        'withdraw' => 'withdrawn',
        'restore' => 'restored',
    ];

    public function index(Request $request)
    {
        $query = Article::with(['section', 'issue', 'tenant', 'tags', 'reviewer'])
            ->withCount(['reports as open_reports_count' => fn ($q) => $q->where('status', 'open')]);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('author_name', 'like', "%{$search}%"));
        }

        $statuses = array_intersect(explode(',', (string) $request->query('status', '')), Article::STATUSES);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }
        if (in_array($classification = $request->query('classification'), Article::CLASSIFICATIONS, true)) {
            $query->where('classification', $classification);
        }
        if (in_array($language = $request->query('language'), Article::LANGUAGES, true)) {
            $query->where('language', $language);
        }
        if ($sectionId = $request->query('sectionId')) {
            $query->whereHas('section', fn ($q) => $q->where('cuid', $sectionId));
        }
        if (in_array($axis = $request->query('axis'), MagazineSection::AXES, true)) {
            $query->whereHas('section', fn ($q) => $q->where('axis', $axis));
        }
        if ($issueId = $request->query('issueId')) {
            $query->whereHas('issue', fn ($q) => $q->where('cuid', $issueId));
        }

        return $this->paginated(
            $query->orderByDesc('updated_at')->paginate($this->perPage($request)),
            fn (Article $article) => $article->toPublicArray()
        );
    }

    public function show(Article $article)
    {
        $article->load(['section', 'issue', 'tenant', 'tags', 'reviewer', 'versions.editor']);

        return $this->item($article->toPublicArray(true) + [
            'versions' => $article->versions->map(fn (ArticleVersion $version) => $version->toPublicArray())->values(),
        ]);
    }

    public function store(ArticleFormRequest $request)
    {
        $article = DB::transaction(function () use ($request) {
            $article = Article::create($request->fields() + ['status' => 'draft', 'author_id' => null]);
            $article->tags()->sync($request->tagIds());
            $article->saveVersion($request->user());

            return $article;
        });

        $this->audit($request, 'created', $article, ['classification' => $article->classification]);

        return $this->item($article->fresh(['section', 'issue', 'tenant', 'tags'])->toPublicArray(true), 201);
    }

    // Any edit to the title or body is saved as a new version (PUB-06).
    public function update(ArticleFormRequest $request, Article $article)
    {
        if (! $article->isEditable()) {
            return $this->error('article_locked', 409);
        }

        DB::transaction(function () use ($request, $article) {
            $article->fill($request->fields());
            $textChanged = $article->isDirty(['title', 'body']);
            // A changed text needs a fresh compliance check before it can be approved again.
            if ($textChanged) {
                $article->fill(['compliance_result' => null, 'compliance_checks' => null, 'compliance_checked_at' => null]);
                if ($article->status === 'approved') {
                    $article->status = 'in_review';
                }
            }
            $article->save();
            $article->tags()->sync($request->tagIds());
            if ($textChanged) {
                $article->saveVersion($request->user());
            }
        });

        $this->audit($request, 'updated', $article, ['status' => $article->status]);

        return $this->item($article->fresh(['section', 'issue', 'tenant', 'tags'])->toPublicArray(true));
    }

    // Only drafts and rejected articles can be deleted; anything that went further stays on record.
    public function destroy(Request $request, Article $article)
    {
        if (! in_array($article->status, ['draft', 'rejected'], true)) {
            return $this->error('article_locked', 409);
        }

        $article->delete();
        $this->audit($request, 'deleted', $article);

        return $this->ok();
    }

    // Records the result of the ten compliance items (§4). The checks are the evidence record (CMP-05).
    public function compliance(ComplianceFormRequest $request, Article $article)
    {
        if (! $article->isEditable()) {
            return $this->error('article_locked', 409);
        }

        $checks = $request->checks();
        $result = Article::complianceResultFor($checks);
        $updates = ['compliance_checks' => $checks, 'compliance_result' => $result, 'compliance_checked_at' => now()];

        // A warning sends the article to human review (CMP-04); an approved article that no longer
        // passes goes back to review so it cannot be published (CMP-03).
        if ($result !== 'compliant' && in_array($article->status, ['draft', 'rejected', 'approved'], true)) {
            $updates['status'] = 'in_review';
        }

        $article->update($updates);
        $this->audit($request, 'compliance_checked', $article, ['result' => $result, 'checks' => $checks]);

        return $this->item($article->fresh(['section', 'issue', 'tenant', 'tags'])->toPublicArray());
    }

    // Fields the publishing settings require must be filled before review (Settings → Publishing).
    public function submit(Request $request, Article $article)
    {
        if ($article->canDo('submit') && $missing = PublishingRules::missingField($article)) {
            return $this->error($missing, 409);
        }

        return $this->transition($request, $article, 'submit');
    }

    // Approval needs a compliance check that did not fail (CMP-03).
    public function approve(Request $request, Article $article)
    {
        if ($article->canDo('approve')) {
            if ($article->compliance_result === null) {
                return $this->error('compliance_required', 409);
            }
            if ($article->compliance_result === 'non_compliant') {
                return $this->error('compliance_failed', 409);
            }
            if ($blocked = PublishingRules::approvalBlock($article, $request->user())) {
                return $this->error($blocked, 409);
            }
        }

        return $this->transition($request, $article, 'approve', ['review_note' => null]);
    }

    public function reject(ReasonFormRequest $request, Article $article)
    {
        return $this->transition($request, $article, 'reject', ['review_note' => $request->reason()]);
    }

    public function publish(Request $request, Article $article)
    {
        if ($article->canDo('publish') && $article->compliance_result === 'non_compliant') {
            return $this->error('compliance_failed', 409);
        }

        return $this->transition($request, $article, 'publish', ['published_at' => now()]);
    }

    // Withdrawal after publication (GOV-02) keeps the article and its reason on record.
    public function withdraw(ReasonFormRequest $request, Article $article)
    {
        return $this->transition($request, $article, 'withdraw', [
            'withdrawn_at' => now(),
            'withdrawal_reason' => $request->reason(),
        ]);
    }

    // A restored article goes back through review rather than straight to publication (PUB-01).
    public function restore(Request $request, Article $article)
    {
        return $this->transition($request, $article, 'restore', [
            'withdrawn_at' => null,
            'compliance_result' => null,
            'compliance_checks' => null,
            'compliance_checked_at' => null,
        ]);
    }

    private function transition(Request $request, Article $article, string $action, array $extra = [])
    {
        if (! $article->canDo($action)) {
            return $this->error('invalid_article_transition', 409);
        }

        $from = $article->status;
        $reviewer = $action === 'submit' ? [] : ['reviewed_by' => $request->user()->id];
        $article->update(['status' => Article::TRANSITIONS[$action][1]] + $reviewer + $extra);

        $this->audit($request, self::AUDIT_NAMES[$action], $article, array_filter([
            'from' => $from,
            'to' => $article->status,
            'reason' => $extra['review_note'] ?? $extra['withdrawal_reason'] ?? null,
        ]));

        return $this->item($article->fresh(['section', 'issue', 'tenant', 'tags', 'reviewer'])->toPublicArray());
    }

    private function audit(Request $request, string $what, Article $article, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "article.$what",
            'actor' => $request->user(),
            'entity_type' => 'article',
            'entity_id' => $article->cuid,
            'metadata' => ['title' => $article->title] + $metadata,
        ]);
    }
}
