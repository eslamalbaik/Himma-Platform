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

    // Client (tenant) accounts belong to a client and use the client dashboard; platform staff have no client.
    public function isClient(): bool
    {
        return $this->tenant_id !== null;
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
            // Which dashboard the account uses, and for client accounts what the client dashboard needs to know.
            'kind' => $this->isClient() ? 'client' : 'platform',
            'tenant' => $this->isClient() && $this->tenant ? [
                'id' => $this->tenant->cuid,
                'nameAr' => $this->tenant->name_ar,
                'nameEn' => $this->tenant->name_en,
                'type' => $this->tenant->type,
                'status' => $this->tenant->status,
                'billingSuspended' => $this->tenant->billing_suspended_at !== null,
            ] : null,
        ];
    }
}
