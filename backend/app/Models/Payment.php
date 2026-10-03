<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Money received (or being collected online) against an invoice. Only `succeeded` payments count as paid.
class Payment extends Model
{
    use HasCuid;

    public const METHODS = ['bank_transfer', 'card', 'cash', 'online'];

    public const STATUSES = ['pending', 'succeeded', 'failed', 'canceled', 'refunded'];

    protected $fillable = [
        'invoice_id', 'gateway_id', 'amount', 'method', 'status', 'reference',
        'gateway_reference', 'checkout_url', 'paid_at', 'recorded_by',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'paid_at' => 'datetime'];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function gateway(): BelongsTo
    {
        return $this->belongsTo(PaymentGateway::class, 'gateway_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function refundableAmount(): float
    {
        if ($this->status !== 'succeeded') {
            return 0.0;
        }

        $refunded = (float) $this->refunds()->whereIn('status', ['pending', 'completed'])->sum('amount');

        return round((float) $this->amount - $refunded, 2);
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
            'status' => $this->status,
            'gatewayNameAr' => $this->gateway?->name_ar,
            'gatewayNameEn' => $this->gateway?->name_en,
            'reference' => $this->reference,
            'gatewayReference' => $this->gateway_reference,
            'checkoutUrl' => $this->status === 'pending' ? $this->checkout_url : null,
            'paidAt' => optional($this->paid_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
