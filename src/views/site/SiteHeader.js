// Top bar of the public site. Guests: write, sign in, get started. Members: search, write and their menu.

// ** React Imports
import { useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import InputBase from '@mui/material/InputBase'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'
import useLanguageToggle from 'src/views/site/useLanguageToggle'

// ** Utils
import { initialOf, ink } from 'src/views/site/storyText'
import { isMemberRole } from 'src/configs/roles'

// Black pill button, Medium-style (inverts in dark mode).
export const pillSx = {
  borderRadius: 99,
  px: 4,
  boxShadow: 'none',
  color: 'background.paper',
  backgroundColor: ink,
  '&:hover': { boxShadow: 'none', backgroundColor: ink, opacity: 0.85 }
}

const SearchBox = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [value, setValue] = useState(typeof router.query.q === 'string' ? router.query.q : '')

  const submit = e => {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? { pathname: '/', query: { q } } : '/')
  }

  return (
    <Box
      component='form'
      role='search'
      onSubmit={submit}
      sx={{
        display: { xs: 'none', sm: 'flex' },
        alignItems: 'center',
        gap: 1.5,
        px: 3,
        height: 40,
        width: 240,
        borderRadius: 99,
        backgroundColor: 'action.hover'
      }}
    >
      <Icon icon='tabler:search' fontSize='1.2rem' />
      <InputBase
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={t('site.search')}
        inputProps={{ 'aria-label': t('site.search') }}
        sx={{ flex: 1, fontSize: '0.9rem' }}
      />
    </Box>
  )
}

const SiteHeader = ({ actions = null }) => {
  const [menuAnchor, setMenuAnchor] = useState(null)
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const language = useLanguageToggle()
  const user = auth.user
  const name = user ? (i18n.language === 'en' ? user.nameEn : user.nameAr) : ''

  // Staff signed in on this browser see a way back to their dashboard instead of the writing tools.
  const isMember = user && isMemberRole(user.role)
  const writeHref = user ? '/write' : '/login?returnUrl=%2Fwrite'

  return (
    <Box
      component='header'
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: theme => theme.zIndex.appBar,
        backgroundColor: 'background.paper',
        borderBottom: theme => `1px solid ${theme.palette.divider}`
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1336,
          height: 64,
          px: { xs: 4, md: 6 },
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        <Box component={Link} href='/' aria-label={t('site.home')} sx={{ display: 'flex', flexShrink: 0 }}>
          <Box component='img' src='/images/logos/hinnah-logo.png' alt='' sx={{ height: 44 }} />
        </Box>
        {user ? <SearchBox /> : null}

        <Box sx={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 3 } }}>
          {actions}
          {!actions && (!user || isMember) ? (
            <Button
              component={Link}
              href={writeHref}
              color='secondary'
              startIcon={<Icon icon='tabler:pencil' />}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary' }}
            >
              {t('site.write')}
            </Button>
          ) : null}
          <Button
            size='small'
            color='secondary'
            onClick={language.toggle}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, color: 'text.secondary', minWidth: 0 }}
          >
            {language.label}
          </Button>

          {user ? (
            <>
              <IconButton
                aria-label={t('site.accountMenu')}
                onClick={e => setMenuAnchor(e.currentTarget)}
                sx={{ p: 0.5 }}
              >
                <Avatar sx={{ width: 34, height: 34, fontSize: '0.95rem', bgcolor: 'primary.main' }}>
                  {initialOf(name)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                PaperProps={{ sx: { minWidth: 230, mt: 1 } }}
              >
                <Box sx={{ px: 4, py: 2 }}>
                  <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                {isMember
                  ? [
                      <MenuItem key='write' component={Link} href='/write' onClick={() => setMenuAnchor(null)}>
                        <Icon icon='tabler:pencil' fontSize='1.1rem' style={{ marginInlineEnd: 10 }} />
                        {t('site.write')}
                      </MenuItem>,
                      <MenuItem key='stories' component={Link} href='/me/stories' onClick={() => setMenuAnchor(null)}>
                        <Icon icon='tabler:notebook' fontSize='1.1rem' style={{ marginInlineEnd: 10 }} />
                        {t('site.myStories')}
                      </MenuItem>
                    ]
                  : [
                      <MenuItem key='dashboard' component={Link} href='/admin' onClick={() => setMenuAnchor(null)}>
                        <Icon icon='tabler:layout-dashboard' fontSize='1.1rem' style={{ marginInlineEnd: 10 }} />
                        {t('site.dashboard')}
                      </MenuItem>
                    ]}
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null)
                    language.toggle()
                  }}
                >
                  <Icon icon='tabler:language' fontSize='1.1rem' style={{ marginInlineEnd: 10 }} />
                  {language.label}
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null)
                    auth.logout()
                  }}
                >
                  <Icon icon='tabler:logout' fontSize='1.1rem' style={{ marginInlineEnd: 10 }} />
                  {t('site.signOut')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                component={Link}
                href='/login'
                color='secondary'
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: ink }}
              >
                {t('site.signIn')}
              </Button>
              <Button component={Link} href='/register' variant='contained' size='small' sx={pillSx}>
                {t('site.getStarted')}
              </Button>
              <IconButton
                aria-label={t('site.menu')}
                onClick={e => setMenuAnchor(e.currentTarget)}
                sx={{ display: { sm: 'none' } }}
              >
                <Icon icon='tabler:dots-vertical' />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem component={Link} href='/login'>
                  {t('site.signIn')}
                </MenuItem>
                <MenuItem component={Link} href={writeHref}>
                  {t('site.write')}
                </MenuItem>
                <MenuItem component={Link} href='/join'>
                  {t('site.orgs.join')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null)
                    language.toggle()
                  }}
                >
                  {language.label}
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default SiteHeader
