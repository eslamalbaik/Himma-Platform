<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Someone who writes for the platform. Identity and the organisation they represent are verified by the
// editorial team before their work is relied on (PUB-02).
class Writer extends Model
{
    use HasCuid, HasFactory;

    public const STATUSES = ['pending', 'verified', 'suspended'];

    protected $fillable = [
        'name_ar', 'name_en', 'email', 'phone', 'tenant_id', 'affiliation', 'bio_ar', 'bio_en',
        'status', 'verification_note', 'verified_at', 'verified_by',
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
            'bioAr' => $this->bio_ar,
            'bioEn' => $this->bio_en,
            'status' => $this->status,
            'verificationNote' => $this->verification_note,
            'verifiedAt' => optional($this->verified_at)->toIso8601String(),
            'verifierNameAr' => $this->verifier?->name_ar,
            'verifierNameEn' => $this->verifier?->name_en,
            'articlesCount' => $this->articles_count ?? null,
            'publishedCount' => $this->published_count ?? null,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
