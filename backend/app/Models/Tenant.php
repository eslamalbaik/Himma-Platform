<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

// A client organisation (association, school, institution, government entity).
// Platform staff (super admin team) have no tenant.
class Tenant extends Model
{
    use HasFactory;

    public const TYPES = ['association', 'school', 'institution', 'government'];

    public const STATUSES = ['trial', 'active', 'suspended', 'cancelled'];

    protected $fillable = [
        'cuid',
        'slug',
        'name_ar',
        'name_en',
        'type',
        'status',
        'youtube_channel_url',
        'contact_phone',
        'billing_email',
        'billing_suspended_at',
    ];

    protected function casts(): array
    {
        return ['billing_suspended_at' => 'datetime'];
    }

    // Suspended or cancelled clients cannot sign in to the client dashboard.
    public const INACTIVE_STATUSES = ['suspended', 'cancelled'];

    // Route-model binding and the public API use the cuid, never the numeric id.
    public function getRouteKeyName(): string
    {
        return 'cuid';
    }

    protected static function booted(): void
    {
        static::creating(function (self $tenant) {
            $tenant->cuid ??= (string) Str::ulid();
            $tenant->slug ??= static::uniqueSlugFrom($tenant->name_en ?? $tenant->name_ar ?? $tenant->cuid);
        });
    }

    protected static function uniqueSlugFrom(string $source): string
    {
        $base = Str::slug($source) ?: 'tenant';
        $slug = $base;
        $suffix = 2;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    // The client's own content and events (institutional, or organised by the client).
    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    // Only these fields ever leave the server (mirrors User::toPublicArray()).
    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'slug' => $this->slug,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'type' => $this->type,
            'status' => $this->status,
            'billingEmail' => $this->billing_email,
            'youtubeChannelUrl' => $this->youtube_channel_url,
            'contactPhone' => $this->contact_phone,
            'usersCount' => $this->users_count ?? null,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
