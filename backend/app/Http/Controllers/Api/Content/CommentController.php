<?php

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\CommentModerationFormRequest;
use App\Models\Comment;
use App\Support\Audit;
use Illuminate\Http\Request;

// The comment moderation queue (Moderation Queue, §6).
class CommentController extends Controller
{
    public function index(Request $request)
    {
        $query = Comment::with('article');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(fn ($q) => $q->where('body', 'like', "%{$search}%")
                ->orWhere('author_name', 'like', "%{$search}%")
                ->orWhereHas('article', fn ($a) => $a->where('title', 'like', "%{$search}%")));
        }
        if (in_array($status = $request->query('status'), Comment::STATUSES, true)) {
            $query->where('status', $status);
        }

        return $this->paginated(
            $query->orderByRaw("status = 'pending' desc")->orderByDesc('created_at')->paginate($this->perPage($request)),
            fn (Comment $comment) => $comment->toPublicArray(),
            ['pendingCount' => Comment::where('status', 'pending')->count()]
        );
    }

    public function moderate(CommentModerationFormRequest $request, Comment $comment)
    {
        $comment->update([
            'status' => $request->input('status'),
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ]);
        $this->audit($request, $comment->status, $comment);

        return $this->item($comment->fresh('article')->toPublicArray());
    }

    public function destroy(Request $request, Comment $comment)
    {
        $comment->delete();
        $this->audit($request, 'deleted', $comment);

        return $this->ok();
    }

    private function audit(Request $request, string $what, Comment $comment): void
    {
        Audit::log($request, [
            'action' => "comment.$what",
            'actor' => $request->user(),
            'entity_type' => 'comment',
            'entity_id' => $comment->cuid,
            'metadata' => ['articleId' => $comment->article?->cuid],
        ]);
    }
}
