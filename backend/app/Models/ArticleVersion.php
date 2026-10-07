<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A saved copy of an article's title and body. Rows are only ever inserted.
class ArticleVersion extends Model
{
    public $timestamps = false;

    protected $fillable = ['article_id', 'version', 'title', 'body', 'edited_by', 'created_at'];

    protected function casts(): array
    {
        return ['version' => 'integer', 'created_at' => 'datetime'];
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }

    public function toPublicArray(): array
    {
        return [
            'version' => $this->version,
            'title' => $this->title,
            'body' => $this->body,
            'editorNameAr' => $this->editor?->name_ar,
            'editorNameEn' => $this->editor?->name_en,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
