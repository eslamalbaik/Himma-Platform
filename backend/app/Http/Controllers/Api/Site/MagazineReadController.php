<?php

namespace App\Http\Controllers\Api\Site;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Issue;

// The magazine on the public site: the published issues (`/magazine`) and one issue with its articles, which
// the page turns into a flipbook (`/magazine/{number}`). Public stories only, no sign-in needed.
class MagazineReadController extends Controller
{
    public function index()
    {
        $issues = Issue::where('status', 'published')
            ->withCount(['articles' => fn ($q) => $q->readable()])
            ->orderByDesc('number')->get();

        return response()->json(['data' => $issues->map(fn (Issue $issue) => $issue->toReaderArray())->values()]);
    }

    public function show(int $number)
    {
        $issue = Issue::where('status', 'published')->where('number', $number)->first();

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
