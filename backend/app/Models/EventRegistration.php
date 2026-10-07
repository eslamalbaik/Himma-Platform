<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRegistration extends Model
{
    use HasCuid;

    public const STATUSES = ['registered', 'attended', 'cancelled'];

    protected $fillable = ['event_id', 'name', 'email', 'tenant_id', 'status'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'name' => $this->name,
            'email' => $this->email,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'status' => $this->status,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
