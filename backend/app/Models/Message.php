<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use App\Support\Ability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    use HasCuid;

    public const MAX_LENGTH = 5000;

    protected $fillable = ['conversation_id', 'sender_id', 'body'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(MessageReport::class);
    }

    // What the other side may see about a person (no email for client users).
    public static function personArray(User $user): array
    {
        $staff = Ability::isPlatformRole($user->role);

        return [
            'id' => $user->cuid,
            'nameAr' => $user->name_ar,
            'nameEn' => $user->name_en,
            'staff' => $staff,
            'role' => $staff ? $user->role : null,
            'tenantNameAr' => $user->tenant?->name_ar,
            'tenantNameEn' => $user->tenant?->name_en,
        ];
    }

    public function toPublicArrayFor(User $viewer): array
    {
        return [
            'id' => $this->cuid,
            'body' => $this->body,
            'mine' => $this->sender_id === $viewer->id,
            'senderId' => $this->sender?->cuid,
            'reportedByMe' => $this->reports->contains('reporter_id', $viewer->id),
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
