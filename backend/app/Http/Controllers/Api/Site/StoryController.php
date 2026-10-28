<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Http\Requests\Site\StoryFormRequest;
use App\Models\Article;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// A signed-in member's own stories (`/write`, `/me/stories`). A story is an article with the member as
// author; it goes draft → in review, and only editors in the dashboard approve and publish it (PUB-01).
// Anyone else's article answers 404, never 403, so ids cannot be probed.
class StoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Article::where('author_id', $request->user()->id);

        if (in_array($status = $request->query('status'), Article::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('updated_at')->paginate($this->perPage($request)),
            fn (Article $article) => $article->toStoryArray()
        );
    }

    public function show(Request $request, string $cuid)
    {
        $article = $this->own($request, $cuid);

        return $article ? $this->item($article->toStoryArray(true)) : $this->error('not_found', 404);
    }

    public function store(StoryFormRequest $request)
    {
        $user = $request->user();

        $article = DB::transaction(function () use ($request, $user) {
            $article = Article::create($request->fields() + [
                'status' => 'draft',
                'classification' => 'public',
                'author_id' => $user->id,
                'author_name' => $user->locale === 'en' ? $user->name_en : $user->name_ar,
                'tenant_id' => $user->tenant_id,
            ]);
            $article->saveVersion($user);

            return $article;
        });

        $this->audit($request, 'created', $article);

        return $this->item($article->toStoryArray(true), 201);
    }

    // Edits are possible until the story is published; a changed text needs a new compliance check.
    public function update(StoryFormRequest $request, string $cuid)
    {
        $article = $this->own($request, $cuid);
        if (! $article) {
            return $this->error('not_found', 404);
        }
        if (! $article->isEditable()) {
            return $this->error('article_locked', 409);
        }

        DB::transaction(function () use ($request, $article) {
            $article->fill($request->fields());
            $textChanged = $article->isDirty(['title', 'body']);
            if ($textChanged) {
                $article->fill(['compliance_result' => null, 'compliance_checks' => null, 'compliance_checked_at' => null]);
                if ($article->status === 'approved') {
                    $article->status = 'in_review';
                }
            }
            $article->save();
            if ($textChanged) {
                $article->saveVersion($request->user());
            }
        });

        $this->audit($request, 'updated', $article, ['status' => $article->status]);

        return $this->item($article->fresh()->toStoryArray(true));
    }

    public function submit(Request $request, string $cuid)
    {
        $article = $this->own($request, $cuid);
        if (! $article) {
            return $this->error('not_found', 404);
        }
        if (! $article->canDo('submit')) {
            return $this->error('invalid_article_transition', 409);
        }

        $from = $article->status;
        $article->update(['status' => Article::TRANSITIONS['submit'][1]]);
        $this->audit($request, 'submitted', $article, ['from' => $from, 'to' => $article->status]);

        return $this->item($article->toStoryArray());
    }

    // Only drafts and rejected stories can be deleted; anything that went further stays on record.
    public function destroy(Request $request, string $cuid)
    {
        $article = $this->own($request, $cuid);
        if (! $article) {
            return $this->error('not_found', 404);
        }
        if (! in_array($article->status, ['draft', 'rejected'], true)) {
            return $this->error('article_locked', 409);
        }

        $article->delete();
        $this->audit($request, 'deleted', $article);

        return $this->ok();
    }

    private function own(Request $request, string $cuid): ?Article
    {
        return Article::where('cuid', $cuid)->where('author_id', $request->user()->id)->first();
    }

    private function audit(Request $request, string $what, Article $article, array $metadata = []): void
    {
        Audit::log($request, [
            'action' => "article.$what",
            'actor' => $request->user(),
            'entity_type' => 'article',
            'entity_id' => $article->cuid,
            'metadata' => ['title' => $article->title, 'byAuthor' => true] + $metadata,
        ]);
    }
}
