// Super admin sidebar (sitemap in /mnt/project-files/himma/super-admin-dashboard.md §3).
// `title` is a translation key (public/locales/{ar,en}.json); `subject` matches src/configs/roles.js.

export const adminNavigation = [
  { title: 'nav.overview', icon: 'tabler:smart-home', path: '/admin', action: 'read', subject: 'dashboard' },
  {
    title: 'nav.tenants',
    icon: 'tabler:building-community',
    action: 'read',
    subject: 'tenants',
    children: [
      { title: 'nav.tenants.all', path: '/admin/tenants', action: 'read', subject: 'tenants' },
      { title: 'nav.tenants.requests', path: '/admin/tenants/requests', action: 'read', subject: 'tenants' }
    ]
  },
  {
    title: 'nav.billing',
    icon: 'tabler:credit-card',
    action: 'read',
    subject: 'billing',
    children: [
      { title: 'nav.billing.plans', path: '/admin/billing/plans', action: 'read', subject: 'billing' },
      { title: 'nav.billing.subscriptions', path: '/admin/billing/subscriptions', action: 'read', subject: 'billing' },
      { title: 'nav.billing.invoices', path: '/admin/billing/invoices', action: 'read', subject: 'billing' },
      { title: 'nav.billing.payments', path: '/admin/billing/payments', action: 'read', subject: 'billing' }
    ]
  },
  {
    title: 'nav.content',
    icon: 'tabler:article',
    action: 'read',
    subject: 'content',
    children: [
      { title: 'nav.content.all', path: '/admin/content', action: 'read', subject: 'content' },
      { title: 'nav.content.review', path: '/admin/content/review', action: 'read', subject: 'content' },
      { title: 'nav.content.reports', path: '/admin/content/reports', action: 'read', subject: 'content' },
      { title: 'nav.content.comments', path: '/admin/content/comments', action: 'read', subject: 'content' },
      { title: 'nav.content.withdrawn', path: '/admin/content/withdrawn', action: 'read', subject: 'content' }
    ]
  },
  {
    title: 'nav.events',
    icon: 'tabler:broadcast',
    action: 'read',
    subject: 'events',
    children: [
      { title: 'nav.events.all', path: '/admin/events', action: 'read', subject: 'events' },
      { title: 'nav.events.live', path: '/admin/events/live', action: 'read', subject: 'events' }
    ]
  },
  {
    title: 'nav.magazine',
    icon: 'tabler:book',
    action: 'read',
    subject: 'magazine',
    children: [
      { title: 'nav.magazine.issues', path: '/admin/magazine/issues', action: 'read', subject: 'magazine' },
      { title: 'nav.magazine.taxonomy', path: '/admin/magazine/taxonomy', action: 'read', subject: 'magazine' }
    ]
  },
  {
    title: 'nav.users',
    icon: 'tabler:users',
    action: 'read',
    subject: 'users',
    children: [
      { title: 'nav.users.all', path: '/admin/users', action: 'read', subject: 'users' },
      { title: 'nav.users.writers', path: '/admin/users/writers', action: 'read', subject: 'users' }
    ]
  },
  { title: 'nav.messages', icon: 'tabler:messages', path: '/admin/messages', action: 'read', subject: 'messages' },
  { title: 'nav.aiAgent', icon: 'tabler:robot', path: '/admin/ai-agent', action: 'read', subject: 'ai_agent' },
  {
    title: 'nav.reports',
    icon: 'tabler:chart-bar',
    action: 'read',
    subject: 'reports',
    children: [
      { title: 'nav.reports.revenue', path: '/admin/reports/revenue', action: 'read', subject: 'reports' },
      { title: 'nav.reports.tenants', path: '/admin/reports/tenants', action: 'read', subject: 'reports' },
      { title: 'nav.reports.content', path: '/admin/reports/content', action: 'read', subject: 'reports' },
      { title: 'nav.reports.events', path: '/admin/reports/events', action: 'read', subject: 'reports' },
      { title: 'nav.reports.ai', path: '/admin/reports/ai', action: 'read', subject: 'reports' }
    ]
  },
  {
    title: 'nav.permissions',
    icon: 'tabler:shield-lock',
    action: 'read',
    subject: 'permissions',
    children: [
      {
        title: 'nav.permissions.platformRoles',
        path: '/admin/permissions/platform-roles',
        action: 'read',
        subject: 'permissions'
      },
      {
        title: 'nav.permissions.tenantRoleTemplates',
        path: '/admin/permissions/tenant-role-templates',
        action: 'read',
        subject: 'permissions'
      }
    ]
  },
  {
    // No subject of its own: the group shows when any entry inside is allowed
    // (finance sees only Billing, which needs `manage billing`).
    title: 'nav.settings',
    icon: 'tabler:settings',
    children: [
      { title: 'nav.settings.general', path: '/admin/settings/general', action: 'read', subject: 'settings' },
      { title: 'nav.settings.billing', path: '/admin/settings/billing', action: 'manage', subject: 'billing' },
      { title: 'nav.settings.publishing', path: '/admin/settings/publishing', action: 'read', subject: 'settings' },
      { title: 'nav.settings.ai', path: '/admin/settings/ai', action: 'read', subject: 'settings' },
      { title: 'nav.settings.youtube', path: '/admin/settings/youtube', action: 'read', subject: 'settings' },
      {
        title: 'nav.settings.notifications',
        path: '/admin/settings/notifications',
        action: 'read',
        subject: 'settings'
      },
      { title: 'nav.settings.policies', path: '/admin/settings/policies', action: 'read', subject: 'settings' }
    ]
  },
  { title: 'nav.audit', icon: 'tabler:history', path: '/admin/audit', action: 'read', subject: 'audit' }
]

// Finds the sidebar entry (and its section) for a path, so pages can show their title and check access.
export const findNavItem = path => {
  for (const item of adminNavigation) {
    if (item.path === path) return { item, section: item }
    for (const child of item.children || []) {
      if (child.path === path) return { item: child, section: item }
    }
  }

  return null
}

const navigation = () => adminNavigation

export default navigation
