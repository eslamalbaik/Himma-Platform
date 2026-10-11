<?php

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ArticleFormRequest;
use App\Http\Requests\Content\ComplianceFormRequest;
use App\Http\Requests\Content\CorrectionFormRequest;
use App\Http\Requests\Content\ReasonFormRequest;
use App\Models\Article;
use App\Models\ArticleCorrection;
use App\Models\ArticleVersion;
use App\Models\MagazineSection;
use App\Settings\Publishing;
use App\Support\Audit;
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
        $query = Article::with(['section', 'issue', 'tenant', 'tags', 'reviewer', 'writer'])
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

    public function show(Request $request, Article $article)
    {
        $article->load(['section', 'issue', 'tenant', 'tags', 'reviewer', 'writer', 'versions.editor', 'corrections.corrector']);

        // CLS-04: every access to confidential content is recorded.
        if ($article->classification === 'confidential') {
            $this->audit($request, 'confidential_viewed', $article);
        }

        return $this->item($article->toPublicArray(true) + [
            'versions' => $article->versions->map(fn (ArticleVersion $version) => $version->toPublicArray())->values(),
            'corrections' => $article->corrections->map(fn (ArticleCorrection $c) => $c->toPublicArray())->values(),
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

    // Settings → Publishing can require metadata before an article goes to review (§6).
    public function submit(Request $request, Article $article)
    {
        if ($article->canDo('submit') && $code = Publishing::submitError($article)) {
            return $this->error($code, 409);
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
        }

        return $this->transition($request, $article, 'approve', ['review_note' => null]);
    }

    public function reject(ReasonFormRequest $request, Article $article)
    {
        return $this->transition($request, $article, 'reject', ['review_note' => $request->reason()]);
    }

    public function publish(Request $request, Article $article)
    {
        if ($article->canDo('publish')) {
            if ($article->compliance_result === 'non_compliant') {
                return $this->error('compliance_failed', 409);
            }
            $rules = Publishing::all();
            if ($rules['publishNeedsCompliant'] && $article->compliance_result !== 'compliant') {
                return $this->error('compliance_not_clear', 409);
            }
            // Four eyes: the approver (the last reviewer) cannot also publish.
            if ($rules['separatePublisher'] && $article->reviewed_by === $request->user()->id) {
                return $this->error('approver_cannot_publish', 409);
            }
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

    // GOV-04: a published article is changed only through a correction, which stays visible with it.
    // The corrected text, when given, is saved as a new version.
    public function correct(CorrectionFormRequest $request, Article $article)
    {
        if ($article->status !== 'published') {
            return $this->error('article_not_published', 409);
        }

        $correction = DB::transaction(function () use ($request, $article) {
            $version = null;
            if ($request->filled('title')) {
                $article->title = trim($request->input('title'));
            }
            if ($request->filled('body')) {
                $article->body = $request->input('body');
            }
            if ($article->isDirty(['title', 'body'])) {
                $article->save();
                $article->saveVersion($request->user());
                $version = (int) $article->versions()->max('version');
            }

            return $article->corrections()->create([
                'kind' => $request->input('kind'),
                'note' => trim($request->input('note')),
                'version' => $version,
                'corrected_by' => $request->user()->id,
                'created_at' => now(),
            ]);
        });

        $this->audit($request, 'corrected', $article, ['kind' => $correction->kind, 'version' => $correction->version]);

        return $this->show($request, $article->fresh());
    }

    // §6 Version Control: bring back an earlier title and text. Only while the article can still be edited;
    // a published article is changed through a correction instead.
    public function restoreVersion(Request $request, Article $article, int $version)
    {
        if (! $article->isEditable()) {
            return $this->error('article_locked', 409);
        }
        $old = $article->versions()->where('version', $version)->first();
        if (! $old) {
            return $this->error('version_not_found', 404);
        }

        DB::transaction(function () use ($request, $article, $old) {
            $article->fill(['title' => $old->title, 'body' => $old->body]);
            if (! $article->isDirty(['title', 'body'])) {
                return;
            }
            // Like any text change: a fresh compliance check is needed before approval.
            $article->fill(['compliance_result' => null, 'compliance_checks' => null, 'compliance_checked_at' => null]);
            if ($article->status === 'approved') {
                $article->status = 'in_review';
            }
            $article->save();
            $article->saveVersion($request->user());
        });

        $this->audit($request, 'version_restored', $article, ['version' => $version]);

        return $this->show($request, $article->fresh());
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
