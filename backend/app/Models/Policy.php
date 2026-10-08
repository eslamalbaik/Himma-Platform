<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// One of the public media policies (REQUIREMENTS.md §7), in Arabic and English. Identified by its kind.
class Policy extends Model
{
    // In the order the public page lists them. Titles: policies.kind.<kind> in public/locales.
    public const KINDS = [
        'publishing', 'advertising', 'corrections', 'copyright', 'sponsored',
        'comments', 'ai', 'privacy', 'complaints',
    ];

    protected $fillable = ['kind', 'body_ar', 'body_en', 'is_published', 'version', 'updated_by', 'published_at'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'version' => 'integer', 'published_at' => 'datetime'];
    }

    public function getRouteKeyName(): string
    {
        return 'kind';
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(PolicyVersion::class)->orderByDesc('version');
    }

    // Every kind, with an empty draft for the ones nobody has written yet.
    public static function everyKind()
    {
        $stored = static::with('editor')->get()->keyBy('kind');

        return collect(self::KINDS)->map(fn (string $kind) => $stored[$kind] ?? new static(['kind' => $kind]));
    }

    public function toPublicArray(): array
    {
        return [
            'kind' => $this->kind,
            'bodyAr' => $this->body_ar,
            'bodyEn' => $this->body_en,
            'isPublished' => (bool) $this->is_published,
            'version' => (int) $this->version,
            'publishedAt' => optional($this->published_at)->toIso8601String(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
            'editorNameAr' => $this->editor?->name_ar,
            'editorNameEn' => $this->editor?->name_en,
        ];
    }
}
