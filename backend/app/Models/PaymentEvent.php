<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// A webhook call from a payment gateway, stored as received. Rows are never edited except to mark them processed.
class PaymentEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['gateway_id', 'event', 'external_id', 'dedupe_key', 'signature_valid', 'payload', 'ip', 'processed_at', 'created_at'];

    protected function casts(): array
    {
        return ['signature_valid' => 'boolean', 'processed_at' => 'datetime', 'created_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(fn (self $event) => $event->created_at ??= now());
    }
}
