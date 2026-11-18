<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A book, a piece of research or a guide in the library (المكتبة, under Articles). It belongs to one language
// community, has a cover and a file (PDF or EPUB) and/or a link, and readers see it once it is published.
class LibraryItem extends Model
{
    use HasCuid;

    public const TYPES = ['book', 'research', 'guide', 'report', 'other'];

    public const STATUSES = ['draft', 'published'];

    protected $fillable = [
        'community', 'type', 'title', 'author_name', 'summary', 'publisher', 'year', 'isbn', 'external_url',
        'section_id', 'cover_path', 'file_path', 'file_name', 'file_size', 'status', 'published_at', 'created_by',
    ];

    protected function casts(): array
    {
        return ['year' => 'integer', 'file_size' => 'integer', 'views' => 'integer', 'published_at' => 'datetime'];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(MagazineSection::class, 'section_id');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    // What the public site shows.
    public function toReaderArray(): array
    {
        return [
            'id' => $this->cuid,
            'type' => $this->type,
            'title' => $this->title,
            'authorName' => $this->author_name,
            'summary' => $this->summary,
            'publisher' => $this->publisher,
            'year' => $this->year,
            'isbn' => $this->isbn,
            'externalUrl' => $this->external_url,
            'sectionId' => $this->section?->cuid,
            'sectionNameAr' => $this->section?->name_ar,
            'sectionNameEn' => $this->section?->name_en,
            'coverUrl' => $this->cover_path ? '/storage/'.$this->cover_path : null,
            'fileUrl' => $this->file_path ? '/storage/'.$this->file_path : null,
            'fileName' => $this->file_name,
            'fileSize' => $this->file_size,
            'views' => $this->views,
            'publishedAt' => optional($this->published_at)->toIso8601String(),
        ];
    }

    public function toPublicArray(): array
    {
        return $this->toReaderArray() + [
            'community' => $this->community,
            'status' => $this->status,
            'createdAt' => optional($this->created_at)->toIso8601String(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
