// Client (tenant) dashboard sidebar. `title` is a translation key (public/locales/{ar,en}.json). The subject is
// always `client`; the action is `read` (every client user), a permission of the user's client role template
// (backend/config/tenant_permissions.php) or `<permission>:allowed` when "restricted" is not enough (the API's
// `tperm:<permission>,allowed`), see buildAbilityFor in src/configs/acl.js.

export const clientNavigation = [
  { title: 'client.nav.home', icon: 'tabler:smart-home', path: '/client', action: 'read', subject: 'client' },
  {
    title: 'client.nav.articles',
    icon: 'tabler:article',
    path: '/client/articles',
    action: 'publish',
    subject: 'client'
  },
  {
    title: 'client.nav.members',
    icon: 'tabler:users',
    path: '/client/members',
    action: 'manage_entity_members',
    subject: 'client'
  },
  {
    title: 'client.nav.billing',
    icon: 'tabler:credit-card',
    path: '/client/billing',
    action: 'general_settings:allowed',
    subject: 'client'
  }
]
