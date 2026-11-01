// Frame of the smart-card pages opened from a phone: a slim bar with the language switch, the page in one
// narrow column on a cream background, and the Hinnah slogan at the bottom.

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
import Icon from 'src/@core/components/icon'
import { useTextsReady } from 'src/views/site/SiteShell'
import useLanguageToggle from 'src/views/site/useLanguageToggle'
import { AMBER, CREAM } from 'src/views/site/cards/helpers'

const CardFrame = ({ title, description, color = AMBER, children }) => {
  const textsReady = useTextsReady()
  const { t } = useTranslation()
  const language = useLanguageToggle()

  if (!textsReady) return <Spinner />

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: CREAM, color: '#2B1D0E' }}>
      <Head>
        <title>{title ? `${title} | ${t('site.name')}` : t('cards.public.metaTitle')}</title>
        <meta name='description' content={description || t('cards.slogan')} />
        <meta name='theme-color' content={color} />
      </Head>
      <Box
        component='header'
        sx={{ maxWidth: 560, mx: 'auto', px: 4, py: 3, display: 'flex', alignItems: 'center', gap: 2 }}
      >
        <Typography
          component={Link}
          href='/'
          sx={{ fontWeight: 700, color, textDecoration: 'none', letterSpacing: 0.5, flex: 1 }}
        >
          {t('site.name')}
        </Typography>
        <Button
          size='small'
          onClick={language.toggle}
          startIcon={<Icon icon='tabler:language' />}
          sx={{ color, borderRadius: 99 }}
        >
          {language.label}
        </Button>
      </Box>
      <Box component='main' sx={{ maxWidth: 560, mx: 'auto', px: { xs: 4, sm: 0 }, pb: 10 }}>
        {children}
      </Box>
      <Box component='footer' sx={{ textAlign: 'center', px: 4, pb: 8, color: 'rgba(43,29,14,0.6)' }}>
        <Typography variant='body2' sx={{ color: 'inherit', fontWeight: 600 }}>
          {t('cards.slogan')}
        </Typography>
        <Typography variant='caption' sx={{ color: 'inherit' }}>
          {t('cards.public.poweredBy')}
        </Typography>
      </Box>
    </Box>
  )
}

export default CardFrame
