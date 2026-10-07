<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// A magazine issue (العدد) that groups published articles.
class Issue extends Model
{
    use HasCuid;

    public const STATUSES = ['draft', 'published'];

    protected $fillable = ['number', 'title_ar', 'title_en', 'theme_ar', 'theme_en', 'status', 'published_at'];

    protected function casts(): array
    {
        return ['number' => 'integer', 'published_at' => 'datetime'];
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'number' => $this->number,
            'titleAr' => $this->title_ar,
            'titleEn' => $this->title_en,
            'themeAr' => $this->theme_ar,
            'themeEn' => $this->theme_en,
            'status' => $this->status,
            'publishedAt' => optional($this->published_at)->toIso8601String(),
            'articlesCount' => $this->articles_count ?? null,
        ];
    }
}
