/**
 *  Home URL after sign-in: platform staff start on the super admin overview, client accounts on their dashboard.
 */
const getHomeRoute = user => (user?.kind === 'client' ? '/client' : '/admin')

export default getHomeRoute
