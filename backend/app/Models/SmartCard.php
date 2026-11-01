<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// A Hinnah smart card: the NFC tag and the printed QR code both open the public page /c/{slug}, so the
// details can change at any time without printing the card again.
class SmartCard extends Model
{
    use HasCuid;

    public const KINDS = ['education', 'government', 'business', 'author'];

    public const STATUSES = ['draft', 'published'];

    public const LINK_TYPES = ['website', 'store', 'email', 'whatsapp', 'x', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'other'];

    public const BOOK_FORMATS = ['print', 'digital', 'both'];

    public const EVENT_TYPES = ['launch', 'seminar', 'meeting', 'signing', 'other'];

    // How the page was opened: ?src=nfc on the tag, ?src=qr in the printed code, anything else is a shared link.
    public const SOURCES = ['nfc' => 'nfc_opens', 'qr' => 'qr_opens'];

    protected $fillable = [
        'slug', 'kind', 'status', 'name_ar', 'name_en', 'headline_ar', 'headline_en', 'bio_ar', 'bio_en',
        'photo_url', 'color', 'email', 'phone', 'publisher_ar', 'publisher_en', 'rights_ar', 'rights_en',
        'links', 'books', 'events', 'accepts_requests', 'newsletter_enabled', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'links' => 'array', 'books' => 'array', 'events' => 'array',
            'accepts_requests' => 'boolean', 'newsletter_enabled' => 'boolean',
            'nfc_opens' => 'integer', 'qr_opens' => 'integer', 'link_opens' => 'integer',
        ];
    }

    public function requests(): HasMany
    {
        return $this->hasMany(SmartCardRequest::class);
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(SmartCardSubscriber::class);
    }

    public function event(string $id): ?array
    {
        return collect($this->events ?? [])->firstWhere('id', $id);
    }

    // What anyone holding the card sees. Counters and staff-only fields stay out.
    public function toPublicArray(): array
    {
        return [
            'slug' => $this->slug,
            'kind' => $this->kind,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'headlineAr' => $this->headline_ar,
            'headlineEn' => $this->headline_en,
            'bioAr' => $this->bio_ar,
            'bioEn' => $this->bio_en,
            'photoUrl' => $this->photo_url,
            'color' => $this->color,
            'email' => $this->email,
            'phone' => $this->phone,
            'publisherAr' => $this->publisher_ar,
            'publisherEn' => $this->publisher_en,
            'rightsAr' => $this->rights_ar,
            'rightsEn' => $this->rights_en,
            'links' => $this->links ?? [],
            'books' => $this->books ?? [],
            'events' => $this->events ?? [],
            'acceptsRequests' => $this->accepts_requests,
            'newsletterEnabled' => $this->newsletter_enabled,
        ];
    }

    public function toAdminArray(): array
    {
        return ['id' => $this->cuid, 'status' => $this->status] + $this->toPublicArray() + [
            'opens' => ['nfc' => $this->nfc_opens, 'qr' => $this->qr_opens, 'link' => $this->link_opens],
            'newRequests' => (int) ($this->new_requests_count ?? $this->requests()->where('status', 'new')->count()),
            'subscribers' => (int) ($this->subscribers_count ?? $this->subscribers()->count()),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
