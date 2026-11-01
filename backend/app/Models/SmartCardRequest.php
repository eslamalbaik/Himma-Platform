<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A reader's request from a card page: a digital dedication or a signed printed copy of a book.
class SmartCardRequest extends Model
{
    use HasCuid;

    public const KINDS = ['dedication', 'signed_copy'];

    public const STATUSES = ['new', 'done', 'cancelled'];

    protected $fillable = [
        'smart_card_id', 'kind', 'book_title', 'event_id', 'name', 'email', 'phone', 'dedicate_to', 'message', 'address', 'status',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(SmartCard::class, 'smart_card_id');
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'kind' => $this->kind,
            'bookTitle' => $this->book_title,
            'eventId' => $this->event_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'dedicateTo' => $this->dedicate_to,
            'message' => $this->message,
            'address' => $this->address,
            'status' => $this->status,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
