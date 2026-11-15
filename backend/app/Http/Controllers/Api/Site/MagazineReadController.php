<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Issue;
use App\Support\Community;
use Illuminate\Http\Request;

// The magazine on the public site: the published issues (`/magazine`) and one issue with its articles, which
// the page turns into a flipbook (`/magazine/{number}`). Public stories only, no sign-in needed. Each language
// community has its own issues, numbered separately.
class MagazineReadController extends Controller
{
    public function index(Request $request)
    {
        $issues = Issue::where('status', 'published')->where('community', Community::current($request))
            ->withCount(['articles' => fn ($q) => $q->readable()])
            ->orderByDesc('number')->get();

        return response()->json(['data' => $issues->map(fn (Issue $issue) => $issue->toReaderArray())->values()]);
    }

    public function show(Request $request, int $number)
    {
        $issue = Issue::where('status', 'published')->where('community', Community::current($request))->where('number', $number)->first();

        if (! $issue) {
            return $this->error('not_found', 404);
        }

        $articles = Article::readable()->where('issue_id', $issue->id)
            ->with(['section', 'author', 'tenant', 'tags', 'issue'])
            ->orderBy('published_at')->orderBy('id')->get();

        return $this->item($issue->toReaderArray() + [
            'articles' => $articles->map(fn (Article $article) => $article->toReaderArray() + [
                'excerpt' => $article->excerpt(),
            ])->values(),
        ]);
    }
}
