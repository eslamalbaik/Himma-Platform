<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// An event with an optional live broadcast: draft → scheduled → live → ended, or cancelled before it starts.
class Event extends Model
{
    use HasCuid, HasFactory;

    public const TYPES = ['webinar', 'conference', 'workshop', 'course', 'meeting'];

    public const FORMATS = ['online', 'onsite', 'hybrid'];

    public const VISIBILITIES = ['public', 'members', 'institutional'];

    public const STATUSES = ['draft', 'scheduled', 'live', 'ended', 'cancelled'];

    // Which status each action starts from, and where it leads.
    public const TRANSITIONS = [
        'schedule' => [['draft'], 'scheduled'],
        'start' => [['scheduled'], 'live'],
        'end' => [['live'], 'ended'],
        'cancel' => [['draft', 'scheduled'], 'cancelled'],
    ];

    protected $fillable = [
        'title_ar', 'title_en', 'description_ar', 'description_en', 'type', 'format', 'visibility', 'tenant_id',
        'location', 'starts_at', 'ends_at', 'capacity', 'registration_required', 'is_sponsored',
        'stream_url', 'recording_url', 'status', 'live_started_at', 'live_ended_at', 'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'live_started_at' => 'datetime',
            'live_ended_at' => 'datetime',
            'capacity' => 'integer',
            'registration_required' => 'boolean',
            'is_sponsored' => 'boolean',
        ];
    }

    public function canDo(string $action): bool
    {
        return in_array($this->status, self::TRANSITIONS[$action][0] ?? [], true);
    }

    public function isBroadcast(): bool
    {
        return in_array($this->format, ['online', 'hybrid'], true);
    }

    // Registrations are taken while the event is announced or running.
    public function acceptsRegistrations(): bool
    {
        return $this->registration_required && in_array($this->status, ['scheduled', 'live'], true);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function activeRegistrationsCount(): int
    {
        return $this->registrations()->where('status', '!=', 'cancelled')->count();
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'titleAr' => $this->title_ar,
            'titleEn' => $this->title_en,
            'descriptionAr' => $this->description_ar,
            'descriptionEn' => $this->description_en,
            'type' => $this->type,
            'format' => $this->format,
            'visibility' => $this->visibility,
            'tenantId' => $this->tenant?->cuid,
            'tenantNameAr' => $this->tenant?->name_ar,
            'tenantNameEn' => $this->tenant?->name_en,
            // Where the organiser broadcasts: the client's channel, or none for platform events (they use Settings → YouTube).
            'organiserChannelUrl' => $this->tenant?->youtube_channel_url,
            'location' => $this->location,
            'startsAt' => optional($this->starts_at)->toIso8601String(),
            'endsAt' => optional($this->ends_at)->toIso8601String(),
            'capacity' => $this->capacity,
            'registrationRequired' => $this->registration_required,
            'registrationsCount' => $this->registrations_count ?? null,
            'isSponsored' => $this->is_sponsored,
            'streamUrl' => $this->stream_url,
            'recordingUrl' => $this->recording_url,
            'status' => $this->status,
            'liveStartedAt' => optional($this->live_started_at)->toIso8601String(),
            'liveEndedAt' => optional($this->live_ended_at)->toIso8601String(),
            'cancelReason' => $this->cancel_reason,
        ];
    }
}
