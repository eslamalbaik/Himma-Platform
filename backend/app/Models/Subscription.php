<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasCuid;

    public const STATUSES = ['trial', 'active', 'past_due', 'cancelled'];

    protected $fillable = ['tenant_id', 'plan_id', 'status', 'starts_at', 'ends_at'];

    protected function casts(): array
    {
        return ['starts_at' => 'date', 'ends_at' => 'date'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'tenantId' => $this->tenant?->cuid,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'planId' => $this->plan?->cuid,
            'planNameAr' => $this->plan?->name_ar,
            'planNameEn' => $this->plan?->name_en,
            'price' => $this->plan ? (float) $this->plan->price : null,
            'currency' => $this->plan?->currency,
            'interval' => $this->plan?->interval,
            'status' => $this->status,
            'startsAt' => optional($this->starts_at)->toDateString(),
            'endsAt' => optional($this->ends_at)->toDateString(),
        ];
    }
}
