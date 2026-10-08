<?php

namespace App\Models;

use App\Models\Concerns\HasCuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A role offered to clients, members and the public (REQUIREMENTS.md §10, ROL-01..06), with one of three
// states per permission. System roles come from §10.1 and cannot be deleted; owners add custom ones.
class RoleTemplate extends Model
{
    use HasCuid;

    public const TYPES = ['system', 'custom'];

    public const STATES = ['allowed', 'restricted', 'denied'];

    // The permission rows of the matrix, by group (§10.2). Labels: admin.roleTemplates.permission.<key>.
    public const PERMISSION_GROUPS = [
        'content' => ['read_public', 'publish', 'comment', 'submit_review', 'approve_publish'],
        'restricted' => ['view_restricted', 'download_restricted'],
        'reports' => ['view_general_reports', 'view_entity_reports', 'export_data'],
        'members' => ['manage_entity_members', 'manage_all_members'],
        'settings' => ['system_settings'],
    ];

    // System roles in the order of §10.1, with their starting permissions (a = allowed, r = restricted,
    // d = denied), in the order of PERMISSION_GROUPS. Taken from docs/roles-permissions-mockup.png.
    public const SYSTEM_ROLES = [
        'visitor' => ['زائر', 'Visitor', 'adddd dd ddd dd d'],
        'member' => ['عضو فرد', 'Individual member', 'arrrr rr rdd dd d'],
        'writer' => ['كاتب معتمد', 'Accredited writer', 'araad rr rrr dd d'],
        'editor' => ['محرر', 'Editor', 'aaaaa rr aaa rr d'],
        'institution' => ['مدرسة / مؤسسة', 'School / institution', 'aaaaa aa ara ar r'],
        'government' => ['جهة حكومية', 'Government entity', 'aaaaa aa aaa ar r'],
        'association_supervisor' => ['مشرف الجمعية', 'Association supervisor', 'aaaaa aa aaa aa a'],
        'system_admin' => ['مسؤول النظام', 'System administrator', 'aaaaa aa aaa aa a'],
    ];

    // Platform role whose accounts a system role counts (the system administrators are platform owners).
    private const COUNTED_ROLES = ['system_admin' => 'super_admin'];

    protected $fillable = [
        'key', 'name_ar', 'name_en', 'description_ar', 'description_en', 'type', 'permissions', 'sort_order', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['permissions' => 'array', 'sort_order' => 'integer'];
    }

    public static function permissionKeys(): array
    {
        return array_merge(...array_values(self::PERMISSION_GROUPS));
    }

    // 'ad dddd ...' → ['read_public' => 'allowed', 'publish' => 'denied', ...]
    public static function decode(string $states): array
    {
        $letters = str_split(str_replace(' ', '', $states));
        $names = ['a' => 'allowed', 'r' => 'restricted', 'd' => 'denied'];

        return array_combine(self::permissionKeys(), array_map(fn ($letter) => $names[$letter], $letters));
    }

    public static function allDenied(): array
    {
        return array_fill_keys(self::permissionKeys(), 'denied');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Accounts holding this role, or null for roles without accounts (visitors).
    public function usersCount(): ?int
    {
        if ($this->key === 'visitor') {
            return null;
        }

        return User::where('role', self::COUNTED_ROLES[$this->key] ?? $this->key)->count();
    }

    // Every known permission, denied when missing (e.g. a permission added after the role was saved).
    public function states(): array
    {
        return array_intersect_key(($this->permissions ?? []) + self::allDenied(), self::allDenied());
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->cuid,
            'key' => $this->key,
            'nameAr' => $this->name_ar,
            'nameEn' => $this->name_en,
            'descriptionAr' => $this->description_ar,
            'descriptionEn' => $this->description_en,
            'type' => $this->type,
            'permissions' => $this->states(),
            'usersCount' => $this->usersCount(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
            'editorNameAr' => $this->editor?->name_ar,
            'editorNameEn' => $this->editor?->name_en,
        ];
    }
}
