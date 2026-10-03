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
    ];

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
            'usersCount' => $this->users_count ?? null,
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
