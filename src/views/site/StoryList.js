// A page of stories fetched from `/api/public/articles` with the given filters (a profile's stories, the
// following feed), with loading, empty and error states and a "show more" button.

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

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
import StoryListItem from 'src/views/site/StoryListItem'

const StoryList = ({ params, emptyKey = 'community.noStories' }) => {
  const { t } = useTranslation()
  const [stories, setStories] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const key = JSON.stringify(params)

  const load = useCallback(
    nextPage => {
      setLoading(true)
      setFailed(false)
      axios
        .get('/api/public/articles', { params: { ...JSON.parse(key), perPage: 10, page: nextPage } })
        .then(({ data }) => {
          setStories(prev => (nextPage === 1 ? data.data : [...prev, ...data.data]))
          setPage(nextPage)
          setLastPage(data.meta.lastPage)
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    },
    [key]
  )

  useEffect(() => load(1), [load])

  return (
    <Box>
      {stories.map(story => (
        <StoryListItem key={story.id} story={story} />
      ))}
      {loading
        ? [0, 1].map(i => (
            <Box key={i} sx={{ py: 5 }}>
              <Skeleton height={32} />
              <Skeleton width='60%' />
            </Box>
          ))
        : null}
      {failed ? (
        <Alert
          severity='error'
          sx={{ my: 4 }}
          action={
            <Button color='inherit' size='small' onClick={() => load(page)}>
              {t('site.retry')}
            </Button>
          }
        >
          {t('site.feed.failed')}
        </Alert>
      ) : null}
      {!loading && !failed && !stories.length ? (
        <Typography sx={{ color: 'text.secondary', py: 12, textAlign: 'center' }}>{t(emptyKey)}</Typography>
      ) : null}
      {!loading && !failed && page < lastPage ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Button variant='outlined' color='secondary' sx={{ borderRadius: 99 }} onClick={() => load(page + 1)}>
            {t('community.showMore')}
          </Button>
        </Box>
      ) : null}
    </Box>
  )
}

export default StoryList
