// The guest sections of the public home page, laid out like a bold editorial landing page: a big hero with one
// highlighted phrase, a black tagline strip that scrolls, an "about" block with three features, a row of large
// figures, four cards that lead into the site, and a closing call to organizations. Plans and testimonials keep
// their own components (PricingSection, TestimonialsSection).
// Texts: `site.hero.*` and `site.home.*` in public/locales.

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/system'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Utils
import { ink } from 'src/views/site/storyText'

// Section backgrounds: a light grey and a warm sand, darker tones of the same in dark mode.
const greyBg = theme => (theme.palette.mode === 'light' ? '#F7F7F7' : '#1F1F1F')
const sandBg = theme => (theme.palette.mode === 'light' ? '#F1E6D5' : '#2A241B')

const ORG_SIGN_IN = '/login?type=organization'

const Container = ({ children, sx }) => (
  <Box sx={{ mx: 'auto', maxWidth: 1336, px: { xs: 4, md: 6 }, ...sx }}>{children}</Box>
)

// A heavy heading with one highlighted part in the brand colour. `lead` comes first in reading order.
export const BigHeading = ({ lead, em, component = 'h2', sx }) => (
  <Typography
    component={component}
    sx={{
      fontWeight: 800,
      fontSize: { xs: '2.4rem', sm: '3.25rem', md: '4.25rem' },
      lineHeight: 1.1,
      color: ink,
      ...sx
    }}
  >
    {lead}{' '}
    <Box component='span' sx={{ color: 'primary.main', display: 'inline-block' }}>
      {em}
    </Box>
  </Typography>
)

const Kicker = ({ children }) => (
  <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', md: '1.05rem' }, color: 'text.secondary', mb: 4 }}>
    {children}
  </Typography>
)

// The hero picture: Dubai's skyline in a rounded frame. Photos in public/images/landing come from Unsplash (free licence, credits in CREDITS.md there).
const HeroArt = () => (
  <Box
    aria-hidden
    sx={{
      position: 'relative',
      width: '100%',
      maxWidth: { xs: 560, md: 'none' },
      aspectRatio: { xs: '4 / 3', md: '4 / 5' },
      justifySelf: { md: 'end' }
    }}
  >
    <Box
      component='img'
      src='/images/landing/dubai.jpg'
      alt=''
      sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px', display: 'block' }}
    />
  </Box>
)

export const Hero = () => {
  const { t } = useTranslation()

  return (
    <Box component='section' sx={{ overflow: 'hidden' }}>
      <Container
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
          alignItems: 'center',
          gap: { xs: 4, md: 12 },
          py: { xs: 12, md: 16 }
        }}
      >
        <Box sx={{ py: { md: 6 } }}>
          <Kicker>{t('site.hero.kicker')}</Kicker>
          <BigHeading
            component='h1'
            lead={t('site.hero.title')}
            em={t('site.hero.titleEm')}
            sx={{ fontSize: { xs: '2.9rem', sm: '4rem', md: '5rem' }, mb: 6 }}
          />
          <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.3rem' }, color: 'text.secondary', mb: 10, maxWidth: 600 }}>
            {t('site.hero.subtitle')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <Button
              component={Link}
              href='/register'
              variant='contained'
              size='large'
              sx={{ ...pillSx, px: 8, fontSize: '1.05rem' }}
            >
              {t('site.hero.write')}
            </Button>
            <Button
              href='#stories'
              size='large'
              color='secondary'
              endIcon={<Icon icon='tabler:chevron-down' />}
              sx={{ fontSize: '1.05rem', color: ink, textDecoration: 'underline', textUnderlineOffset: 6 }}
            >
              {t('site.hero.cta')}
            </Button>
          </Box>
        </Box>
        <HeroArt />
      </Container>
    </Box>
  )
}

// The RTL style plugin would mirror translateX in Arabic, hence @noflip: the strip itself is always laid out
// left to right. It holds two identical halves; sliding by half its width loops without a jump.
const slide = keyframes`
  from {
    /* @noflip */
    transform: translateX(0);
  }
  to {
    /* @noflip */
    transform: translateX(-50%);
  }
`

