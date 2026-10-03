<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasCuid;

    protected $fillable = ['invoice_id', 'amount', 'method', 'reference', 'paid_at', 'recorded_by'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_at' => 'datetime'];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'invoiceId' => $this->invoice?->cuid,
            'invoiceNumber' => $this->invoice?->number,
            'tenantNameAr' => $this->invoice?->tenant?->name_ar,
            'tenantNameEn' => $this->invoice?->tenant?->name_en,
            'amount' => (float) $this->amount,
            'currency' => $this->invoice?->currency,
            'method' => $this->method,
            'reference' => $this->reference,
            'paidAt' => optional($this->paid_at)->toIso8601String(),
        ];
    }
}
