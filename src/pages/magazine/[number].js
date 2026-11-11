// One magazine issue (`/magazine/{number}`) as a page-turning book: cover, contents, two pages for every article
// (an opener with its picture and an excerpt with a "read" button), a colophon and the back cover.

// ** React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import FlipBook from 'src/views/site/magazine/FlipBook'
import { buildPages } from 'src/views/site/magazine/IssuePages'

// ** Utils
import { serifFont } from 'src/views/site/storyText'

const IssuePage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const router = useRouter()
  const number = router.query.number
  const [issue, setIssue] = useState(null)
  const [issues, setIssues] = useState([])
  const [state, setState] = useState('loading')
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    if (!router.isReady) return
    setState('loading')
    setCursor(0)
    axios
      .get(`/api/public/issues/${number}`)
      .then(({ data }) => {
        setIssue(data.data)
        setState('ready')
      })
      .catch(err => setState(err.response?.status === 404 ? 'missing' : 'failed'))
    axios
      .get('/api/public/issues')
      .then(({ data }) => setIssues(data.data))
      .catch(() => setIssues([]))
  }, [router.isReady, number])

  const goTo = useCallback(page => setCursor(page), [])

  // The next issue is the one with the closest higher number.
  const nextIssue = useMemo(() => {
    const higher = issues.map(i => i.number).filter(n => issue && n > issue.number)

    return higher.length ? Math.min(...higher) : null
  }, [issues, issue])

  const pages = useMemo(
    () => (issue ? buildPages({ issue, t, lang, goTo, nextIssue }) : []),
    [issue, t, lang, goTo, nextIssue]
  )

  const title = issue ? (lang === 'en' ? issue.titleEn : issue.titleAr) : ''
  const theme = issue ? (lang === 'en' ? issue.themeEn : issue.themeAr) : ''

  return (
    <SiteShell title={issue ? `${t('magazine.issue', { number: issue.number })} · ${title}` : t('magazine.title')}>
      <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%', px: { xs: 2, sm: 6 }, py: { xs: 6, md: 10 } }}>
        {state === 'ready' ? (
          <>
            <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 }, px: 3 }}>
              <Typography variant='body2' sx={{ color: 'primary.main', letterSpacing: 2, mb: 1 }}>
                {t('magazine.issue', { number: issue.number })}
              </Typography>
              <Typography
                component='h1'
                sx={{ fontFamily: serifFont(lang), fontSize: { xs: '1.9rem', md: '2.6rem' }, fontWeight: 600 }}
              >
                {theme || title}
              </Typography>
              {theme ? <Typography sx={{ color: 'text.secondary', mt: 1 }}>{title}</Typography> : null}
            </Box>
            {issue.articles.length ? (
              <FlipBook pages={pages} rtl={lang !== 'en'} cursor={cursor} onCursor={setCursor} />
            ) : (
              <Alert severity='info' sx={{ maxWidth: 520, mx: 'auto' }}>
                {t('magazine.noArticles')}
              </Alert>
            )}
            <Box sx={{ textAlign: 'center', mt: 8 }}>
              <Button component={Link} href='/magazine' variant='outlined' color='secondary' sx={{ borderRadius: 99 }}>
                {t('magazine.allIssues')}
              </Button>
            </Box>
          </>
        ) : null}
        {state === 'loading' ? (
          <Box sx={{ display: 'grid', placeItems: 'center', gap: 3 }}>
            <Skeleton width={280} height={50} />
            <Skeleton variant='rectangular' width='min(92vw, 760px)' height={520} />
          </Box>
        ) : null}
        {state === 'missing' || state === 'failed' ? (
          <Box sx={{ textAlign: 'center', py: 16 }}>
            <Typography sx={{ fontFamily: serifFont(lang), fontSize: '1.8rem', mb: 5 }}>
              {t(state === 'missing' ? 'magazine.notFound' : 'magazine.failed')}
            </Typography>
            <Button component={Link} href='/magazine' variant='contained' sx={{ borderRadius: 99 }}>
              {t('magazine.allIssues')}
            </Button>
          </Box>
        ) : null}
      </Box>
    </SiteShell>
  )
}

IssuePage.getLayout = page => page
IssuePage.authGuard = false

export default IssuePage
