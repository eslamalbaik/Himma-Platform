// Client (tenant) dashboard sidebar. `title` is a translation key (public/locales/{ar,en}.json). The subject is
// always `client`; the action is `read` (every client user) or a permission of the user's client role template
// (backend/config/tenant_permissions.php), see buildAbilityFor in src/configs/acl.js.

export const clientNavigation = [
  { title: 'client.nav.home', icon: 'tabler:smart-home', path: '/client', action: 'read', subject: 'client' },
  {
    title: 'client.nav.members',
    icon: 'tabler:users',
    path: '/client/members',
    action: 'manage_entity_members',
    subject: 'client'
  }
]
