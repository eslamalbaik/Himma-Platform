// Public home page, in the style of medium.com. Guests see a hero and the latest stories; signed-in members
// go straight to the feed. Stories are published articles anyone may read (`GET /api/public/articles`).
// Frame: src/views/site, texts: `site.*` in public/locales.

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import SiteShell from 'src/views/site/SiteShell'
import StoryListItem from 'src/views/site/StoryListItem'
import PricingSection from 'src/views/site/landing/PricingSection'
import TestimonialsSection from 'src/views/site/landing/TestimonialsSection'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Utils
import { serifFont, ink } from 'src/views/site/storyText'

const PER_PAGE = 10

const Hero = () => {
  const { t, i18n } = useTranslation()

  return (
    <Box sx={{ borderBottom: theme => `1px solid ${ink(theme)}`, overflow: 'hidden' }}>
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1336,
          px: { xs: 4, md: 6 },
          minHeight: { xs: 460, md: 'calc(78vh - 64px)' },
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <Box sx={{ maxWidth: 640, py: { xs: 14, md: 20 }, position: 'relative', zIndex: 1 }}>
          <Typography
            component='h1'
            sx={{
              fontFamily: serifFont(i18n.language),
              fontWeight: 500,
              fontSize: { xs: '3.25rem', sm: '4.5rem', md: '5.75rem' },
              lineHeight: 1.05,
              letterSpacing: i18n.language === 'en' ? '-0.03em' : 0,
              color: ink,
              mb: 6
            }}
          >
            {t('site.hero.title')}
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.15rem', md: '1.4rem' }, color: ink, mb: 10, maxWidth: 520 }}>
            {t('site.hero.subtitle')}
          </Typography>
          <Button href='#stories' variant='contained' size='large' sx={{ ...pillSx, px: 8, fontSize: '1.1rem' }}>
            {t('site.hero.cta')}
          </Button>
        </Box>
        <HeroArt />
      </Box>
    </Box>
  )
}

// The hero drawing (a hand writing, and a flower): the PNGs only supply the shape, a mask paints them in
// the brand colour, so they follow the theme. Desktop only.
const MaskedArt = ({ src, color, sx }) => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      backgroundColor: color,
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskSize: '100% 100%',
      maskSize: '100% 100%',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      ...sx
    }}
  />
)

const HeroArt = () => (
  <Box
    aria-hidden
    sx={{
      display: { xs: 'none', md: 'block' },
      position: 'absolute',
      insetInlineEnd: { md: 0, lg: 24 },
      top: '50%',
      transform: 'translateY(-50%)',
      width: { md: 400, lg: 520 },
      height: { md: 440, lg: 560 }
    }}
  >
    <MaskedArt
      src='/images/pages/hero-write.png'
      color='primary.main'
      sx={{ insetInlineEnd: 0, bottom: 0, width: '88%', aspectRatio: '808 / 660' }}
    />
    <MaskedArt
      src='/images/pages/hero-flower.png'
      color='#E0B25B'
      sx={{ insetInlineStart: 0, top: 0, width: '42%', aspectRatio: '588 / 590', transform: 'rotate(-8deg)' }}
    />
  </Box>
)

const SidebarBlock = ({ title, children }) => (
  <Box sx={{ mb: 10 }}>
    <Typography sx={{ fontWeight: 600, mb: 4, color: ink }}>{title}</Typography>
    {children}
  </Box>
)

const Sidebar = ({ sections, activeSection, onSection }) => {
  const { t, i18n } = useTranslation()
  const auth = useAuth()

  return (
    <Box component='aside' sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
      <SidebarBlock title={t('site.sidebar.writeTitle')}>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3 }}>
          {t('site.sidebar.writeText')}
        </Typography>
        <Button component={Link} href={auth.user ? '/write' : '/register'} variant='contained' size='small' sx={pillSx}>
          {t(auth.user ? 'site.write' : 'site.getStarted')}
        </Button>
      </SidebarBlock>

      {sections.length ? (
        <SidebarBlock title={t('site.sidebar.topics')}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {sections.map(section => (
              <Chip
                key={section.id}
                label={i18n.language === 'en' ? section.nameEn : section.nameAr}
                onClick={() => onSection(activeSection === section.id ? null : section.id)}
                color={activeSection === section.id ? 'primary' : 'default'}
                sx={{ borderRadius: 99, ...(activeSection === section.id ? {} : { backgroundColor: 'action.hover' }) }}
              />
            ))}
          </Box>
        </SidebarBlock>
      ) : null}

      <SidebarBlock title={t('site.orgs.title')}>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3 }}>
          {t('site.orgs.text')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button component={Link} href='/join' variant='outlined' size='small' sx={{ borderRadius: 99 }}>
            {t('site.orgs.join')}
          </Button>
          <Button
            component={Link}
            href='/login?type=organization'
            size='small'
            color='secondary'
            startIcon={<Icon icon='tabler:building' />}
          >
            {t('site.orgs.signIn')}
          </Button>
        </Box>
      </SidebarBlock>
    </Box>
  )
}

