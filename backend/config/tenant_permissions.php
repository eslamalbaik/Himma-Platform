<?php

// Permissions a client (tenant) dashboard role can have (REQUIREMENTS.md §10.2), grouped as on the
// roles & permissions screen (docs/roles-permissions-mockup.png). Each cell is allowed, restricted
// (only within the role's own scope, e.g. its own organisation or after review) or denied.
// Texts: tenantPermissions.<group> and tenantPermissions.<permission> in public/locales.

return [
    'states' => ['allowed', 'restricted', 'denied'],

    'groups' => [
        'content' => ['read_public', 'publish', 'comment', 'submit_review', 'approve_publish'],
        'restricted' => ['view_restricted', 'download_restricted'],
        'reports' => ['view_reports', 'entity_reports', 'export_data'],
        'members' => ['manage_entity_members', 'manage_all_members'],
        'settings' => ['general_settings'],
    ],

    // The eight system roles (§10.1) and their default matrix, column by column from the mockup, except
    // where it contradicts the written requirements: visitors read public content (§2, "public: all
    // users"), and accredited writers cannot approve publication (PUB-01).
    // Order of each list: the permission order above.
    'system_roles' => [
        'visitor' => ['allowed', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'],
        'member' => ['allowed', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted', 'denied', 'denied', 'denied', 'denied', 'denied'],
        'writer' => ['allowed', 'restricted', 'allowed', 'allowed', 'denied', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted'],
        'editor' => ['allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'restricted', 'restricted', 'allowed', 'restricted', 'restricted', 'restricted', 'restricted', 'restricted'],
        'institution' => ['allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'restricted', 'allowed', 'allowed', 'allowed', 'allowed'],
        'government' => ['allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed'],
        'association_supervisor' => ['allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed'],
        'system_admin' => ['allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed', 'allowed'],
    ],

    'system_role_names' => [
        'visitor' => ['ar' => 'زائر', 'en' => 'Visitor'],
        'member' => ['ar' => 'عضو فرد', 'en' => 'Individual member'],
        'writer' => ['ar' => 'كاتب معتمد', 'en' => 'Accredited writer'],
        'editor' => ['ar' => 'محرر', 'en' => 'Editor'],
        'institution' => ['ar' => 'مدرسة / مؤسسة', 'en' => 'School / institution'],
        'government' => ['ar' => 'جهة حكومية', 'en' => 'Government entity'],
        'association_supervisor' => ['ar' => 'مشرف الجمعية', 'en' => 'Association supervisor'],
        'system_admin' => ['ar' => 'مسؤول النظام', 'en' => 'System administrator'],
    ],
];
