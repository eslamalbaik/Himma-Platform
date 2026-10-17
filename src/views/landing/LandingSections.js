// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Utils
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'

// Facts come from REQUIREMENTS.md (§2 access levels, §4 compliance checks, §9 magazine structure).
const facts = [
  { value: '22', label: 'landing.facts.sections' },
  { value: '4', label: 'landing.facts.pillars' },
  { value: '6', label: 'landing.facts.access' },
  { value: '10', label: 'landing.facts.checks' }
]

const audiences = [
  { key: 'teachers', icon: 'tabler:chalkboard' },
  { key: 'researchers', icon: 'tabler:microscope' },
  { key: 'leaders', icon: 'tabler:building-community' },
  { key: 'students', icon: 'tabler:school' },
  { key: 'parents', icon: 'tabler:heart-handshake' },
  { key: 'decisionMakers', icon: 'tabler:chart-dots-3' }
]

const features = [
  { key: 'governance', icon: 'tabler:shield-check' },
  { key: 'compliance', icon: 'tabler:scale' },
  { key: 'access', icon: 'tabler:lock' },
  { key: 'ai', icon: 'tabler:sparkles' },
  { key: 'analytics', icon: 'tabler:chart-bar' },
  { key: 'team', icon: 'tabler:users-group' },
  { key: 'magazine', icon: 'tabler:book' },
  { key: 'audit', icon: 'tabler:history' }
]

const pillars = [
  { key: 'knowledge', icon: 'tabler:bulb', color: 'primary' },
  { key: 'people', icon: 'tabler:users', color: 'info' },
  { key: 'data', icon: 'tabler:chart-pie', color: 'success' },
  { key: 'identity', icon: 'tabler:flag', color: 'warning' }
]

const steps = [
  { key: 'step1', icon: 'tabler:send' },
  { key: 'step2', icon: 'tabler:settings-check' },
  { key: 'step3', icon: 'tabler:pencil' },
  { key: 'step4', icon: 'tabler:trending-up' }
]

export const SectionWrap = ({ id, children, sx }) => (
  <Box component='section' id={id} sx={{ scrollMarginTop: 80, py: { xs: 16, md: 24 }, ...sx }}>
    <Box sx={{ mx: 'auto', maxWidth: 1240, px: { xs: 4, md: 6 } }}>{children}</Box>
  </Box>
)

export const SectionHeading = ({ kicker, title, subtitle, light = false, center = false }) => (
  <Box sx={{ maxWidth: 760, mb: { xs: 10, md: 14 }, ...(center ? { mx: 'auto', textAlign: 'center' } : {}) }}>
    <Typography
      variant='overline'
      sx={{
        fontWeight: 700,
        letterSpacing: 0,
        fontSize: '0.875rem',
        color: light ? 'rgba(255,255,255,.7)' : 'primary.main'
      }}
    >
      {kicker}
    </Typography>
    <Typography
      component='h2'
      sx={{
        mt: 2,
        fontWeight: 700,
        lineHeight: 1.35,
        fontSize: { xs: '1.9rem', md: '2.6rem' },
        color: light ? 'common.white' : 'text.primary'
      }}
    >
      {title}
    </Typography>
    {subtitle ? (
      <Typography
        sx={{ mt: 4, fontSize: '1.1rem', lineHeight: 1.9, color: light ? 'rgba(255,255,255,.75)' : 'text.secondary' }}
      >
        {subtitle}
      </Typography>
    ) : null}
  </Box>
)

