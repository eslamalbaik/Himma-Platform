// ** React Imports
import { useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import { styled, useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'
import { useSettings } from 'src/@core/hooks/useSettings'

// ** Utils
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'
import getHomeRoute from 'src/layouts/components/acl/getHomeRoute'
import { entityLoginHref } from 'src/configs/landing'

export const landingSections = [
  { id: 'platform', label: 'landing.nav.platform' },
  { id: 'compliance', label: 'landing.nav.compliance' },
  { id: 'magazine', label: 'landing.nav.magazine' },
  { id: 'join', label: 'landing.nav.join' }
]

const NavLink = styled('a')(({ theme }) => ({
  position: 'relative',
  fontWeight: 500,
  textDecoration: 'none',
  color: theme.palette.text.primary,
  transition: 'color .18s ease',
  '&::after': {
    content: '""',
    position: 'absolute',
    insetInlineStart: 0,
    bottom: -6,
    width: 0,
    height: 2,
    backgroundColor: theme.palette.primary.main,
    transition: 'width .18s ease'
  },
  '&:hover': { color: theme.palette.primary.main },
  '&:hover::after': { width: '100%' }
}))

const LandingHeader = () => {
  const [menuAnchor, setMenuAnchor] = useState(null)
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const auth = useAuth()
  const { settings, saveSettings } = useSettings()

  const toggleLanguage = () => {
    const lang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(lang)
    saveSettings({ ...settings, direction: lang === 'en' ? 'ltr' : 'rtl' })
  }

  // Signed-in users go straight to their dashboard instead of signing in again.
  const signIn = auth.user
    ? { href: getHomeRoute(auth.user.role), label: t('landing.dashboard'), icon: 'tabler:layout-dashboard' }
    : { href: entityLoginHref, label: t('landing.entityLogin'), icon: 'tabler:building' }

  return (
    <Box
      component='header'
      sx={{
        position: 'fixed',
        top: 0,
        insetInline: 0,
        zIndex: theme.zIndex.appBar,
        backdropFilter: 'blur(10px)',
        backgroundColor: hexToRGBA(theme.palette.background.paper, 0.88),
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1240,
          height: { xs: 68, md: 80 },
          px: { xs: 4, md: 6 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4
        }}
      >
        <Box component='a' href='#top' aria-label={t('landing.home')} sx={{ display: 'flex', flexShrink: 0 }}>
          <Box component='img' src='/images/logos/hinnah-logo.png' alt='' sx={{ height: { xs: 40, md: 50 } }} />
        </Box>

        <Box component='nav' sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 8 }}>
          {landingSections.map(section => (
            <NavLink key={section.id} href={`#${section.id}`}>
              {t(section.label)}
            </NavLink>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            size='small'
            color='secondary'
            onClick={toggleLanguage}
            startIcon={<Icon icon='tabler:language' />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {t(i18n.language === 'en' ? 'language.ar' : 'language.en')}
          </Button>
          <Button
            component={Link}
            href={signIn.href}
            variant='contained'
            startIcon={<Icon icon={signIn.icon} />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {signIn.label}
          </Button>
          <IconButton
            aria-label={t('landing.menu')}
            onClick={e => setMenuAnchor(e.currentTarget)}
            sx={{ display: { md: 'none' } }}
          >
            <Icon icon='tabler:menu-2' />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            {landingSections.map(section => (
              <MenuItem key={section.id} component='a' href={`#${section.id}`} onClick={() => setMenuAnchor(null)}>
                {t(section.label)}
              </MenuItem>
            ))}
            <MenuItem component={Link} href={signIn.href} sx={{ color: 'primary.main', fontWeight: 600 }}>
              {signIn.label}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                toggleLanguage()
              }}
            >
              {t(i18n.language === 'en' ? 'language.ar' : 'language.en')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  )
}

export default LandingHeader
