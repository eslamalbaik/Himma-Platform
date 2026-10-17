// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Utils
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'
import { contactEmail, entityLoginHref } from 'src/configs/landing'

export const joinMailto = t => `mailto:${contactEmail}?subject=${encodeURIComponent(t('landing.requestJoin.subject'))}`

// Illustrative numbers for the dashboard preview; they are not live data.
const previewStats = [
  { label: 'landing.mock.published', value: '128', icon: 'tabler:news', color: 'primary' },
  { label: 'landing.mock.inReview', value: '14', icon: 'tabler:clipboard-check', color: 'warning' },
  { label: 'landing.mock.readers', value: '9.4K', icon: 'tabler:eye', color: 'success' }
]

const previewChecks = [
  { label: 'landing.compliance.green', color: 'success' },
  { label: 'landing.compliance.orange', color: 'warning' },
  { label: 'landing.compliance.red', color: 'error' }
]

const DashboardPreview = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Box sx={{ position: 'relative', mx: 'auto', width: '100%', maxWidth: 520 }}>
      <Card sx={{ boxShadow: `0 24px 60px ${hexToRGBA(theme.palette.primary.main, 0.16)}` }}>
        <Box
          sx={{
            px: 5,
            py: 3.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant='h6'>{t('landing.mock.title')}</Typography>
          <Chip size='small' color='success' variant='outlined' label={t('landing.mock.live')} />
        </Box>
        <CardContent sx={{ p: theme => `${theme.spacing(5, 5, 11)} !important` }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {previewStats.map(stat => (
              <Box key={stat.label} sx={{ p: 3, borderRadius: 1, backgroundColor: 'action.hover' }}>
                <CustomAvatar skin='light' color={stat.color} variant='rounded' sx={{ width: 34, height: 34, mb: 2 }}>
                  <Icon icon={stat.icon} fontSize='1.25rem' />
                </CustomAvatar>
                <Typography variant='h5'>{stat.value}</Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                  {t(stat.label)}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 5 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 500 }}>{t('landing.mock.quality')}</Typography>
              <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>87/100</Typography>
            </Box>
            <LinearProgress variant='determinate' value={87} sx={{ height: 8, borderRadius: 4 }} />
          </Box>

          <Box sx={{ mt: 5 }}>
            <Typography sx={{ mb: 2.5, fontWeight: 500 }}>{t('landing.mock.check')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {previewChecks.map(check => (
                <Box key={check.label} sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: `${check.color}.main` }} />
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {t(check.label)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          position: 'absolute',
          bottom: -22,
          insetInlineStart: { xs: 12, sm: -28 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 4,
          py: 3,
          borderRadius: 1,
          color: 'common.white',
          backgroundColor: 'primary.main',
          boxShadow: `0 12px 30px ${hexToRGBA(theme.palette.primary.main, 0.35)}`
        }}
      >
        <Icon icon='tabler:shield-check' />
        <Typography variant='body2' sx={{ color: 'inherit', fontWeight: 600 }}>
          {t('landing.mock.badge')}
        </Typography>
      </Box>
    </Box>
  )
}

const LandingHero = () => {
  const { t } = useTranslation()
  const theme = useTheme()
  const arrow = theme.direction === 'rtl' ? 'tabler:arrow-left' : 'tabler:arrow-right'

  return (
    <Box
      component='section'
      sx={{
        position: 'relative',
        overflow: 'hidden',
        pt: { xs: 32, md: 40 },
        pb: { xs: 20, md: 28 },
        backgroundColor: 'background.paper',
        backgroundImage: `radial-gradient(circle at 85% 10%, ${hexToRGBA(
          theme.palette.primary.main,
          0.1
        )}, transparent 45%), linear-gradient(${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${
          theme.palette.divider
        } 1px, transparent 1px)`,
        backgroundSize: 'auto, 88px 88px, 88px 88px'
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1240,
          px: { xs: 4, md: 6 },
          display: 'grid',
          gap: { xs: 16, lg: 12 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', lg: '1.05fr .95fr' }
        }}
      >
        <Box>
          <Chip
            color='primary'
            variant='outlined'
            icon={<Icon icon='tabler:sparkles' fontSize='1rem' />}
            label={t('landing.hero.eyebrow')}
            sx={{ fontWeight: 500, backgroundColor: 'background.paper' }}
          />
          <Typography
            component='h1'
            sx={{
              mt: 6,
              fontWeight: 700,
              lineHeight: 1.25,
              fontSize: { xs: '2.4rem', sm: '3.2rem', lg: '3.9rem' }
            }}
          >
            {t('landing.hero.titleStart')}{' '}
            <Box component='span' sx={{ display: 'block', color: 'primary.main' }}>
              {t('landing.hero.titleAccent')}
            </Box>
          </Typography>
          <Typography sx={{ mt: 6, maxWidth: 560, fontSize: { xs: '1.05rem', md: '1.2rem' }, lineHeight: 1.9 }}>
            {t('landing.hero.subtitle')}
          </Typography>
          <Box sx={{ mt: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Button size='large' variant='contained' href={joinMailto(t)} endIcon={<Icon icon={arrow} />}>
              {t('landing.requestJoin')}
            </Button>
            <Button
              size='large'
              variant='outlined'
              component={Link}
              href={entityLoginHref}
              startIcon={<Icon icon='tabler:building' />}
            >
              {t('landing.entityLogin')}
            </Button>
          </Box>
          <Box
            sx={{
              mt: 10,
              pt: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              borderTop: `1px solid ${theme.palette.divider}`
            }}
          >
            <Icon icon='tabler:school' color={theme.palette.primary.main} />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {t('landing.hero.trust')}
            </Typography>
          </Box>
        </Box>

        <DashboardPreview />
      </Box>
    </Box>
  )
}

export default LandingHero
