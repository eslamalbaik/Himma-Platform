<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One use of an AI Center tool (AI-P-02).
class AiUsage extends Model
{
    use HasCuid;

    protected $fillable = [
        'user_id', 'tool', 'article_id', 'subject', 'model', 'status', 'error_code',
        'input_tokens', 'output_tokens', 'output', 'applied_fields', 'applied_at', 'applied_by',
    ];

    protected function casts(): array
    {
        return ['output' => 'array', 'applied_fields' => 'array', 'applied_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function applier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }

    public function toPublicArray(bool $withOutput = false): array
    {
        $article = $this->article;

        return [
            'id' => $this->cuid,
            'tool' => $this->tool,
            'model' => $this->model,
            'status' => $this->status,
            'errorCode' => $this->error_code,
            'userNameAr' => $this->user?->name_ar,
            'userNameEn' => $this->user?->name_en,
            'articleId' => $article?->cuid,
            'articleTitle' => $article?->title,
            'subject' => $this->subject,
            'inputTokens' => $this->input_tokens,
            'outputTokens' => $this->output_tokens,
            'appliedFields' => $this->applied_fields,
            'appliedAt' => optional($this->applied_at)->toIso8601String(),
            // What happened to the article afterwards (AI-P-02: who reviewed, who approved, when published).
            'articleStatus' => $article?->status,
            'reviewerNameAr' => $article?->reviewer?->name_ar,
            'reviewerNameEn' => $article?->reviewer?->name_en,
            'publishedAt' => optional($article?->published_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ] + ($withOutput ? ['output' => $this->output] : []);
    }
}
