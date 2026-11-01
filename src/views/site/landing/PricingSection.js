// The "plans and prices" section of the public home page. Plans, their order, colours, badges, buttons and
// feature lists are managed in the dashboard (Landing page → Plans); `GET /api/public/landing` returns only
// the visible ones. Texts: `landing.*` in public/locales.

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'

// Card colours per theme. They are brand colours, so they stay the same in light and dark mode.
const THEMES = {
  light: {
    bg: 'background.paper',
    color: 'text.primary',
    muted: 'text.secondary',
    border: theme => `1px solid ${theme.palette.divider}`,
    divider: theme => theme.palette.divider,
    check: 'success.main',
    off: 'text.disabled',
    button: { backgroundColor: '#383838', color: '#fff', '&:hover': { backgroundColor: '#262626' } },
    badge: { backgroundColor: '#383838', color: '#fff' }
  },
  primary: {
    bg: '#5F0118',
    color: '#fff',
    muted: 'rgba(255,255,255,0.8)',
    border: 'none',
    divider: 'rgba(255,255,255,0.25)',
    check: '#fff',
    off: 'rgba(255,255,255,0.5)',
    button: { backgroundColor: '#fff', color: '#5F0118', '&:hover': { backgroundColor: '#FBF3F5' } },
    badge: { backgroundColor: '#E0B25B', color: '#2B1A00' }
  },
  dark: {
    bg: '#383838',
    color: '#fff',
    muted: 'rgba(255,255,255,0.8)',
    border: 'none',
    divider: 'rgba(255,255,255,0.25)',
    check: '#fff',
    off: 'rgba(255,255,255,0.5)',
    button: { backgroundColor: '#fff', color: '#262626', '&:hover': { backgroundColor: '#F4F4F4' } },
    badge: { backgroundColor: '#E0B25B', color: '#2B1A00' }
  }
}

const CURRENCIES_AR = { SAR: 'ر.س', AED: 'د.إ', USD: '$', EGP: 'ج.م', KWD: 'د.ك', QAR: 'ر.ق' }

const pick = (item, key, lang) => (lang === 'en' ? item[`${key}En`] : item[`${key}Ar`]) || item[`${key}Ar`] || ''

const formatNumber = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)

const PlanCard = ({ plan, lang }) => {
  const { t } = useTranslation()
  const style = THEMES[plan.theme] || THEMES.light
  const badge = pick(plan, 'badge', lang)
  const label = pick(plan, 'ctaLabel', lang) || t('landing.pricing.subscribe')
  const url = plan.ctaUrl || '/join'
  const internal = url.startsWith('/')
  const currency = lang === 'en' ? plan.currency : CURRENCIES_AR[plan.currency] || plan.currency
  const free = plan.price === 0

  return (
    <Box
      component='article'
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '28px',
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
        px: 7,
        pt: plan.isFeatured ? 12 : 9,
        pb: plan.isFeatured ? 12 : 9,
        boxShadow: plan.isFeatured
          ? '0 24px 48px -16px rgba(15, 23, 42, 0.35)'
          : '0 8px 24px -12px rgba(15, 23, 42, 0.15)'
      }}
    >
      {badge ? (
        <Box
          sx={{
            position: 'absolute',
            top: -14,
            insetInlineEnd: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 1,
            borderRadius: 99,
            fontSize: '0.78rem',
            fontWeight: 600,
            ...style.badge
          }}
        >
          <Icon icon='tabler:crown' fontSize='0.95rem' />
          {badge}
        </Box>
      ) : null}

      <Typography component='h3' sx={{ fontSize: '1.4rem', fontWeight: 700, color: 'inherit', mb: 2 }}>
        {pick(plan, 'name', lang)}
      </Typography>
      <Typography sx={{ color: style.muted, fontSize: '0.92rem', minHeight: 44, mb: 5 }}>
        {pick(plan, 'description', lang)}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 2, mb: 6, minHeight: 56 }}>
        {free ? (
          <Typography sx={{ fontSize: '2.4rem', fontWeight: 700, lineHeight: 1.1, color: 'inherit' }}>
            {t('landing.pricing.free')}
          </Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: '2.6rem', fontWeight: 700, lineHeight: 1.1, color: 'inherit' }} dir='ltr'>
              {formatNumber(plan.price)}
            </Typography>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, color: 'inherit' }}>{currency}</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: style.muted }}>
              {t(plan.interval === 'monthly' ? 'landing.pricing.perMonth' : 'landing.pricing.perYear')}
            </Typography>
          </>
        )}
      </Box>

      <Button
        {...(internal ? { component: Link, href: url } : { href: url })}
        size='large'
        startIcon={<Icon icon='tabler:bolt' />}
        sx={{ borderRadius: 99, py: 2.5, fontWeight: 600, ...style.button }}
      >
        {label}
      </Button>

      <Box sx={{ borderTop: '1px solid', borderColor: style.divider, mt: 7, pt: 5 }}>
        {(plan.featureGroups || []).map((group, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: style.muted, mb: 2 }}>
              {pick(group, 'title', lang)}
            </Typography>
            <Box component='ul' sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2 }}>
              {group.items.map((item, i) => (
                <Box
                  component='li'
                  key={i}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, fontSize: '0.9rem', lineHeight: 1.6 }}
                >
                  <Box
                    component='span'
                    sx={{ color: item.included ? style.check : style.off, display: 'inline-flex', mt: '3px' }}
                  >
                    <Icon icon={item.included ? 'tabler:check' : 'tabler:x'} fontSize='1rem' />
                  </Box>
                  <Box
                    component='span'
                    sx={item.included ? { color: 'inherit' } : { color: style.off, textDecoration: 'line-through' }}
                  >
                    {pick(item, 'text', lang)}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const PricingSection = ({ data }) => {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const { settings, plans } = data

  return (
    <Box
      id='pricing'
      component='section'
      sx={{
        scrollMarginTop: 64,
        py: { xs: 14, md: 20 },
        px: { xs: 4, md: 6 },
        backgroundColor: 'background.default',
        borderBottom: theme => `1px solid ${theme.palette.divider}`
      }}
    >
      <Box sx={{ mx: 'auto', maxWidth: 1180 }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 10, md: 14 } }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              px: 3,
              py: 1,
              mb: 5,
              borderRadius: 99,
              border: theme => `1px solid ${theme.palette.divider}`,
              backgroundColor: 'background.paper',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <Icon icon='tabler:sparkles' fontSize='1rem' />
            {pick(settings, 'chip', lang)}
          </Box>
          <Typography component='h2' sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, mb: 3 }}>
            {pick(settings, 'title', lang)}
          </Typography>
          {pick(settings, 'subtitle', lang) ? (
            <Typography sx={{ color: 'text.secondary', fontSize: '1.05rem' }}>
              {pick(settings, 'subtitle', lang)}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 6,
            alignItems: 'center',
            gridTemplateColumns: {
              xs: '1fr',
              md: `repeat(${Math.min(plans.length, 2)}, minmax(0, 1fr))`,
              lg: `repeat(${Math.min(plans.length, 3)}, minmax(0, 1fr))`
            }
          }}
        >
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} lang={lang} />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default PricingSection