const FeedSkeleton = () =>
  [0, 1, 2].map(i => (
    <Box key={i} sx={{ py: 6 }}>
      <Skeleton width={160} />
      <Skeleton height={40} />
      <Skeleton />
      <Skeleton width='60%' />
    </Box>
  ))

const Home = () => {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const router = useRouter()
  const search = typeof router.query.q === 'string' ? router.query.q.trim() : ''

  const [stories, setStories] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [sections, setSections] = useState([])
  const [activeSection, setActiveSection] = useState(null)
  const [landing, setLanding] = useState(null)

  const load = useCallback(
    (page, append) => {
      setLoading(true)
      setFailed(false)
      axios
        .get('/api/public/articles', {
          params: { page, perPage: PER_PAGE, search: search || undefined, sectionId: activeSection || undefined }
        })
        .then(({ data }) => {
          setStories(prev => (append ? [...prev, ...data.data] : data.data))
          setMeta(data.meta)
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    },
    [search, activeSection]
  )

  useEffect(() => {
    if (router.isReady) load(1, false)
  }, [router.isReady, load])

  useEffect(() => {
    axios
      .get('/api/public/sections')
      .then(({ data }) => setSections(data.data.filter(section => section.articlesCount > 0)))
      .catch(() => setSections([]))
  }, [])

  // Pricing and testimonials for guests; a section that is off or empty comes back as null and is not drawn.
  useEffect(() => {
    axios
      .get('/api/public/landing')
      .then(({ data }) => setLanding(data.data))
      .catch(() => setLanding(null))
  }, [])

  const activeSectionName = sections.find(section => section.id === activeSection)
  const hasMore = meta && meta.currentPage < meta.lastPage

  let heading = t('site.feed.latest')
  if (search) heading = t('site.feed.results', { query: search })
  else if (activeSectionName) heading = i18n.language === 'en' ? activeSectionName.nameEn : activeSectionName.nameAr

  return (
    <SiteShell>
      {!auth.user && !search ? <Hero /> : null}
      {!auth.user && !search && landing?.pricing ? <PricingSection data={landing.pricing} /> : null}
      {!auth.user && !search && landing?.testimonials ? <TestimonialsSection data={landing.testimonials} /> : null}

      <Box
        id='stories'
        sx={{
          mx: 'auto',
          maxWidth: 1336,
          px: { xs: 4, md: 6 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
          columnGap: { md: 12, lg: 20 },
          scrollMarginTop: 64
        }}
      >
        <Box sx={{ py: { xs: 6, md: 10 }, maxWidth: 720, width: '100%', justifySelf: { md: 'end' } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              pb: 3,
              borderBottom: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography component='h2' sx={{ fontWeight: 600, fontSize: '1rem', flex: 1 }}>
              {heading}
            </Typography>
            {search || activeSection ? (
              <Button
                size='small'
                color='secondary'
                onClick={() => {
                  setActiveSection(null)
                  if (search) router.push('/')
                }}
              >
                {t('site.feed.showAll')}
              </Button>
            ) : null}
          </Box>

          {stories.map(story => (
            <StoryListItem key={story.id} story={story} onSection={setActiveSection} />
          ))}

          {loading ? <FeedSkeleton /> : null}

          {!loading && failed ? (
            <Box sx={{ py: 16, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary', mb: 4 }}>{t('site.feed.failed')}</Typography>
              <Button variant='outlined' onClick={() => load(1, false)} sx={{ borderRadius: 99 }}>
                {t('site.retry')}
              </Button>
            </Box>
          ) : null}

          {!loading && !failed && !stories.length ? (
            <Box sx={{ py: 16, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: serifFont(i18n.language), fontSize: '1.75rem', fontWeight: 600, mb: 2 }}>
                {t(search ? 'site.feed.noResults' : 'site.feed.emptyTitle')}
              </Typography>
              {!search ? (
                <>
                  <Typography sx={{ color: 'text.secondary', mb: 6 }}>{t('site.feed.emptyText')}</Typography>
                  <Button component={Link} href={auth.user ? '/write' : '/register'} variant='contained' sx={pillSx}>
                    {t('site.feed.beFirst')}
                  </Button>
                </>
              ) : null}
            </Box>
          ) : null}

          {hasMore && !loading ? (
            <Box sx={{ pt: 8, textAlign: 'center' }}>
              <Button
                variant='outlined'
                color='secondary'
                onClick={() => load(meta.currentPage + 1, true)}
                sx={{ borderRadius: 99 }}
              >
                {t('site.feed.more')}
              </Button>
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            py: { xs: 6, md: 10 },
            borderTop: { xs: theme => `1px solid ${theme.palette.divider}`, md: 'none' },
            borderInlineStart: { md: theme => `1px solid ${theme.palette.divider}` },
            paddingInlineStart: { md: 10 }
          }}
        >
          <Sidebar sections={sections} activeSection={activeSection} onSection={setActiveSection} />
        </Box>
      </Box>
    </SiteShell>
  )
}

// No dashboard layout: the page scrolls as a whole so the site header can stick to the top.
Home.getLayout = page => page
Home.authGuard = false

export default Home
