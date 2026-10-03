<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// Append-only audit trail (REQUIREMENTS.md §6). Application code only ever inserts rows.
class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'cuid',
        'actor_id',
        'actor_email',
        'action',
        'entity_type',
        'entity_id',
        'metadata',
        'ip',
        'user_agent',
        'tenant_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $log) {
            $log->cuid ??= (string) Str::ulid();
            $log->created_at ??= now();
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
