<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// An organisation's request to join the platform as a tenant, pending staff review.
class TenantRequest extends Model
{
    use HasFactory;

    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'cuid',
        'name_ar',
        'name_en',
        'type',
        'contact_name',
        'contact_email',
        'contact_phone',
        'message',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'tenant_id',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    // Route-model binding and the public API use the cuid, never the numeric id.
    public function getRouteKeyName(): string
    {
        return 'cuid';
    }

    protected static function booted(): void
    {
        static::creating(function (self $request) {
            $request->cuid ??= (string) Str::ulid();
        });
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // Only these fields ever leave the server (mirrors Tenant::toPublicArray()).
    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'type' => $this->type,
            'contactName' => $this->contact_name,
            'contactEmail' => $this->contact_email,
            'contactPhone' => $this->contact_phone,
            'message' => $this->message,
            'status' => $this->status,
            'rejectionReason' => $this->rejection_reason,
            'reviewedBy' => $this->reviewer?->toPublicArray()['nameEn'] ?? null,
            'reviewedAt' => optional($this->reviewed_at)->toIso8601String(),
            'tenantId' => $this->tenant?->cuid,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
