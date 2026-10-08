<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A participant's report about one message (MSG-04). Moderators see only the reported message,
// never the rest of the conversation (MSG-06), and each look at it is audited.
class MessageReport extends Model
{
    use HasCuid;

    public const REASONS = ['harassment', 'spam', 'offensive', 'privacy', 'other'];

    public const STATUSES = ['open', 'resolved', 'dismissed'];

    protected $fillable = [
        'message_id', 'reporter_id', 'reason', 'details', 'status', 'resolution_note', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function toPublicArray(): array
    {
        $message = $this->message;

        return [
            'id' => $this->cuid,
            'reason' => $this->reason,
            'details' => $this->details,
            'status' => $this->status,
            'message' => $message ? [
                'id' => $message->cuid,
                'body' => $message->body,
                'createdAt' => $message->created_at->toIso8601String(),
                'sender' => $message->sender ? Message::personArray($message->sender) : null,
            ] : null,
            'reporter' => $this->reporter ? Message::personArray($this->reporter) : null,
            'resolutionNote' => $this->resolution_note,
            'resolverNameAr' => $this->resolver?->name_ar,
            'resolverNameEn' => $this->resolver?->name_en,
            'resolvedAt' => optional($this->resolved_at)->toIso8601String(),
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
