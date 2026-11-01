// Student opinions in two rows that drift in opposite directions (first row to the left, second to the right).
// Managed in the dashboard (Landing page → Testimonials); `GET /api/public/landing` returns the visible ones.

// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/system'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'

// The RTL style plugin would mirror translateX in Arabic, hence @noflip: the strip itself is always laid out
// left to right.
// The strip holds two identical copies side by side; sliding it by half its width loops without a jump.
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

const pick = (item, key, lang) => (lang === 'en' ? item[`${key}En`] : item[`${key}Ar`]) || item[`${key}Ar`] || ''

const initialOf = name => (name || '?').trim().charAt(0).toUpperCase()

const Stars = ({ rating }) => (
  <Box sx={{ display: 'flex', gap: 0.5, mb: 3 }} aria-label={`${rating}/5`}>
    {[1, 2, 3, 4, 5].map(n => (
      <Icon
        key={n}
        icon='tabler:star-filled'
        fontSize='1.05rem'
        style={{ color: n <= rating ? '#E0B25B' : 'rgba(255,255,255,0.18)' }}
      />
    ))}
  </Box>
)

const Card = ({ item, lang }) => {
  const author = pick(item, 'author', lang)

  return (
    <Box
      component='figure'
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      sx={{
        m: 0,
        flex: '0 0 auto',
        width: { xs: 270, md: 340 },
        minHeight: 172,
        p: 4.5,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.045)',
        color: '#fff'
      }}
    >
      <Stars rating={item.rating} />
      <Typography
        component='blockquote'
        sx={{ m: 0, flex: 1, fontSize: '0.9rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.88)' }}
      >
        “{pick(item, 'quote', lang)}”
      </Typography>
      <Box
        component='figcaption'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          mt: 3,
          pt: 3,
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            flex: '0 0 auto',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: item.color
          }}
        >
          {initialOf(author)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
            {author}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
            {pick(item, 'role', lang)}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// `reverse` makes the row move the other way. The strip is always laid out left to right so the loop maths
// is the same in Arabic and English; each card sets its own text direction.
const Row = ({ items, lang, reverse }) => {
  // Enough cards per copy to be wider than a wide screen, so the loop never shows a gap.
  const copy = []
  while (copy.length < 8) copy.push(...items)
  const seconds = Math.max(copy.length * 7, 40)

  return (
    <Box
      dir='ltr'
      sx={{
        overflow: 'hidden',
        '@media (prefers-reduced-motion: reduce)': { overflowX: 'auto' },
        '&:hover > div': { animationPlayState: 'paused' }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: 'max-content',
          animation: `${slide} ${seconds}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        }}
      >
        {[0, 1].map(round => (
          <Box
            key={round}
            aria-hidden={round === 1 ? true : undefined}
            sx={{ display: 'flex', gap: 5, pr: 5, flex: '0 0 auto' }}
          >
            {copy.map((item, index) => (
              <Card key={`${item.id}-${index}`} item={item} lang={lang} />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const TestimonialsSection = ({ data }) => {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const { settings, items } = data

  // Odd and even positions go to different rows; a short list is shared by both.
  const first = items.filter((_, i) => i % 2 === 0)
  const second = items.filter((_, i) => i % 2 === 1)
  const rows = second.length ? [first, second] : [items, items]

  // The last word of the title gets the gradient.
  const words = pick(settings, 'title', lang).split(' ')
  const last = words.length > 1 ? words.pop() : null

  return (
    <Box
      id='testimonials'
      component='section'
      sx={{
        scrollMarginTop: 64,
        py: { xs: 14, md: 20 },
        color: '#fff',
        background:
          'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(160,30,60,0.35), transparent 70%), linear-gradient(180deg, #2A0009 0%, #14000A 100%)'
      }}
    >
      <Box sx={{ textAlign: 'center', px: 4, mb: { xs: 10, md: 14 } }}>
        <Typography sx={{ color: '#E0B25B', fontSize: '0.8rem', fontWeight: 600, mb: 3 }}>
          {pick(settings, 'chip', lang)}
        </Typography>
        <Typography
          component='h2'
          sx={{ color: '#fff', fontSize: { xs: '2.1rem', md: '3rem' }, fontWeight: 800, mb: 3 }}
        >
          {last ? (
            <>
              {words.join(' ')}{' '}
              <Box
                component='span'
                sx={{
                  background: 'linear-gradient(90deg, #F2D9A0, #E0B25B)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                {last}
              </Box>
            </>
          ) : (
            pick(settings, 'title', lang)
          )}
        </Typography>
        {pick(settings, 'subtitle', lang) ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
            {pick(settings, 'subtitle', lang)}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'grid', gap: 5 }}>
        <Row items={rows[0]} lang={lang} />
        <Row items={rows[1]} lang={lang} reverse />
      </Box>
    </Box>
  )
}

export default TestimonialsSection
