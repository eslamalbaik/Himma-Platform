// The magazine (`/magazine`): a shelf of issue covers, each opening the issue as a page-turning book, and the
// Stories tab (`/magazine?tab=stories`): the literary stories (articles of kind `story`) of the community.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import StoryList from 'src/views/site/StoryList'

// ** Utils
import { formatDate, serifFont } from 'src/views/site/storyText'

const IssueCard = ({ issue, lang, t }) => {
  const title = lang === 'en' ? issue.titleEn : issue.titleAr
  const theme = lang === 'en' ? issue.themeEn : issue.themeAr

  return (
    <Box
      component={Link}
      href={`/magazine/${issue.number}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover .cover': { transform: 'translateY(-6px) rotate(-.6deg)', boxShadow: '0 26px 46px rgba(0,0,0,.34)' }
      }}
    >
      <Box
        className='cover'
        sx={{
          position: 'relative',
          aspectRatio: '560 / 784',
          overflow: 'hidden',
          borderRadius: '3px 8px 8px 3px',
          bgcolor: '#2a1520',
          boxShadow: '0 14px 30px rgba(0,0,0,.26)',
          transition: 'transform .25s ease, box-shadow .25s ease'
        }}
      >
        {issue.coverUrl ? (
          <Box
            component='img'
            src={issue.coverUrl}
            alt=''
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(20,8,14,.55) 0%, rgba(20,8,14,0) 35%, rgba(20,8,14,.85) 100%)'
          }}
        />
        <Box sx={{ position: 'absolute', top: 16, insetInline: 18, color: '#fff', fontFamily: serifFont(lang) }}>
          <Typography sx={{ fontFamily: 'inherit', fontSize: '1.5rem', lineHeight: 1, color: 'inherit' }}>
            {t('magazine.masthead')}
          </Typography>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: 14,
            insetInlineEnd: 14,
            width: 46,
            height: 46,
            borderRadius: '50%',
            bgcolor: '#8a1d2e',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: '1.2rem'
          }}
        >
          {issue.number}
        </Box>
        <Box sx={{ position: 'absolute', bottom: 18, insetInline: 18, color: '#fff' }}>
          <Typography sx={{ fontFamily: serifFont(lang), fontSize: '1.25rem', lineHeight: 1.4, color: 'inherit' }}>
            {theme || title}
          </Typography>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            insetBlock: 0,
            insetInlineStart: 0,
            width: 10,
            background: 'linear-gradient(90deg, rgba(0,0,0,.35), rgba(0,0,0,0))'
          }}
        />
      </Box>
      <Typography sx={{ fontWeight: 600, mt: 3 }}>
        {t('magazine.issue', { number: issue.number })} · {title}
      </Typography>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {formatDate(issue.publishedAt, lang)} · {t('magazine.count', { count: issue.articlesCount ?? 0 })}
      </Typography>
    </Box>
  )
}

const MagazinePage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [issues, setIssues] = useState(null)
  const [failed, setFailed] = useState(false)
  const router = useRouter()
  const tab = router.query.tab === 'stories' ? 'stories' : 'issues'

  const setTab = value =>
    router.replace({ pathname: '/magazine', query: value === 'stories' ? { tab: value } : {} }, undefined, {
      shallow: true
    })

  useEffect(() => {
    axios
      .get('/api/public/issues')
      .then(({ data }) => setIssues(data.data))
      .catch(() => setFailed(true))
  }, [])

  return (
    <SiteShell title={t('magazine.title')} description={t('magazine.intro')}>
      <Box sx={{ maxWidth: 1080, mx: 'auto', width: '100%', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        <Typography
          component='h1'
          sx={{ fontFamily: serifFont(lang), fontSize: { xs: '2.1rem', md: '3rem' }, fontWeight: 600 }}
        >
          {t('magazine.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, mb: 6, maxWidth: 620 }}>{t('magazine.intro')}</Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ mb: { xs: 8, md: 10 }, borderBottom: theme => `1px solid ${theme.palette.divider}` }}
        >
          <Tab value='issues' label={t('magazine.tabs.issues')} />
          <Tab value='stories' label={t('magazine.tabs.stories')} />
        </Tabs>
        {tab === 'stories' ? (
          <Box sx={{ maxWidth: 728 }}>
            <Typography sx={{ color: 'text.secondary', mb: 4 }}>{t('magazine.stories.intro')}</Typography>
            <StoryList params={{ kind: 'story' }} emptyKey='magazine.stories.empty' />
          </Box>
        ) : null}
        {tab === 'issues' && failed ? <Alert severity='error'>{t('magazine.failed')}</Alert> : null}
        {tab === 'issues' && !issues && !failed ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 6 }}>
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} variant='rectangular' sx={{ aspectRatio: '560 / 784', height: 'auto' }} />
            ))}
          </Box>
        ) : null}
        {tab === 'issues' && issues && !issues.length ? (
          <Typography sx={{ color: 'text.secondary' }}>{t('magazine.empty')}</Typography>
        ) : null}
        {tab === 'issues' && issues?.length ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 5, md: 8 }
            }}
          >
            {issues.map(issue => (
              <IssueCard key={issue.number} issue={issue} lang={lang} t={t} />
            ))}
          </Box>
        ) : null}
      </Box>
    </SiteShell>
  )
}

MagazinePage.getLayout = page => page
MagazinePage.authGuard = false

export default MagazinePage
