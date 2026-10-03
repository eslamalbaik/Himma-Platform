<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory;

    public const STATUSES = ['active', 'disabled'];

    protected $fillable = [
        'cuid',
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
            'token_version' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $user) {
            $user->cuid ??= (string) Str::ulid();
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
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
