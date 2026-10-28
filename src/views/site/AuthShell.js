// Frame of the members' sign-in, sign-up and organization join pages: logo, language switch, a big serif
// title and the form, centred on the page.

// ** Next Import
import Head from 'next/head'
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import Spinner from 'src/@core/components/spinner'
import { useTextsReady } from 'src/views/site/SiteShell'
import useLanguageToggle from 'src/views/site/useLanguageToggle'

// ** Utils
import { serifFont, ink } from 'src/views/site/storyText'

const AuthShell = ({ title, subtitle, maxWidth = 420, children }) => {
  const textsReady = useTextsReady()
  const { t, i18n } = useTranslation()
  const language = useLanguageToggle()

  if (!textsReady) return <Spinner />

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper' }}>
      <Head>
        <title>{`${title} | ${t('site.name')}`}</title>
      </Head>
      <Box
        sx={{
          px: { xs: 4, md: 6 },
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box component={Link} href='/' aria-label={t('site.home')} sx={{ display: 'flex' }}>
          <Box component='img' src='/images/logos/hinnah-logo.png' alt='' sx={{ height: 44 }} />
        </Box>
        <Button size='small' color='secondary' onClick={language.toggle} sx={{ color: 'text.secondary' }}>
          {language.label}
        </Button>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 4, py: 10 }}>
        <Box sx={{ width: '100%', maxWidth }}>
          <Typography
            component='h1'
            sx={{
              fontFamily: serifFont(i18n.language),
              fontSize: { xs: '2rem', sm: '2.5rem' },
              fontWeight: 500,
              color: ink,
              textAlign: 'center',
              mb: 3
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', mb: 8 }}>{subtitle}</Typography>
          ) : null}
          {children}
        </Box>
      </Box>
    </Box>
  )
}

// "Question? Link" line under a form.
export const AuthSwitch = ({ text, href, label }) => (
  <Typography sx={{ textAlign: 'center', mt: 6, color: 'text.secondary' }}>
    {text}{' '}
    <Typography component={Link} href={href} sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}>
      {label}
    </Typography>
  </Typography>
)

export default AuthShell
