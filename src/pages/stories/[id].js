// Reading one published story (`GET /api/public/articles/{id}`), Medium-style: one narrow column in the
// story's own language and direction, then more stories.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import SiteShell from 'src/views/site/SiteShell'
import StoryBody from 'src/views/site/StoryBody'
import StoryListItem from 'src/views/site/StoryListItem'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Utils
import { formatDate, initialOf, readingMinutes, serifFont, storyDir, ink } from 'src/views/site/storyText'

const StoryPage = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const lang = i18n.language

  const [story, setStory] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | failed
  const [more, setMore] = useState([])

  useEffect(() => {
    if (!id) return
    setStatus('loading')
    axios
      .get(`/api/public/articles/${id}`)
      .then(({ data }) => {
        setStory(data.data)
        setStatus('ready')
      })
      .catch(err => setStatus(err.response?.status === 404 ? 'missing' : 'failed'))

    axios
      .get('/api/public/articles', { params: { perPage: 4 } })
      .then(({ data }) => setMore(data.data.filter(item => item.id !== id).slice(0, 3)))
      .catch(() => setMore([]))
  }, [id])

  const copyLink = () => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => toast.success(t('site.story.linkCopied')))
      .catch(() => null)
  }

  if (status === 'missing' || status === 'failed') {
    return (
      <SiteShell title={t('site.story.notFound')}>
        <Box sx={{ maxWidth: 680, mx: 'auto', px: 4, py: 24, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: serifFont(lang), fontSize: '2rem', fontWeight: 600, mb: 3 }}>
            {t(status === 'missing' ? 'site.story.notFound' : 'site.feed.failed')}
          </Typography>
          <Button component={Link} href='/' variant='contained' sx={pillSx}>
            {t('site.backHome')}
          </Button>
        </Box>
      </SiteShell>
    )
  }

  const org = story && (lang === 'en' ? story.tenantNameEn : story.tenantNameAr)
  const section = story && (lang === 'en' ? story.sectionNameEn : story.sectionNameAr)

  return (
    <SiteShell title={story?.title} description={story?.summary}>
      <Box component='article' sx={{ maxWidth: 728, mx: 'auto', px: { xs: 4, sm: 6 }, pt: { xs: 8, md: 14 }, pb: 16 }}>
        {status === 'loading' ? (
          <>
            <Skeleton height={64} />
            <Skeleton height={64} width='70%' />
            <Skeleton sx={{ mt: 6 }} />
            <Skeleton />
            <Skeleton width='80%' />
          </>
        ) : (
          <Box dir={storyDir(story.language)} sx={{ textAlign: 'start' }}>
            {section ? (
              <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3 }}>
                {section}
              </Typography>
            ) : null}
            <Typography
              component='h1'
              sx={{
                fontFamily: serifFont(story.language),
                fontWeight: 700,
                color: ink,
                fontSize: { xs: '2rem', md: '2.6rem' },
                lineHeight: 1.25,
                mb: 3
              }}
            >
              {story.title}
            </Typography>
            {story.summary ? (
              <Typography sx={{ fontSize: { xs: '1.15rem', md: '1.35rem' }, color: 'text.secondary', lineHeight: 1.5 }}>
                {story.summary}
              </Typography>
            ) : null}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 8, mb: 6 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.main' }}>{initialOf(story.authorName)}</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 500 }}>
                  {story.authorName}
                  {org ? (
                    <Box component='span' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                      {' '}
                      {t('site.story.in')} {org}
                    </Box>
                  ) : null}
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {t('site.story.minutes', { count: readingMinutes(story.wordCount) })} ·{' '}
                  {formatDate(story.publishedAt, lang)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                py: 1,
                borderTop: theme => `1px solid ${theme.palette.divider}`,
                borderBottom: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Tooltip title={t('site.story.copyLink')}>
                <IconButton onClick={copyLink} aria-label={t('site.story.copyLink')}>
                  <Icon icon='tabler:link' />
                </IconButton>
              </Tooltip>
            </Box>

            <StoryBody body={story.body} language={story.language} />

            {story.tags?.length ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 12 }}>
                {story.tags.map(tag => (
                  <Chip
                    key={tag.id}
                    label={lang === 'en' ? tag.nameEn : tag.nameAr}
                    sx={{ borderRadius: 99, backgroundColor: 'action.hover' }}
                  />
                ))}
              </Box>
            ) : null}
          </Box>
        )}
      </Box>

      {more.length ? (
        <Box sx={{ backgroundColor: 'action.hover' }}>
          <Box sx={{ maxWidth: 728, mx: 'auto', px: { xs: 4, sm: 6 }, py: 12 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{t('site.story.more')}</Typography>
            <Divider sx={{ mt: 3 }} />
            {more.map(item => (
              <StoryListItem key={item.id} story={item} />
            ))}
            <Button component={Link} href='/' variant='outlined' color='secondary' sx={{ mt: 8, borderRadius: 99 }}>
              {t('site.story.seeAll')}
            </Button>
          </Box>
        </Box>
      ) : null}
    </SiteShell>
  )
}

StoryPage.getLayout = page => page
StoryPage.authGuard = false

export default StoryPage
