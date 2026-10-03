<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

// An uploaded file. The file itself lives on `disk` (public locally, S3 later).
class Media extends Model
{
    use HasCuid;

    protected $fillable = [
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'rights',
        'source',
        'uploaded_by',
        'tenant_id',
    ];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'url' => Storage::disk($this->disk)->url($this->path),
            'originalName' => $this->original_name,
            'mimeType' => $this->mime_type,
            'size' => $this->size,
            'rights' => $this->rights,
            'source' => $this->source,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
