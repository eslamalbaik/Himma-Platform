<?php

namespace App\Support;

// PHP port of src/configs/acl.js (CASL) — same rule shape as config/roles.php.
class Ability
{
    public static function can(string $role, string $action, string $subject): bool
    {
        $rules = config("roles.platform_roles.$role.rules") ?? config("roles.member_roles.$role.rules", []);

        foreach ($rules as $rule) {
            $subjects = (array) $rule['subject'];
            $actions = (array) $rule['action'];

            $subjectMatches = in_array('all', $subjects, true) || in_array($subject, $subjects, true);
            $actionMatches = in_array('manage', $actions, true) || in_array($action, $actions, true);

            if ($subjectMatches && $actionMatches) {
                return true;
            }
        }

        return false;
    }

    // Staff: signs in at /admin/login and works in the dashboard.
    public static function isPlatformRole(?string $role): bool
    {
        return $role !== null && array_key_exists($role, config('roles.platform_roles', []));
    }

    // Readers and writers: sign in at /login and use the public site.
    public static function isMemberRole(?string $role): bool
    {
        return $role !== null && array_key_exists($role, config('roles.member_roles', []));
    }

    public static function label(string $role, string $lang = 'ar'): string
    {
        $lang = $lang === 'en' ? 'en' : 'ar';

        return config("roles.platform_roles.$role.label.$lang")
            ?? config("roles.member_roles.$role.label.$lang", $role);
    }
}
