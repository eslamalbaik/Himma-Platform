<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// One of the magazine's sections (أبواب), each under one of the four axes (REQUIREMENTS.md §9).
class MagazineSection extends Model
{
    use HasCuid;

    public const AXES = ['knowledge', 'people', 'data', 'identity'];

    protected $fillable = ['name_ar', 'name_en', 'axis', 'description_ar', 'description_en', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_active' => 'boolean'];
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class, 'section_id');
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'axis' => $this->axis,
            'descriptionAr' => $this->description_ar,
            'descriptionEn' => $this->description_en,
            'sortOrder' => $this->sort_order,
            'isActive' => $this->is_active,
            'articlesCount' => $this->articles_count ?? null,
        ];
    }
}
