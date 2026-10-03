<?php

namespace App\Support;

// PHP port of src/configs/acl.js (CASL) — same rule shape as config/roles.php.
class Ability
{
    public static function can(string $role, string $action, string $subject): bool
    {
        $rules = config("roles.platform_roles.$role.rules", []);

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

    public static function isPlatformRole(?string $role): bool
    {
        return $role !== null && array_key_exists($role, config('roles.platform_roles', []));
    }

    public static function label(string $role, string $lang = 'ar'): string
    {
        $lang = $lang === 'en' ? 'en' : 'ar';

        return config("roles.platform_roles.$role.label.$lang", $role);
    }
}
