<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

// A registered writer (PUB-02). Pending until an editor verifies their identity and organisation;
// suspended writers keep their published articles but cannot be given new ones.
class Writer extends Model
{
    use HasCuid;

    public const STATUSES = ['pending', 'verified', 'suspended'];

    // How the editor confirmed who the writer is and whom they represent.
    public const VERIFICATION_METHODS = ['id_document', 'organisation_letter', 'interview', 'known_contributor', 'other'];

    protected $fillable = [
        'name_ar', 'name_en', 'email', 'phone', 'tenant_id', 'affiliation', 'title_ar', 'title_en', 'bio_ar', 'bio_en',
        'status', 'verification_method', 'verification_note', 'verified_by', 'verified_at', 'suspension_reason',
    ];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    // The byline in the article's language.
    public function nameIn(string $language): string
    {
        return $language === 'en' ? $this->name_en : $this->name_ar;
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'email' => $this->email,
            'phone' => $this->phone,
            'tenantId' => $this->tenant?->cuid,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'affiliation' => $this->affiliation,
            'titleAr' => $this->title_ar,
            'titleEn' => $this->title_en,
            'bioAr' => $this->bio_ar,
            'bioEn' => $this->bio_en,
            'status' => $this->status,
            'verificationMethod' => $this->verification_method,
            'verificationNote' => $this->verification_note,
            'verifiedAt' => optional($this->verified_at)->toIso8601String(),
            'verifierNameAr' => $this->verifier?->name_ar,
            'verifierNameEn' => $this->verifier?->name_en,
            'suspensionReason' => $this->suspension_reason,
            'articlesCount' => (int) ($this->articles_count ?? 0),
            'publishedCount' => (int) ($this->published_count ?? 0),
            'lastPublishedAt' => $this->last_published_at ? Carbon::parse($this->last_published_at)->toIso8601String() : null,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
