// The dashboard's language community switcher (top bar, /admin pages, staff only). The community is the path's
// language: the English community's dashboard is `/en/admin/...`, in English. It takes the language menu's
// place there. Staff limited to one community see it without a choice and are kept on its path.
// See src/configs/community.js.

// ** React Imports
import { useEffect } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Config & Hooks
import { COMMUNITIES } from 'src/configs/community'
import { isPlatformRole } from 'src/configs/roles'
import { useAuth } from 'src/hooks/useAuth'

// A full page load, so every list on the page loads again for the other community.
const openIn = (community, asPath) => window.location.assign(`${community === 'en' ? '/en' : ''}${asPath}`)

export const showsCommunitySwitcher = (user, pathname) =>
  Boolean(user) && isPlatformRole(user.role) && pathname.startsWith('/admin')

const CommunitySwitcher = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const shown = showsCommunitySwitcher(user, router.pathname)
  const limitedTo = shown ? user.community : null

  useEffect(() => {
    if (limitedTo && router.locale !== limitedTo) openIn(limitedTo, router.asPath)
  }, [limitedTo, router.locale, router.asPath])

  if (!shown) return null

  if (limitedTo) {
    return <Chip size='small' color='primary' variant='tonal' label={t(`community.${limitedTo}`)} sx={{ mx: 2 }} />
  }

  return (
    <CustomTextField
      select
      size='small'
      value={router.locale}
      onChange={event => openIn(event.target.value, router.asPath)}
      aria-label={t('community.switcher')}
      sx={{ mx: 2, minWidth: 150 }}
    >
      {COMMUNITIES.map(community => (
        <MenuItem key={community} value={community}>
          {t(`community.${community}`)}
        </MenuItem>
      ))}
    </CustomTextField>
  )
}

export default CommunitySwitcher
