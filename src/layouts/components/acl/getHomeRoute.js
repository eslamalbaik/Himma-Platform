import { isMemberRole } from 'src/configs/roles'

/**
 *  Home URL after sign-in: members (individuals and organizations' users) go to the reading site,
 *  staff to the dashboard.
 */
const getHomeRoute = role => (isMemberRole(role) ? '/' : '/admin')

export default getHomeRoute
