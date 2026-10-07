<?php

namespace App\Http\Controllers\Api\Magazine;

use App\Http\Controllers\Controller;
use App\Http\Requests\Magazine\IssueFormRequest;
use App\Models\Issue;
use App\Support\Audit;
use Illuminate\Http\Request;

class IssueController extends Controller
{
    public function index(Request $request)
    {
        $query = Issue::withCount('articles');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('title_ar', 'like', "%{$search}%")
                ->orWhere('title_en', 'like', "%{$search}%")
                ->orWhere('number', $search));
        }
        if (in_array($status = $request->query('status'), Issue::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByDesc('number')->paginate($this->perPage($request)),
            fn (Issue $issue) => $issue->toPublicArray()
        );
    }

    public function store(IssueFormRequest $request)
    {
        $issue = Issue::create($request->fields() + ['status' => 'draft']);
        $this->audit($request, 'created', $issue);

        return $this->item($issue->toPublicArray(), 201);
    }

    public function update(IssueFormRequest $request, Issue $issue)
    {
        $issue->update($request->fields());
        $this->audit($request, 'updated', $issue);

        return $this->item($issue->loadCount('articles')->toPublicArray());
    }

    // An issue is published once all of its articles are published.
    public function publish(Request $request, Issue $issue)
    {
        if ($issue->status === 'published') {
            return $this->error('issue_already_published', 409);
        }
        if (! $issue->articles()->exists()) {
            return $this->error('issue_empty', 409);
        }
        if ($issue->articles()->where('status', '!=', 'published')->exists()) {
            return $this->error('issue_has_unpublished_articles', 409);
        }

        $issue->update(['status' => 'published', 'published_at' => now()]);
        $this->audit($request, 'published', $issue);

        return $this->item($issue->loadCount('articles')->toPublicArray());
    }

    // An issue that holds articles cannot be deleted; move the articles out first.
    public function destroy(Request $request, Issue $issue)
    {
        if ($issue->articles()->exists()) {
            return $this->error('issue_in_use', 409);
        }

        $issue->delete();
        $this->audit($request, 'deleted', $issue);

        return $this->ok();
    }

    private function audit(Request $request, string $what, Issue $issue): void
    {
        Audit::log($request, [
            'action' => "issue.$what",
            'actor' => $request->user(),
            'entity_type' => 'issue',
            'entity_id' => $issue->cuid,
            'metadata' => ['number' => $issue->number],
        ]);
    }
}
