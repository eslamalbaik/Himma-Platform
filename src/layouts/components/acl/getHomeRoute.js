/**
 *  Home URL after sign-in: platform staff start on the super admin overview, client users on their
 *  organisation's dashboard.
 */
const getHomeRoute = user => (user?.kind === 'client' ? '/client' : '/admin')

export default getHomeRoute
