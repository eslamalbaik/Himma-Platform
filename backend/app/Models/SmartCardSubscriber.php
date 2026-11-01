<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// A reader who asked for the news and upcoming events of one card.
class SmartCardSubscriber extends Model
{
    protected $fillable = ['smart_card_id', 'email', 'language'];

    public function toPublicArray(): array
    {
        return ['email' => $this->email, 'language' => $this->language, 'createdAt' => $this->created_at?->toIso8601String()];
    }
}
