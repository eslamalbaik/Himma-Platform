import { AbilityBuilder, Ability } from '@casl/ability'

import { PLATFORM_ROLES } from 'src/configs/roles'

export const AppAbility = Ability

// Client dashboard subjects. `client_basic` (home, profile, account, billing) stays open to a client suspended for
// unpaid invoices; `client` (every other client section) needs a client in good standing. Mirrors the
// `client` / `client:full` guards of /api/client/*.
export const CLIENT_SUBJECTS = ['client_basic', 'client']

// Builds the CASL rules for a signed-in user: platform staff from their role in src/configs/roles.js, client
// accounts from the client dashboard subjects. Unknown roles get no rules, so they can reach nothing.
const defineRulesFor = user => {
  const { can, cannot, rules } = new AbilityBuilder(AppAbility)

  if (user?.kind === 'client') {
    can('manage', 'client_basic')
    if (!user.tenant?.billingSuspended) can('manage', 'client')

    return rules
  }

  const roleDef = PLATFORM_ROLES[user?.role]
  if (roleDef) {
    roleDef.rules.forEach(rule => can(rule.action, rule.subject))
  }
  // Staff never use the client dashboard, not even the owner with `manage all`.
  cannot('manage', CLIENT_SUBJECTS)

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
