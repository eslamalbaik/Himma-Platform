// ** React Imports
import { useContext } from 'react'

// ** Component Imports
import { AbilityContext } from 'src/layouts/components/acl/Can'

const CanViewNavLink = props => {
  // ** Props
  const { children, navLink } = props

  // ** Hook
  const ability = useContext(AbilityContext)
  if (navLink && navLink.auth === false) {
    return <>{children}</>
  } else {
    const allowed =
      ability &&
      ability.can(navLink?.action, navLink?.subject) &&
      (!navLink?.requires || ability.can(navLink.requires.action, navLink.requires.subject))

    return allowed ? <>{children}</> : null
  }
}

export default CanViewNavLink
