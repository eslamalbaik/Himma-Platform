<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\ArticleFormRequest;
use App\Models\Article;
use App\Models\MagazineSection;
use App\Models\User;
use App\Settings\Publishing;
use App\Support\Audit;
use App\Support\ClientAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Client dashboard → Articles: the organisation writes drafts and sends them to the platform's editorial review
// (draft → in_review); approving and publishing stay with the platform's editors. `publish` lets a user write and
// `submit_review` send for review; "allowed" covers every article of the organisation, "restricted" only the
// user's own. The client can change an article only while it is a draft or was sent back (rejected).
class ArticleController extends Controller
{
    private const CLIENT_EDITABLE = ['draft', 'rejected'];

    public function index(Request $request)
    {
        $query = $this->scope($request->user(), 'publish')->with(['section', 'tenant', 'tags', 'reviewer']);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where('title', 'like', "%{$search}%");
        }
        $statuses = array_intersect(explode(',', (string) $request->query('status', '')), Article::STATUSES);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }
        if ($request->query('mine') === 'true') {
            $query->where('author_id', $request->user()->id);
        }

        return $this->paginated(
            $query->orderByDesc('updated_at')->paginate($this->perPage($request)),
            fn (Article $article) => $this->present($request->user(), $article)
        );
    }

    // Active magazine sections, to file an article under.
    public function sections()
    {
        return response()->json(['data' => MagazineSection::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (MagazineSection $s) => ['id' => $s->cuid, 'nameAr' => $s->name_ar, 'nameEn' => $s->name_en])])
            ->header('Cache-Control', 'no-store');
    }

    public function show(Request $request, string $cuid)
    {
        $article = $this->find($request->user(), 'publish', $cuid);
        if (! $article) {
            return $this->error('article_not_found', 404);
        }

        return $this->item($this->present($request->user(), $article, true));
    }

    public function store(ArticleFormRequest $request)
    {
        $article = DB::transaction(function () use ($request) {
            $article = Article::create($request->fields() + ['status' => 'draft', 'author_id' => $request->user()->id]);
            $article->saveVersion($request->user());

            return $article;
        });

        $this->audit($request, 'created', $article, ['classification' => $article->classification]);

        return $this->item($this->present($request->user(), $article->fresh(), true), 201);
    }

    // Any change to the title or body is kept as a new version (PUB-06).
    public function update(ArticleFormRequest $request, string $cuid)
    {
        $article = $this->find($request->user(), 'publish', $cuid);
        if (! $article) {
            return $this->error('article_not_found', 404);
        }
        if (! in_array($article->status, self::CLIENT_EDITABLE, true)) {
            return $this->error('article_locked', 409);
        }

        DB::transaction(function () use ($request, $article) {
            $article->fill($request->fields());
            $textChanged = $article->isDirty(['title', 'body']);
            $article->save();
            if ($textChanged) {
                $article->saveVersion($request->user());
            }
        });

        $this->audit($request, 'updated', $article, ['status' => $article->status]);

        return $this->item($this->present($request->user(), $article->fresh(), true));
    }

    public function destroy(Request $request, string $cuid)
    {
        $article = $this->find($request->user(), 'publish', $cuid);
        if (! $article) {
            return $this->error('article_not_found', 404);
        }
        if (! in_array($article->status, self::CLIENT_EDITABLE, true)) {
            return $this->error('article_locked', 409);
        }

        $article->delete();
        $this->audit($request, 'deleted', $article);

        return $this->ok();
    }

    // Sends the article to the platform's editorial review, with the metadata Settings → Publishing requires.
    public function submit(Request $request, string $cuid)
    {
        $article = $this->find($request->user(), 'submit_review', $cuid);
        if (! $article) {
            return $this->error('article_not_found', 404);
        }
        if (! $article->canDo('submit')) {
            return $this->error('invalid_article_transition', 409);
        }
        if ($code = Publishing::submitError($article, writerRule: false)) {
            return $this->error($code, 409);
        }

        $from = $article->status;
        $article->update(['status' => 'in_review']);
        $this->audit($request, 'submitted', $article, ['from' => $from, 'to' => 'in_review']);

        return $this->item($this->present($request->user(), $article->fresh()));
    }

    // The organisation's articles the user may reach for a permission: all of them when it is allowed, their own
    // when restricted.
    private function scope(User $user, string $permission): Builder
    {
        $query = Article::where('tenant_id', $user->tenant_id);

        return ClientAccess::allowed($user, $permission) ? $query : $query->where('author_id', $user->id);
    }

    private function find(User $user, string $permission, string $cuid): ?Article
    {
        return $this->scope($user, $permission)->with(['section', 'tenant', 'tags', 'reviewer'])->where('cuid', $cuid)->first();
    }

    // What the client sees of an article, with what this user may do with it. Editorial-only fields
    // (compliance checks, reports) stay with the platform.
    private function present(User $user, Article $article, bool $withBody = false): array
    {
        $data = array_intersect_key($article->toPublicArray($withBody), array_flip([
            'id', 'title', 'summary', 'body', 'language', 'sectionId', 'sectionNameAr', 'sectionNameEn', 'authorName',
            'classification', 'audiences', 'source', 'rightsNote', 'status', 'reviewNote', 'publishedAt', 'createdAt',
            'updatedAt',
        ]));
        $own = $article->author_id === $user->id;
        $editable = in_array($article->status, self::CLIENT_EDITABLE, true);

        return $data + [
            'mine' => $own,
            'canEdit' => $editable && ($own || ClientAccess::allowed($user, 'publish')),
            'canSubmit' => $article->canDo('submit') && ClientAccess::can($user, 'submit_review')
                && ($own || ClientAccess::allowed($user, 'submit_review')),
        ];
    }

    private function audit(Request $request, string $what, Article $article, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "article.$what",
            'actor' => $request->user(),
            'entity_type' => 'article',
            'entity_id' => $article->cuid,
            'metadata' => ['title' => $article->title, 'via' => 'client'] + $metadata,
        ]);
    }
}