const Facts = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Box sx={{ borderBlock: `1px solid ${theme.palette.divider}`, backgroundColor: 'background.default' }}>
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1240,
          px: { xs: 4, md: 6 },
          py: 10,
          display: 'grid',
          gap: 6,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }
        }}
      >
        {facts.map(fact => (
          <Box key={fact.label} sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' }, fontWeight: 700, color: 'primary.main' }}>
              {fact.value}
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>{t(fact.label)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const Audiences = () => {
  const { t } = useTranslation()

  return (
    <SectionWrap>
      <SectionHeading kicker={t('landing.audience.kicker')} title={t('landing.audience.title')} />
      <Box
        sx={{ display: 'grid', gap: 6, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}
      >
        {audiences.map(item => (
          <Box key={item.key} sx={{ display: 'flex', gap: 4 }}>
            <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 46, height: 46, flexShrink: 0 }}>
              <Icon icon={item.icon} fontSize='1.5rem' />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>{t(`landing.audience.${item.key}`)}</Typography>
              <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.8 }}>
                {t(`landing.audience.${item.key}.text`)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </SectionWrap>
  )
}

const Features = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <SectionWrap id='platform' sx={{ backgroundColor: 'background.default' }}>
      <SectionHeading
        kicker={t('landing.features.kicker')}
        title={t('landing.features.title')}
        subtitle={t('landing.features.subtitle')}
      />
      <Box
        sx={{ display: 'grid', gap: 6, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}
      >
        {features.map(item => (
          <Card
            key={item.key}
            sx={{
              height: '100%',
              transition: 'transform .2s ease, box-shadow .2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 16px 36px ${hexToRGBA(theme.palette.primary.main, 0.14)}`
              }
            }}
          >
            <CardContent sx={{ p: theme => `${theme.spacing(6)} !important` }}>
              <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 46, height: 46, mb: 5 }}>
                <Icon icon={item.icon} fontSize='1.5rem' />
              </CustomAvatar>
              <Typography variant='h5' sx={{ mb: 2 }}>
                {t(`landing.features.${item.key}`)}
              </Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                {t(`landing.features.${item.key}.text`)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </SectionWrap>
  )
}

const Compliance = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  const verdicts = [
    { label: 'landing.compliance.green', color: theme.palette.success.main },
    { label: 'landing.compliance.orange', color: theme.palette.warning.main },
    { label: 'landing.compliance.red', color: theme.palette.error.main }
  ]

  return (
    <SectionWrap
      id='compliance'
      sx={{
        color: 'common.white',
        backgroundColor: theme.palette.primary.dark,
        backgroundImage: `radial-gradient(circle at 10% 0%, ${hexToRGBA(
          theme.palette.primary.light,
          0.9
        )}, transparent 55%)`
      }}
    >
      <Box sx={{ display: 'grid', gap: { xs: 10, lg: 16 }, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <Box>
          <SectionHeading
            light
            kicker={t('landing.compliance.kicker')}
            title={t('landing.compliance.title')}
            subtitle={t('landing.compliance.text')}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {verdicts.map(verdict => (
              <Box
                key={verdict.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  px: 4,
                  py: 3,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255,255,255,.07)',
                  borderInlineStart: `4px solid ${verdict.color}`
                }}
              >
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: verdict.color }} />
                <Typography sx={{ color: 'common.white', fontWeight: 500 }}>{t(verdict.label)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ alignSelf: 'center' }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {Array.from({ length: 10 }, (_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  px: 4,
                  py: 3.5,
                  borderRadius: 1,
                  border: '1px solid rgba(255,255,255,.16)'
                }}
              >
                <Typography sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,.55)', minWidth: 22 }}>
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <Typography sx={{ color: 'common.white' }}>{t(`landing.compliance.check${index + 1}`)}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 6, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <Icon icon='tabler:info-circle' color='rgba(255,255,255,.75)' />
            <Typography variant='body2' sx={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.8 }}>
              {t('landing.compliance.note')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </SectionWrap>
  )
}

const Magazine = () => {
  const { t } = useTranslation()

  return (
    <SectionWrap id='magazine'>
      <SectionHeading
        kicker={t('landing.magazine.kicker')}
        title={t('landing.magazine.title')}
        subtitle={t('landing.magazine.subtitle')}
      />
      <Box sx={{ display: 'grid', gap: 6, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {pillars.map((pillar, index) => (
          <Card key={pillar.key} variant='outlined' sx={{ height: '100%' }}>
            <CardContent sx={{ p: theme => `${theme.spacing(6)} !important`, display: 'flex', gap: 5 }}>
              <CustomAvatar
                skin='light'
                color={pillar.color}
                variant='rounded'
                sx={{ width: 52, height: 52, flexShrink: 0 }}
              >
                <Icon icon={pillar.icon} fontSize='1.75rem' />
              </CustomAvatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Typography variant='h5'>{t(`landing.magazine.${pillar.key}`)}</Typography>
                  <Chip size='small' label={`0${index + 1}`} />
                </Box>
                <Typography sx={{ mt: 2, color: 'text.secondary', lineHeight: 1.9 }}>
                  {t(`landing.magazine.${pillar.key}.items`)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </SectionWrap>
  )
}

const HowItWorks = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <SectionWrap sx={{ backgroundColor: 'background.default' }}>
      <SectionHeading center kicker={t('landing.how.kicker')} title={t('landing.how.title')} />
      <Box
        sx={{ display: 'grid', gap: 6, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}
      >
        {steps.map((step, index) => (
          <Box
            key={step.key}
            sx={{
              p: 6,
              borderRadius: 1,
              backgroundColor: 'background.paper',
              borderTop: `3px solid ${theme.palette.primary.main}`
            }}
          >
            <Box sx={{ mb: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Icon icon={step.icon} fontSize='1.75rem' color={theme.palette.primary.main} />
              <Typography sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>0{index + 1}</Typography>
            </Box>
            <Typography variant='h5'>{t(`landing.how.${step.key}`)}</Typography>
            <Typography sx={{ mt: 2, color: 'text.secondary', lineHeight: 1.8 }}>
              {t(`landing.how.${step.key}.text`)}
            </Typography>
          </Box>
        ))}
      </Box>
    </SectionWrap>
  )
}

const QuoteBlock = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <SectionWrap>
      <Box sx={{ maxWidth: 860, mx: 'auto', textAlign: 'center' }}>
        <Icon icon='tabler:quote' fontSize='2.5rem' color={theme.palette.primary.main} />
        <Typography
          component='blockquote'
          sx={{ m: 0, mt: 5, fontWeight: 600, lineHeight: 1.7, fontSize: { xs: '1.5rem', md: '2.1rem' } }}
        >
          {t('landing.quote.text')}
        </Typography>
        <Typography sx={{ mt: 5, color: 'text.secondary' }}>{t('landing.quote.author')}</Typography>
      </Box>
    </SectionWrap>
  )
}

const LandingSections = () => (
  <>
    <Facts />
    <Audiences />
    <Features />
    <Compliance />
    <Magazine />
    <HowItWorks />
    <QuoteBlock />
  </>
)

export default LandingSections
