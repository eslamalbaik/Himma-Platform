<?php

// Platform (super admin) roles and what each can do.
// Ported 1:1 from the Next.js prototype's src/configs/roles.js.
// Subjects map to the super admin sidebar sections. Actions: read, create, update, delete, manage (= everything).

return [
    'subjects' => [
        'dashboard',
        'tenants',
        'billing',
        'content',
        'events',
        'magazine',
        'users',
        'messages',
        'reports',
        'permissions',
        'settings',
        'audit',
        'ai_agent',
    ],

    'platform_roles' => [
        'super_admin' => [
            'label' => ['ar' => 'مالك المنصة', 'en' => 'Platform Owner'],
            'rules' => [
                ['action' => 'manage', 'subject' => 'all'],
            ],
        ],
        'sales_manager' => [
            'label' => ['ar' => 'مدير العملاء والمبيعات', 'en' => 'Clients & Sales Manager'],
            'rules' => [
                ['action' => 'read', 'subject' => 'dashboard'],
                ['action' => 'manage', 'subject' => 'tenants'],
                ['action' => ['read', 'create'], 'subject' => 'billing'],
                ['action' => 'read', 'subject' => 'users'],
                ['action' => 'manage', 'subject' => 'messages'],
                ['action' => 'read', 'subject' => 'reports'],
            ],
        ],
        'finance' => [
            'label' => ['ar' => 'المسؤول المالي', 'en' => 'Finance'],
            'rules' => [
                ['action' => 'read', 'subject' => 'dashboard'],
                ['action' => 'read', 'subject' => 'tenants'],
                ['action' => 'manage', 'subject' => 'billing'],
                ['action' => 'read', 'subject' => 'reports'],
            ],
        ],
        'platform_editor' => [
            'label' => ['ar' => 'محرر المنصة', 'en' => 'Platform Editor'],
            'rules' => [
                ['action' => 'read', 'subject' => 'dashboard'],
                ['action' => 'read', 'subject' => 'tenants'],
                ['action' => 'manage', 'subject' => 'content'],
                ['action' => 'manage', 'subject' => 'events'],
                ['action' => 'manage', 'subject' => 'magazine'],
                ['action' => 'read', 'subject' => 'users'],
                ['action' => 'manage', 'subject' => 'messages'],
                ['action' => 'read', 'subject' => 'reports'],
            ],
        ],
        'broadcast_moderator' => [
            'label' => ['ar' => 'مشرف البث', 'en' => 'Broadcast Moderator'],
            'rules' => [
                ['action' => 'read', 'subject' => 'dashboard'],
                ['action' => ['read', 'update'], 'subject' => 'events'],
            ],
        ],
        'support' => [
            'label' => ['ar' => 'الدعم الفني', 'en' => 'Support'],
            'rules' => [
                ['action' => 'read', 'subject' => 'dashboard'],
                ['action' => 'read', 'subject' => 'tenants'],
                ['action' => 'read', 'subject' => 'billing'],
                ['action' => 'read', 'subject' => 'content'],
                ['action' => ['read', 'update'], 'subject' => 'users'],
                ['action' => 'manage', 'subject' => 'messages'],
            ],
        ],
        'auditor' => [
            'label' => ['ar' => 'المدقق / حماية البيانات', 'en' => 'Auditor / Data Protection'],
            'rules' => [
                ['action' => 'read', 'subject' => [
                    'dashboard', 'tenants', 'billing', 'content', 'events', 'magazine',
                    'users', 'messages', 'reports', 'permissions', 'audit', 'ai_agent',
                ]],
                ['action' => 'manage', 'subject' => 'audit'],
            ],
        ],
    ],

    // Readers and writers on the public site (`/login`, never `/admin/login`): individuals who signed up
    // themselves (`member`) and the users of a client organization. They write stories (their own articles),
    // which go through the same editorial review as staff articles.
    'member_roles' => [
        'member' => [
            'label' => ['ar' => 'عضو فرد', 'en' => 'Individual member'],
            'rules' => [
                ['action' => 'manage', 'subject' => 'stories'],
            ],
        ],
        'tenant_admin' => [
            'label' => ['ar' => 'مسؤول الجهة', 'en' => 'Organization admin'],
            'rules' => [
                ['action' => 'manage', 'subject' => 'stories'],
            ],
        ],
        'tenant_member' => [
            'label' => ['ar' => 'عضو جهة', 'en' => 'Organization member'],
            'rules' => [
                ['action' => 'manage', 'subject' => 'stories'],
            ],
        ],
    ],
];