export const Marquee = () => {
  const { t } = useTranslation()
  const phrase = t('site.home.marquee')
  const half = Array.from({ length: 6 }, (_, i) => (
    <Box component='span' key={i} sx={{ px: 6, whiteSpace: 'nowrap' }}>
      {phrase}
      <Box component='span' sx={{ color: '#E0B25B', marginInlineStart: 6 }}>
        ✦
      </Box>
    </Box>
  ))

  return (
    <Box
      aria-label={phrase}
      role='marquee'
      sx={{ backgroundColor: '#000', color: '#fff', overflow: 'hidden', py: 3, direction: 'ltr' }}
    >
      <Box
        aria-hidden
        sx={{
          display: 'flex',
          width: 'max-content',
          fontSize: { xs: '1.1rem', md: '1.5rem' },
          animation: `${slide} 40s linear infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        }}
      >
        <Box sx={{ display: 'flex' }}>{half}</Box>
        <Box sx={{ display: 'flex' }}>{half}</Box>
      </Box>
    </Box>
  )
}

const FEATURES = [
  { key: 'write', icon: 'tabler:pencil' },
  { key: 'communities', icon: 'tabler:language' },
  { key: 'orgs', icon: 'tabler:building' }
]

export const AboutSection = () => {
  const { t } = useTranslation()

  return (
    <Box component='section' id='about' sx={{ backgroundColor: greyBg }}>
      <Container sx={{ py: { xs: 14, md: 24 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 6, md: 16 },
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' },
            mb: { xs: 12, md: 18 }
          }}
        >
          <BigHeading lead={t('site.home.about.title')} em={t('site.home.about.titleEm')} />
          <Box>
            <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, lineHeight: 1.8, color: ink, mb: 4 }}>
              {t('site.home.about.text1')}
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, lineHeight: 1.8, color: 'text.secondary' }}>
              {t('site.home.about.text2')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gap: { xs: 8, md: 10 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {FEATURES.map(feature => (
            <Box key={feature.key} sx={{ borderTop: theme => `2px solid ${ink(theme)}`, pt: 6 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: 'primary.main',
                  color: '#fff',
                  mb: 5
                }}
              >
                <Icon icon={feature.icon} fontSize='2rem' />
              </Box>
              <Typography component='h3' sx={{ fontWeight: 700, fontSize: '1.4rem', color: ink, mb: 2 }}>
                {t(`site.home.features.${feature.key}.title`)}
              </Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                {t(`site.home.features.${feature.key}.text`)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}

const formatCount = value => new Intl.NumberFormat('en-US').format(value)

// Real figures of the page's community (stories, issues, sections); a figure that failed to load is left out.
export const StatsSection = ({ stats }) => {
  const { t } = useTranslation()
  const items = [
    { key: 'stories', value: stats.stories },
    { key: 'issues', value: stats.issues },
    { key: 'sections', value: stats.sections }
  ].filter(item => typeof item.value === 'number')
  if (!items.length) return null

  return (
    <Box component='section' sx={{ backgroundColor: sandBg }}>
      <Container sx={{ py: { xs: 14, md: 22 } }}>
        <BigHeading
          lead={t('site.home.stats.title')}
          em={t('site.home.stats.titleEm')}
          sx={{ mb: { xs: 10, md: 14 } }}
        />
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 8, md: 10 },
            gridTemplateColumns: { xs: '1fr', sm: `repeat(${items.length}, 1fr)` }
          }}
        >
          {items.map(item => (
            <Box key={item.key} sx={{ borderInlineStart: theme => `2px solid ${ink(theme)}`, paddingInlineStart: 5 }}>
              <Typography
                sx={{ fontWeight: 800, fontSize: { xs: '3.25rem', md: '4.5rem' }, lineHeight: 1, color: ink, mb: 3 }}
              >
                {formatCount(item.value)}
              </Typography>
              <Typography sx={{ fontSize: '1.1rem', color: ink }}>{t(`site.home.stats.${item.key}`)}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}

const CARDS = [
  { key: 'magazine', href: '/magazine', image: '/images/landing/books.jpg' },
  { key: 'write', href: '/register', image: '/images/landing/writing.jpg' },
  { key: 'orgs', href: '/join', image: '/images/landing/dubai-burj-al-arab.jpg' },
  { key: 'read', href: '#stories', image: '/images/landing/calligraphy.jpg' }
]

export const FocusSection = () => {
  const { t } = useTranslation()

  return (
    <Box component='section'>
      <Container sx={{ py: { xs: 14, md: 22 } }}>
        <BigHeading lead={t('site.home.focus.title')} em={t('site.home.focus.titleEm')} sx={{ mb: 4 }} />
        <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.2rem' }, color: 'text.secondary', mb: { xs: 10, md: 14 } }}>
          {t('site.home.focus.text')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 6,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
          }}
        >
          {CARDS.map(card => (
            <Box
              key={card.key}
              component={card.href.startsWith('#') ? 'a' : Link}
              href={card.href}
              sx={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: '16px',
                overflow: 'hidden',
                '&:hover .focus-art': { transform: 'scale(1.04)' },
                '&:hover .focus-title': { textDecoration: 'underline' }
              }}
            >
              <Box sx={{ borderRadius: '16px', overflow: 'hidden', mb: 5 }}>
                <Box
                  component='img'
                  className='focus-art'
                  src={card.image}
                  alt=''
                  loading='lazy'
                  sx={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform .3s ease'
                  }}
                />
              </Box>
              <Typography
                component='h3'
                className='focus-title'
                sx={{ fontWeight: 700, fontSize: '1.35rem', color: ink, mb: 1.5, textUnderlineOffset: 5 }}
              >
                {t(`site.home.focus.${card.key}.title`)}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{t(`site.home.focus.${card.key}.text`)}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}

export const CtaBand = () => {
  const { t } = useTranslation()
  const auth = useAuth()

  return (
    <Box component='section' sx={{ backgroundColor: greyBg }}>
      <Container sx={{ py: { xs: 14, md: 22 }, textAlign: 'center' }}>
        <BigHeading
          lead={t('site.home.cta.title')}
          em={t('site.home.cta.titleEm')}
          sx={{ mb: 5, fontSize: { xs: '2.2rem', sm: '3rem', md: '3.75rem' } }}
        />
        <Typography
          sx={{ fontSize: { xs: '1.1rem', md: '1.2rem' }, color: 'text.secondary', mb: 10, mx: 'auto', maxWidth: 640 }}
        >
          {t('site.home.cta.text')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <Button component={Link} href='/join' variant='contained' size='large' sx={{ ...pillSx, px: 8 }}>
            {t('site.orgs.join')}
          </Button>
          {!auth.user ? (
            <Button
              component={Link}
              href={ORG_SIGN_IN}
              size='large'
              color='secondary'
              startIcon={<Icon icon='tabler:building' />}
              sx={{ color: ink, textDecoration: 'underline', textUnderlineOffset: 6 }}
            >
              {t('site.orgs.signIn')}
            </Button>
          ) : null}
        </Box>
      </Container>
    </Box>
  )
}
