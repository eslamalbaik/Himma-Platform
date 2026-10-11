<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A correction to a published article (GOV-04), kept visible with it. Rows are only ever inserted.
class ArticleCorrection extends Model
{
    use HasCuid;

    public const KINDS = ['correction', 'clarification', 'update'];

    public $timestamps = false;

    protected $fillable = ['article_id', 'kind', 'note', 'version', 'corrected_by', 'created_at'];

    protected function casts(): array
    {
        return ['version' => 'integer', 'created_at' => 'datetime'];
    }

    public function corrector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrected_by');
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'kind' => $this->kind,
            'note' => $this->note,
            'version' => $this->version,
            'correctorNameAr' => $this->corrector?->name_ar,
            'correctorNameEn' => $this->corrector?->name_en,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
