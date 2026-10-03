<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Invoice extends Model
{
    use HasCuid;

    public const STATUSES = ['unpaid', 'paid', 'void', 'refunded'];

    protected $fillable = [
        'number', 'tenant_id', 'subscription_id', 'period_start', 'period_end',
        'amount', 'currency', 'status', 'issued_at', 'due_at', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'issued_at' => 'date',
            'due_at' => 'date',
            'period_start' => 'date',
            'period_end' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // The number comes from the row id once it exists, so two invoices created at once never collide.
        static::creating(function (self $invoice) {
            $invoice->number ??= 'TMP-'.Str::ulid();
        });
        static::created(function (self $invoice) {
            if (str_starts_with($invoice->number, 'TMP-')) {
                $invoice->number = 'INV-'.$invoice->issued_at->format('Y').'-'.str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT);
                $invoice->saveQuietly();
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

    public function paidAmount(): float
    {
        return round((float) $this->payments()->where('status', 'succeeded')->sum('amount'), 2);
    }

    public function balance(): float
    {
        return round((float) $this->amount - $this->paidAmount(), 2);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'number' => $this->number,
            'tenantId' => $this->tenant?->cuid,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            'subscriptionId' => $this->subscription?->cuid,
            'periodStart' => optional($this->period_start)->toDateString(),
            'periodEnd' => optional($this->period_end)->toDateString(),
            'amount' => (float) $this->amount,
            'paidAmount' => $this->paidAmount(),
            'currency' => $this->currency,
            'status' => $this->status,
            'issuedAt' => optional($this->issued_at)->toDateString(),
            'dueAt' => optional($this->due_at)->toDateString(),
            'paidAt' => optional($this->paid_at)->toIso8601String(),
        ];
    }
}
