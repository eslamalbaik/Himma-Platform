// A member's own stories (`GET /api/me/stories`), grouped like Medium's "Your stories": drafts, in review,
// published, and returned by the editors.

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Utils
import { formatDate, serifFont, storyDir, ink } from 'src/views/site/storyText'

// Which statuses each tab shows.
const TABS = {
  drafts: ['draft'],
  review: ['in_review', 'approved'],
  published: ['published'],
  returned: ['rejected', 'withdrawn']
}

const MyStoriesPage = () => {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('drafts')
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setFailed(false)
    axios
      .get('/api/me/stories', { params: { perPage: 100 } })
      .then(({ data }) => setStories(data.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const remove = () => {
    axios
      .delete(`/api/me/stories/${deleting.id}`)
      .then(() => {
        toast.success(t('site.mine.deleted'))
        setStories(prev => prev.filter(story => story.id !== deleting.id))
      })
      .catch(err => toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`)))
      .finally(() => setDeleting(null))
  }

  const shown = stories.filter(story => TABS[tab].includes(story.status))
  const count = key => stories.filter(story => TABS[key].includes(story.status)).length

  return (
    <SiteShell title={t('site.myStories')}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, mb: 6 }}>
          <Typography
            component='h1'
            sx={{ fontFamily: serifFont(i18n.language), fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 600 }}
          >
            {t('site.myStories')}
          </Typography>
          <Button component={Link} href='/write' variant='contained' sx={pillSx}>
            {t('site.mine.new')}
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(e, value) => setTab(value)}
          variant='scrollable'
          scrollButtons={false}
          sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}
        >
          {Object.keys(TABS).map(key => (
            <Tab key={key} value={key} label={`${t(`site.mine.tabs.${key}`)} ${loading ? '' : count(key)}`} />
          ))}
        </Tabs>

        {loading
          ? [0, 1, 2].map(i => (
              <Box key={i} sx={{ py: 5 }}>
                <Skeleton height={36} />
                <Skeleton width='40%' />
              </Box>
            ))
          : null}

        {!loading && failed ? (
          <Alert
            severity='error'
            sx={{ mt: 6 }}
            action={
              <Button color='inherit' size='small' onClick={load}>
                {t('site.retry')}
              </Button>
            }
          >
            {t('site.feed.failed')}
          </Alert>
        ) : null}

        {!loading && !failed && !shown.length ? (
          <Box sx={{ py: 16, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', mb: 6 }}>{t(`site.mine.empty.${tab}`)}</Typography>
            {tab === 'drafts' ? (
              <Button component={Link} href='/write' variant='outlined' sx={{ borderRadius: 99 }}>
                {t('site.mine.new')}
              </Button>
            ) : null}
          </Box>
        ) : null}

        {!loading
          ? shown.map(story => (
              <Box key={story.id} sx={{ py: 5, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
                <Box
                  component={Link}
                  href={story.status === 'published' ? `/stories/${story.id}` : `/write/${story.id}`}
                  dir={storyDir(story.language)}
                  sx={{ display: 'block', textDecoration: 'none', color: ink, textAlign: 'start' }}
                >
                  <Typography
                    sx={{ fontFamily: serifFont(story.language), fontWeight: 700, fontSize: '1.3rem', mb: 1 }}
                  >
                    {story.title}
                  </Typography>
                  {story.summary ? (
                    <Typography variant='body2' sx={{ color: 'text.secondary', mb: 1 }} noWrap>
                      {story.summary}
                    </Typography>
                  ) : null}
                </Box>
                {story.status === 'rejected' && story.reviewNote ? (
                  <Typography variant='body2' sx={{ color: 'warning.main', mb: 1 }}>
                    {t('site.mine.editorNote', { note: story.reviewNote })}
                  </Typography>
                ) : null}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {story.status === 'published'
                      ? t('site.mine.publishedOn', { date: formatDate(story.publishedAt, i18n.language) })
                      : t('site.mine.editedOn', { date: formatDate(story.updatedAt, i18n.language) })}
                  </Typography>
                  {['draft', 'in_review', 'approved', 'rejected'].includes(story.status) ? (
                    <Button component={Link} href={`/write/${story.id}`} size='small' color='secondary'>
                      {t('site.mine.edit')}
                    </Button>
                  ) : null}
                  {['draft', 'rejected'].includes(story.status) ? (
                    <Button size='small' color='error' onClick={() => setDeleting(story)}>
                      {t('site.mine.delete')}
                    </Button>
                  ) : null}
                </Box>
              </Box>
            ))
          : null}
      </Box>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} maxWidth='xs' fullWidth>
        <DialogTitle>{t('site.mine.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary' }}>
            {t('site.mine.deleteText', { title: deleting?.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setDeleting(null)}>
            {t('site.cancel')}
          </Button>
          <Button color='error' variant='contained' onClick={remove}>
            {t('site.mine.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </SiteShell>
  )
}

MyStoriesPage.getLayout = page => page
MyStoriesPage.acl = { action: 'read', subject: 'stories' }

export default MyStoriesPage
