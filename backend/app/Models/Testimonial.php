<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;

// A student opinion shown in the moving rows of the landing page.
class Testimonial extends Model
{
    use HasCuid;

    protected $fillable = [
        'author_ar', 'author_en', 'role_ar', 'role_en', 'quote_ar', 'quote_en', 'rating', 'color', 'sort_order', 'is_visible',
    ];

    protected function casts(): array
    {
        return ['rating' => 'integer', 'sort_order' => 'integer', 'is_visible' => 'boolean'];
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'authorAr' => $this->author_ar,
            'authorEn' => $this->author_en,
            'roleAr' => $this->role_ar,
            'roleEn' => $this->role_en,
            'quoteAr' => $this->quote_ar,
            'quoteEn' => $this->quote_en,
            'rating' => $this->rating,
            'color' => $this->color,
            'sortOrder' => $this->sort_order,
            'isVisible' => $this->is_visible,
        ];
    }
}
