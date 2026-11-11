<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Follow;
use App\Models\MagazineSection;
use Illuminate\Http\Request;

// The public reading site (`/`, `/stories/{id}`): published public articles only, no sign-in needed.
class ReadController extends Controller
{
    public function articles(Request $request)
    {
        // The home feed shows public stories only. A profile page (`authorHandle`, `tenantSlug`) and the
        // following feed (`following=1`) also include what the signed-in reader may see because they follow.
        $viewer = $request->user();
        $personal = $request->filled('authorHandle') || $request->filled('tenantSlug') || ($viewer && $request->boolean('following'));
        $query = ($personal ? Article::visibleTo($viewer) : Article::readable())->with(['section', 'tenant', 'tags', 'author']);

        if ($handle = $request->query('authorHandle')) {
            $query->whereHas('author', fn ($q) => $q->where('handle', strtolower((string) $handle)));
        }
        if ($slug = $request->query('tenantSlug')) {
            $query->whereHas('tenant', fn ($q) => $q->where('slug', $slug));
        }
        if ($viewer && $request->boolean('following')) {
            $query->where(fn ($q) => $q
                ->whereIn('author_id', Follow::where('follower_id', $viewer->id)->where('followable_type', 'user')->select('followable_id'))
                ->orWhereIn('tenant_id', Follow::where('follower_id', $viewer->id)->where('followable_type', 'tenant')->select('followable_id')));
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")
                ->orWhere('summary', 'like', "%{$search}%")
                ->orWhere('author_name', 'like', "%{$search}%"));
        }
        if (in_array($language = $request->query('language'), Article::LANGUAGES, true)) {
            $query->where('language', $language);
        }
        if ($sectionId = $request->query('sectionId')) {
            $query->whereHas('section', fn ($q) => $q->where('cuid', $sectionId));
        }
        if ($tagId = $request->query('tagId')) {
            $query->whereHas('tags', fn ($q) => $q->where('cuid', $tagId));
        }

        return $this->paginated(
            $query->orderByDesc('published_at')->orderByDesc('id')->paginate(min($this->perPage($request), 30)),
            fn (Article $article) => $article->toReaderArray()
        );
    }

    public function article(Request $request, string $cuid)
    {
        $article = Article::visibleTo($request->user())->with(['section', 'tenant', 'tags', 'author'])->where('cuid', $cuid)->first();

        if (! $article) {
            return $this->gated($cuid);
        }

        return $this->item($article->toReaderArray(true));
    }

    // Active sections with how many readable articles each has: the home page shows those with articles
    // as topics, the story editor offers all of them.
    public function sections()
    {
        $sections = MagazineSection::where('is_active', true)
            ->withCount(['articles' => fn ($q) => $q->readable()])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $sections->map(fn (MagazineSection $section) => $section->toPublicArray())->values(),
        ])->header('Cache-Control', 'no-store');
    }

    // A published story the reader may not open: followers-only and organization-only stories say who to follow
    // or that the reader must belong to the organization (so the page can offer the right button); anything
    // else answers 404 like a story that does not exist.
    private function gated(string $cuid)
    {
        $article = Article::with(['author', 'tenant'])->where('cuid', $cuid)->where('status', 'published')->first();

        if ($article && $article->classification === 'followers') {
            $target = $article->author && $article->author->handle
                ? ['type' => 'person', 'key' => $article->author->handle]
                : ($article->tenant ? ['type' => 'organization', 'key' => $article->tenant->slug] : null);

            return response()->json(['error' => ['code' => 'followers_only'], 'target' => $target], 403);
        }
        if ($article && $article->classification === 'institutional') {
            return $this->error('members_only', 403);
        }

        return $this->error('not_found', 404);
    }
}
