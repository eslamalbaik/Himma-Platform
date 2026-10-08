<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// A private one-to-one conversation (MSG-01). `pair_key` keeps one conversation per pair of users.
class Conversation extends Model
{
    use HasCuid;

    protected $fillable = ['pair_key', 'last_message_at'];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public static function pairKey(User $a, User $b): string
    {
        return implode(':', collect([$a->id, $b->id])->sort()->values()->all());
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_participants')->withPivot('last_read_at');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function scopeFor(Builder $query, User $user): Builder
    {
        return $query->whereHas('participants', fn ($q) => $q->whereKey($user->id));
    }

    public function hasParticipant(User $user): bool
    {
        return $this->participants()->whereKey($user->id)->exists();
    }

    public function otherParticipant(User $user): ?User
    {
        return $this->participants->firstWhere('id', '!=', $user->id);
    }

    public function unreadCountFor(User $user): int
    {
        $readAt = $this->participants->firstWhere('id', $user->id)?->pivot->last_read_at;

        return $this->messages()
            ->where('sender_id', '!=', $user->id)
            ->when($readAt, fn ($q) => $q->where('created_at', '>', $readAt))
            ->count();
    }

    public function toPublicArrayFor(User $user): array
    {
        $other = $this->otherParticipant($user);
        $last = $this->messages()->latest('id')->first();

        return [
            'id' => $this->cuid,
            'other' => $other ? Message::personArray($other) : null,
            'blockedByMe' => $other ? UserBlock::isBlocking($user, $other) : false,
            'blockedMe' => $other ? UserBlock::isBlocking($other, $user) : false,
            'lastMessage' => $last ? ['body' => mb_substr($last->body, 0, 120), 'mine' => $last->sender_id === $user->id, 'createdAt' => $last->created_at->toIso8601String()] : null,
            'unread' => $this->unreadCountFor($user),
            'lastMessageAt' => optional($this->last_message_at)->toIso8601String(),
        ];
    }
}
