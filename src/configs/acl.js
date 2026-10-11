import { AbilityBuilder, Ability } from '@casl/ability'

import { PLATFORM_ROLES } from 'src/configs/roles'

export const AppAbility = Ability

// Builds the CASL rules for the signed-in user (or a platform role name).
// Platform staff: their role's rules from src/configs/roles.js. Client users (`kind: 'client'`, see
// ClientAccess::sessionUser): `read client` for the client dashboard, plus `<permission> client` for every
// permission of their client role template that is not denied (backend/config/tenant_permissions.php).
// Unknown roles get no rules, so they can reach nothing.
const defineRulesFor = user => {
  const { can, rules } = new AbilityBuilder(AppAbility)

  if (user && typeof user === 'object' && user.kind === 'client') {
    can('read', 'client')
    Object.entries(user.clientPermissions || {}).forEach(([permission, state]) => {
      if (state !== 'denied') can(permission, 'client')
    })

    return rules
  }

  const roleDef = PLATFORM_ROLES[typeof user === 'object' ? user?.role : user]

  if (roleDef) {
    roleDef.rules.forEach(rule => can(rule.action, rule.subject))
  }

  return rules
}

export const buildAbilityFor = user => {
  return new AppAbility(defineRulesFor(user), {
    // https://casl.js.org/v5/en/guide/subject-type-detection
    // @ts-ignore
    detectSubjectType: object => object.type
  })
}

// Pages without their own `acl` (the remaining Vuexy demo pages) stay reachable by the platform owner only.
// Himma admin pages declare their own `acl` with the subject of their sidebar section.
export const defaultACLObj = {
  action: 'manage',
  subject: 'all'
}

export default defineRulesFor
