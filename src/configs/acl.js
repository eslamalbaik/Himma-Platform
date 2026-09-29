import { AbilityBuilder, Ability } from '@casl/ability'

import { PLATFORM_ROLES } from 'src/configs/roles'

export const AppAbility = Ability

// Builds the CASL rules for a role from src/configs/roles.js.
// Unknown roles get no rules, so they can reach nothing.
const defineRulesFor = role => {
  const { can, rules } = new AbilityBuilder(AppAbility)
  const roleDef = PLATFORM_ROLES[role]

  if (roleDef) {
    roleDef.rules.forEach(rule => can(rule.action, rule.subject))
  }

  return rules
}

export const buildAbilityFor = role => {
  return new AppAbility(defineRulesFor(role), {
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
