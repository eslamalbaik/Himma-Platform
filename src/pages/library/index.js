// The library (`/library`, under Articles): books, research and guides of the community, each a cover that
// opens its own page. Filter by type and search by title or author.

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import LibraryCover from 'src/views/site/library/LibraryCover'

// ** Utils
import { serifFont } from 'src/views/site/storyText'

const TYPES = ['book', 'research', 'guide', 'report', 'other']

const LibraryPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // Waits for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350)

    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(
    nextPage => {
      setLoading(true)
      setFailed(false)
      axios
        .get('/api/public/library', {
          params: { type: type || undefined, search: query || undefined, perPage: 24, page: nextPage }
        })
        .then(({ data }) => {
          setItems(prev => (nextPage === 1 ? data.data : [...prev, ...data.data]))
          setPage(nextPage)
          setLastPage(data.meta.lastPage)
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    },
    [type, query]
  )

  useEffect(() => load(1), [load])

  return (
    <SiteShell title={t('library.title')} description={t('library.intro')}>
      <Box sx={{ maxWidth: 1080, mx: 'auto', width: '100%', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        <Typography
          component='h1'
          sx={{ fontFamily: serifFont(lang), fontSize: { xs: '2.1rem', md: '3rem' }, fontWeight: 600 }}
        >
          {t('library.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, mb: 6, maxWidth: 620 }}>{t('library.intro')}</Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: { xs: 8, md: 10 } }}>
          {['', ...TYPES].map(value => (
            <Chip
              key={value || 'all'}
              label={value ? t(`library.type.${value}`) : t('library.all')}
              color={type === value ? 'primary' : 'default'}
              variant={type === value ? 'filled' : 'outlined'}
              onClick={() => setType(value)}
            />
          ))}
          <TextField
            size='small'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('library.search')}
            sx={{ marginInlineStart: { sm: 'auto' }, width: { xs: '100%', sm: 260 } }}
          />
        </Box>

        {failed ? (
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => load(page)}>
                {t('site.retry')}
              </Button>
            }
          >
            {t('library.failed')}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 5, md: 8 }
          }}
        >
          {items.map(item => (
            <Box
              key={item.id}
              component={Link}
              href={`/library/${item.id}`}
              sx={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover .cover': { transform: 'translateY(-6px)', boxShadow: '0 26px 46px rgba(0,0,0,.3)' }
              }}
            >
              <LibraryCover item={item} />
              <Typography sx={{ fontWeight: 600, mt: 3 }} dir='auto'>
                {item.title}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }} dir='auto'>
                {item.authorName}
                {item.year ? ` · ${item.year}` : ''}
              </Typography>
            </Box>
          ))}
          {loading
            ? [0, 1, 2, 3].map(i => (
                <Skeleton key={i} variant='rectangular' sx={{ aspectRatio: '2 / 3', height: 'auto' }} />
              ))
            : null}
        </Box>

        {!loading && !failed && !items.length ? (
          <Typography sx={{ color: 'text.secondary', py: 12, textAlign: 'center' }}>{t('library.empty')}</Typography>
        ) : null}
        {!loading && !failed && page < lastPage ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Button variant='outlined' color='secondary' sx={{ borderRadius: 99 }} onClick={() => load(page + 1)}>
              {t('site.feed.more')}
            </Button>
          </Box>
        ) : null}
      </Box>
    </SiteShell>
  )
}

LibraryPage.getLayout = page => page
LibraryPage.authGuard = false

export default LibraryPage
