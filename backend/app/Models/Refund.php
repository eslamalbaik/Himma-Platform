<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Refund extends Model
{
    use HasCuid;

    public const STATUSES = ['pending', 'completed', 'failed'];

    protected $fillable = ['payment_id', 'amount', 'status', 'gateway_reference', 'reason', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'reason' => $this->reason,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
