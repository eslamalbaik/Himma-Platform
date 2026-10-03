<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasCuid;

    protected $fillable = ['number', 'tenant_id', 'subscription_id', 'amount', 'currency', 'status', 'issued_at', 'due_at', 'paid_at'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'issued_at' => 'date', 'due_at' => 'date', 'paid_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $invoice) {
            if (!$invoice->number) {
                $next = (static::max('id') ?? 0) + 1;
                $invoice->number = 'INV-' . now()->format('Y') . '-' . str_pad((string) $next, 5, '0', STR_PAD_LEFT);
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'number' => $this->number,
            'tenantId' => $this->tenant?->cuid,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'amount' => (float) $this->amount,
            'paidAmount' => (float) ($this->payments_sum_amount ?? $this->payments()->sum('amount')),
            'currency' => $this->currency,
            'status' => $this->status,
            'issuedAt' => optional($this->issued_at)->toDateString(),
            'dueAt' => optional($this->due_at)->toDateString(),
            'paidAt' => optional($this->paid_at)->toIso8601String(),
        ];
    }
}
