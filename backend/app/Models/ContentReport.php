<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A complaint about an article (GOV-03). Staff resolve or dismiss it and the decision is kept.
class ContentReport extends Model
{
    use HasCuid;

    public const REASONS = ['misinformation', 'copyright', 'offensive', 'privacy', 'advertising', 'other'];

    public const STATUSES = ['open', 'resolved', 'dismissed'];

    protected $fillable = [
        'article_id', 'reporter_name', 'reporter_email', 'reason', 'details',
        'status', 'resolution_note', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'articleId' => $this->article?->cuid,
            'articleTitle' => $this->article?->title,
            'articleStatus' => $this->article?->status,
            'reporterName' => $this->reporter_name,
            'reporterEmail' => $this->reporter_email,
            'reason' => $this->reason,
            'details' => $this->details,
            'status' => $this->status,
            'resolutionNote' => $this->resolution_note,
            'resolverNameAr' => $this->resolver?->name_ar,
            'resolverNameEn' => $this->resolver?->name_en,
            'resolvedAt' => optional($this->resolved_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
