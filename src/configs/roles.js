// Platform (super admin) roles and what each can do.
// Shared by the browser (menu visibility, page guards) and the API (server-side checks).
// Source: /mnt/project-files/himma/super-admin-dashboard.md §8.1.
//
// Subjects map to the super admin sidebar sections (src/navigation/vertical/index.js).
// Actions follow CASL: read, create, update, delete, manage (= everything).

export const SUBJECTS = [
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
  'ai_agent'
]

export const PLATFORM_ROLES = {
  super_admin: {
    label: { ar: 'مالك المنصة', en: 'Platform Owner' },
    rules: [{ action: 'manage', subject: 'all' }]
  },
  sales_manager: {
    label: { ar: 'مدير العملاء والمبيعات', en: 'Clients & Sales Manager' },
    rules: [
      { action: 'read', subject: 'dashboard' },
      { action: 'manage', subject: 'tenants' },
      { action: ['read', 'create'], subject: 'billing' },
      { action: 'read', subject: 'users' },
      { action: 'manage', subject: 'messages' },
      { action: 'read', subject: 'reports' }
    ]
  },
  finance: {
    label: { ar: 'المسؤول المالي', en: 'Finance' },
    rules: [
      { action: 'read', subject: 'dashboard' },
      { action: 'read', subject: 'tenants' },
      { action: 'manage', subject: 'billing' },
      { action: 'read', subject: 'reports' }
    ]
  },
  platform_editor: {
    label: { ar: 'محرر المنصة', en: 'Platform Editor' },
    rules: [
      { action: 'read', subject: 'dashboard' },
      { action: 'read', subject: 'tenants' },
      { action: 'manage', subject: 'content' },
      { action: 'manage', subject: 'events' },
      { action: 'manage', subject: 'magazine' },
      { action: 'read', subject: 'users' },
      { action: 'manage', subject: 'messages' },
      { action: 'read', subject: 'reports' }
    ]
  },
  broadcast_moderator: {
    label: { ar: 'مشرف البث', en: 'Broadcast Moderator' },
    rules: [
      { action: 'read', subject: 'dashboard' },
      { action: ['read', 'update'], subject: 'events' }
    ]
  },
  support: {
    label: { ar: 'الدعم الفني', en: 'Support' },
    rules: [
      { action: 'read', subject: 'dashboard' },
      { action: 'read', subject: 'tenants' },
      { action: 'read', subject: 'billing' },
      { action: 'read', subject: 'content' },
      { action: ['read', 'update'], subject: 'users' },
      { action: 'manage', subject: 'messages' }
    ]
  },
  auditor: {
    label: { ar: 'المدقق / حماية البيانات', en: 'Auditor / Data Protection' },
    rules: [
      { action: 'read', subject: SUBJECTS.filter(s => s !== 'settings') },
      { action: 'manage', subject: 'audit' }
    ]
  }
}

// Readers and writers on the public site (they sign in at /login, never /admin/login). Mirrors
// `member_roles` in backend/config/roles.php.
const STORY_WRITER = [{ action: 'manage', subject: 'stories' }]

export const MEMBER_ROLES = {
  member: { label: { ar: 'عضو فرد', en: 'Individual member' }, rules: STORY_WRITER },
  tenant_admin: { label: { ar: 'مسؤول الجهة', en: 'Organization admin' }, rules: STORY_WRITER },
  tenant_member: { label: { ar: 'عضو جهة', en: 'Organization member' }, rules: STORY_WRITER }
}

export const isPlatformRole = role => Object.prototype.hasOwnProperty.call(PLATFORM_ROLES, role)

export const isMemberRole = role => Object.prototype.hasOwnProperty.call(MEMBER_ROLES, role)

export const roleLabel = (role, lang = 'ar') =>
  (PLATFORM_ROLES[role] ?? MEMBER_ROLES[role])?.label[lang === 'en' ? 'en' : 'ar'] ?? role
