// ** React Imports
import { useContext } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Context Imports
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Navigation
import { findNavItem } from 'src/navigation/vertical'

// ** Views
import SectionPlaceholder from 'src/views/admin/SectionPlaceholder'
import AdminMessage from 'src/views/admin/AdminMessage'

// Every super admin sidebar entry that has no dedicated page yet lands here.
// Access is checked against the entry's own subject from src/configs/roles.js.
const AdminSectionPage = () => {
  const router = useRouter()
  const ability = useContext(AbilityContext)

  const path = `/admin/${[].concat(router.query.slug || []).join('/')}`
  const match = findNavItem(path)

  if (!router.isReady) return null
  if (!match) return <AdminMessage messageKey='errors.not_found' icon='tabler:map-off' />
  const { requires } = match.item
  if (
    !ability?.can(match.item.action, match.item.subject) ||
    (requires && !ability.can(requires.action, requires.subject))
  )
    return <AdminMessage messageKey='errors.forbidden' icon='tabler:lock' />

  return <SectionPlaceholder title={match.item.title} sectionTitle={match.section.title} icon={match.section.icon} />
}

AdminSectionPage.acl = {
  action: 'read',
  subject: 'dashboard'
}

export default AdminSectionPage
