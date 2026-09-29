import { buildAbilityFor } from 'src/configs/acl'
import { currentUser } from 'src/server/session'
import { sendError } from 'src/server/http'

// Server-side permission check for API routes. Returns the user, or sends 401/403 and returns null.
//   const user = await requireAbility(req, res, 'manage', 'tenants')
export const requireAbility = async (req, res, action, subject) => {
  const user = await currentUser(req)
  if (!user) {
    sendError(res, 401, 'unauthenticated')

    return null
  }
  if (!buildAbilityFor(user.role).can(action, subject)) {
    sendError(res, 403, 'forbidden')

    return null
  }

  return user
}
