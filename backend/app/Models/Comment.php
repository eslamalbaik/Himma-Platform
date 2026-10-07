<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A reader comment. New comments wait in the moderation queue until approved.
class Comment extends Model
{
    use HasCuid;

    public const STATUSES = ['pending', 'approved', 'hidden'];

    protected $fillable = ['article_id', 'author_name', 'author_email', 'body', 'status', 'moderated_by', 'moderated_at'];

    protected function casts(): array
    {
        return ['moderated_at' => 'datetime'];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'articleId' => $this->article?->cuid,
            'articleTitle' => $this->article?->title,
            'authorName' => $this->author_name,
            'authorEmail' => $this->author_email,
            'body' => $this->body,
            'status' => $this->status,
            'moderatedAt' => optional($this->moderated_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
