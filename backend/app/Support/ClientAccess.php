<?php

namespace App\Support;

use App\Models\TenantRole;
use App\Models\User;

// Client (tenant) dashboard permissions. A client user belongs to one client (users.tenant_id) and has one of
// the client role templates (users.role = tenant_roles.key, §10). Their role's matrix decides what they may do:
// "allowed" and "restricted" both let them act, because everything in the client dashboard is already limited
// to their own organisation; "denied" does not.
class ClientAccess
{
    private const RANK = ['denied' => 0, 'restricted' => 1, 'allowed' => 2];

    // Roles a client may never hand out from its own dashboard: platform-wide roles and the anonymous visitor.
    public const NOT_ASSIGNABLE = ['visitor', 'association_supervisor', 'system_admin'];

    public static function role(User $user): ?TenantRole
    {
        if (! $user->tenant_id || Ability::isPlatformRole($user->role)) {
            return null;
        }

        return self::template($user->role);
    }

    // Looked up once per request (and per test) for each role key.
    private static function template(string $key): ?TenantRole
    {
        return once(fn () => TenantRole::where('key', $key)->first());
    }

    public static function isClientUser(User $user): bool
    {
        return self::role($user) !== null;
    }

    /** @return array<string, string> permission => state */
    public static function permissions(User $user): array
    {
        $role = self::role($user);

        return $role ? TenantPermissions::complete($role->permissions ?? []) : [];
    }

    public static function can(User $user, string $permission): bool
    {
        return (self::permissions($user)[$permission] ?? 'denied') !== 'denied';
    }

    // Only "allowed", for things that "restricted" does not cover at all: a restricted `general_settings` (editors,
    // writers) is their own corner of the settings, not the organisation's subscription and invoices.
    public static function allowed(User $user, string $permission): bool
    {
        return (self::permissions($user)[$permission] ?? 'denied') === 'allowed';
    }

    // Who a client user's article may be for (§2): everyone, members, academics, or their own organisation
    // (institutional, or government for a government client). Confidential content stays with the platform.
    public static function classifications(User $user): array
    {
        return ['public', 'members', 'academic', $user->tenant?->type === 'government' ? 'government' : 'institutional'];
    }

    // A client user may give a role only if it grants nothing beyond their own permissions.
    public static function mayAssign(User $user, TenantRole $role): bool
    {
        if (in_array($role->key, self::NOT_ASSIGNABLE, true)) {
            return false;
        }
        $own = self::permissions($user);
        foreach (TenantPermissions::complete($role->permissions ?? []) as $permission => $state) {
            if (self::RANK[$state] > self::RANK[$own[$permission] ?? 'denied']) {
                return false;
            }
        }

        return true;
    }

    // The signed-in user as the browser sees it (login and /auth/me): which dashboard they use and, for client
    // users, their organisation, role and permission matrix (the client sidebar is built from it).
    public static function sessionUser(User $user): array
    {
        $role = self::role($user);
        if (! $role) {
            return $user->toPublicArray() + ['kind' => 'platform'];
        }
        $tenant = $user->tenant;

        return $user->toPublicArray() + [
            'kind' => 'client',
            'roleNameAr' => $role->name_ar,
            'roleNameEn' => $role->name_en,
            'clientPermissions' => self::permissions($user),
            'tenant' => [
                'id' => $tenant->cuid,
                'nameAr' => $tenant->name_ar,
                'nameEn' => $tenant->name_en,
                'type' => $tenant->type,
                'status' => $tenant->status,
            ],
        ];
    }
}
