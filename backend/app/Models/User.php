<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public const STATUSES = ['active', 'disabled'];

    protected $fillable = [
        'cuid',
        'handle',
        'bio_ar',
        'bio_en',
        'verified_at',
        'email',
        'password',
        'name_ar',
        'name_en',
        'role',
        'status',
        'locale',
        'token_version',
        'last_login_at',
        'tenant_id',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'verified_at' => 'datetime',
            'token_version' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $user) {
            $user->cuid ??= (string) Str::ulid();
            $user->handle ??= static::uniqueHandleFrom($user->name_en ?: strstr((string) $user->email, '@', true));
        });
    }

    // A public address (`/u/{handle}`): lowercase letters, digits, `_` and `-`, 3 to 30 characters, never taken.
    public static function uniqueHandleFrom(?string $source): string
    {
        $base = substr(Str::slug((string) $source, '-'), 0, 24);
        $base = strlen($base) >= 3 ? $base : 'user';
        $handle = $base;

        while (static::where('handle', $handle)->exists()) {
            $handle = $base.'-'.random_int(100, 99999);
        }

        return $handle;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'actor_id');
    }

    // Only these fields ever leave the server (mirrors the old publicUser() helper).
    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'handle' => $this->handle,
            'verified' => $this->isVerified(),
            'email' => $this->email,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'role' => $this->role,
            'status' => $this->status,
            'locale' => $this->locale,
            'tenantId' => $this->tenant?->cuid,
            'lastLoginAt' => optional($this->last_login_at)->toIso8601String(),
        ];
    }
}
