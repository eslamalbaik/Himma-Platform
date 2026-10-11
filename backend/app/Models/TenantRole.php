<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use App\Support\TenantPermissions;
use Illuminate\Database\Eloquent\Model;

// A role template for client dashboards (§10): a name, a type (system roles cannot be deleted) and
// a permissions matrix.
class TenantRole extends Model
{
    use HasCuid;

    protected $fillable = ['key', 'name_ar', 'name_en', 'description_ar', 'description_en', 'type', 'permissions', 'sort_order'];

    protected function casts(): array
    {
        return ['permissions' => 'array'];
    }

    public function isSystem(): bool
    {
        return $this->type === 'system';
    }

    public function usersCount(): int
    {
        return User::where('role', $this->key)->count();
    }

    public function toPublicArray(?int $usersCount = null): array
    {
        return [
            'id' => $this->cuid,
            'key' => $this->key,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'descriptionAr' => $this->description_ar,
            'descriptionEn' => $this->description_en,
            'type' => $this->type,
            'permissions' => TenantPermissions::complete($this->permissions ?? []),
            'usersCount' => $usersCount ?? $this->usersCount(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
