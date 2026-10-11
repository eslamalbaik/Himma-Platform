<?php

namespace App\Support;

// The client-dashboard permission catalogue (config/tenant_permissions.php).
class TenantPermissions
{
    /** @return string[] every permission key, in screen order */
    public static function keys(): array
    {
        return array_merge(...array_values(config('tenant_permissions.groups')));
    }

    public static function states(): array
    {
        return config('tenant_permissions.states');
    }

    // A full matrix for one role: every permission present, unknown keys dropped, missing ones denied.
    public static function complete(array $permissions): array
    {
        $matrix = [];
        foreach (self::keys() as $key) {
            $state = $permissions[$key] ?? 'denied';
            $matrix[$key] = in_array($state, self::states(), true) ? $state : 'denied';
        }

        return $matrix;
    }

    /** @return array<string, array<string, string>> system role key => matrix */
    public static function systemDefaults(): array
    {
        $keys = self::keys();
        $defaults = [];
        foreach (config('tenant_permissions.system_roles') as $role => $states) {
            $defaults[$role] = array_combine($keys, $states);
        }

        return $defaults;
    }
}
