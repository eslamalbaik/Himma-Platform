<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\MagazineSection;
use Illuminate\Http\Request;

// The public reading site (`/`, `/stories/{id}`): published public articles only, no sign-in needed.
class ReadController extends Controller
{
    public function articles(Request $request)
    {
        $query = Article::readable()->with(['section', 'tenant', 'tags']);

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

    public function article(string $cuid)
    {
        $article = Article::readable()->with(['section', 'tenant', 'tags'])->where('cuid', $cuid)->first();

        if (! $article) {
            return $this->error('not_found', 404);
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
}
