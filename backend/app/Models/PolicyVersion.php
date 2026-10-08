<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A saved copy of a policy. Rows are only ever inserted.
class PolicyVersion extends Model
{
    public $timestamps = false;

    protected $fillable = ['policy_id', 'version', 'body_ar', 'body_en', 'is_published', 'edited_by', 'created_at'];

    protected function casts(): array
    {
        return ['version' => 'integer', 'is_published' => 'boolean', 'created_at' => 'datetime'];
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }

    public function toPublicArray(): array
    {
        return [
            'version' => $this->version,
            'bodyAr' => $this->body_ar,
            'bodyEn' => $this->body_en,
            'isPublished' => $this->is_published,
            'editorNameAr' => $this->editor?->name_ar,
            'editorNameEn' => $this->editor?->name_en,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
