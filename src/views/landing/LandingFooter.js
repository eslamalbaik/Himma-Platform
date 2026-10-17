// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import { joinMailto } from 'src/views/landing/LandingHero'
import { landingSections } from 'src/views/landing/LandingHeader'

// ** Config
import { contactEmail, entityLoginHref } from 'src/configs/landing'

const LandingFooter = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <>
      <Box
        component='section'
        id='join'
        sx={{
          scrollMarginTop: 80,
          position: 'relative',
          overflow: 'hidden',
          color: 'common.white',
          backgroundColor: 'primary.main'
        }}
      >
        <Box
          aria-hidden='true'
          sx={{
            position: 'absolute',
            insetInline: 0,
            top: { xs: 20, md: -40 },
            textAlign: 'center',
            fontWeight: 800,
            lineHeight: 1,
            fontSize: { xs: '10rem', md: '18rem' },
            color: 'rgba(255,255,255,.05)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          هنّة
        </Box>
        <Box
          sx={{
            position: 'relative',
            mx: 'auto',
            maxWidth: 820,
            px: 4,
            py: { xs: 20, md: 28 },
            textAlign: 'center'
          }}
        >
          <Typography
            variant='overline'
            sx={{ fontWeight: 700, letterSpacing: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,.7)' }}
          >
            {t('landing.cta.kicker')}
          </Typography>
          <Typography
            component='h2'
            sx={{
              mt: 3,
              fontWeight: 700,
              lineHeight: 1.35,
              fontSize: { xs: '2rem', md: '3rem' },
              color: 'common.white'
            }}
          >
            {t('landing.cta.title')}
          </Typography>
          <Typography sx={{ mt: 5, fontSize: '1.15rem', lineHeight: 1.9, color: 'rgba(255,255,255,.8)' }}>
            {t('landing.cta.text')}
          </Typography>
          <Box sx={{ mt: 10, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
            <Button
              size='large'
              variant='contained'
              href={joinMailto(t)}
              startIcon={<Icon icon='tabler:mail' />}
              sx={{
                color: 'primary.main',
                backgroundColor: 'common.white',
                '&:hover': { backgroundColor: 'grey.100' }
              }}
            >
              {t('landing.requestJoin')}
            </Button>
            <Button
              size='large'
              variant='outlined'
              component={Link}
              href={entityLoginHref}
              startIcon={<Icon icon='tabler:building' />}
              sx={{
                color: 'common.white',
                borderColor: 'rgba(255,255,255,.5)',
                '&:hover': { borderColor: 'common.white', backgroundColor: 'rgba(255,255,255,.08)' }
              }}
            >
              {t('landing.entityLogin')}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component='footer'
        sx={{ backgroundColor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}` }}
      >
        <Box
          sx={{
            mx: 'auto',
            maxWidth: 1240,
            px: { xs: 4, md: 6 },
            py: 10,
            display: 'grid',
            gap: 8,
            alignItems: 'end',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' }
          }}
        >
          <Box>
            <Box component='img' src='/images/logos/hinnah-logo.png' alt='' sx={{ height: 46 }} />
            <Typography sx={{ mt: 3, maxWidth: 380, color: 'text.secondary', lineHeight: 1.8 }}>
              {t('landing.footer.tagline')}
            </Typography>
          </Box>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: { xs: 'flex-start', md: 'flex-end' } }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {landingSections.map(section => (
                <Typography
                  key={section.id}
                  component='a'
                  href={`#${section.id}`}
                  sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                >
                  {t(section.label)}
                </Typography>
              ))}
              <Typography
                component='a'
                href={`mailto:${contactEmail}`}
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                {t('landing.footer.contact')}
              </Typography>
              <Typography
                component={Link}
                href='/login'
                sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
              >
                {t('landing.footer.staff')}
              </Typography>
            </Box>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {t('landing.footer.rights', { year: new Date().getFullYear() })}
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  )
}

export default LandingFooter
