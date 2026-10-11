// ** React Imports
import { useContext } from 'react'

// ** Component Imports
import { AbilityContext } from 'src/layouts/components/acl/Can'
import { canSeeNavItem } from 'src/navigation/vertical'

const CanViewNavLink = props => {
  // ** Props
  const { children, navLink } = props

  // ** Hook
  const ability = useContext(AbilityContext)
  if (navLink && navLink.auth === false) {
    return <>{children}</>
  } else {
    return navLink && canSeeNavItem(ability, navLink) ? <>{children}</> : null
  }
}

export default CanViewNavLink
