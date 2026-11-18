// One library item (`/library/{id}`): its cover and details, with buttons to read or download the file and to
// open its link.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import SiteShell from 'src/views/site/SiteShell'
import LibraryCover from 'src/views/site/library/LibraryCover'

// ** Utils
import { serifFont } from 'src/views/site/storyText'

const LibraryItemPage = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { id } = router.query
  const lang = i18n.language
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | missing | failed

  useEffect(() => {
    if (!id) return
    setStatus('loading')
    axios
      .get(`/api/public/library/${id}`)
      .then(({ data }) => {
        setItem(data.data)
        setStatus('ready')
      })
      .catch(err => setStatus(err.response?.status === 404 ? 'missing' : 'failed'))
  }, [id])

  const details = item
    ? [
        ['publisher', item.publisher],
        ['year', item.year],
        ['isbn', item.isbn],
        ['section', item.sectionId ? (lang === 'en' ? item.sectionNameEn : item.sectionNameAr) : null]
      ].filter(([, value]) => value)
    : []

  return (
    <SiteShell title={item?.title || t('library.title')} description={item?.summary || t('library.intro')}>
      <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        <Button component={Link} href='/library' color='secondary' sx={{ mb: 6, color: 'text.secondary' }}>
          {t('library.back')}
        </Button>

        {status === 'loading' ? <Skeleton variant='rectangular' height={360} /> : null}
        {status === 'missing' || status === 'failed' ? (
          <Typography sx={{ color: 'text.secondary', py: 12, textAlign: 'center' }}>
            {t(status === 'missing' ? 'library.missing' : 'library.failed')}
          </Typography>
        ) : null}

        {status === 'ready' && item ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '240px 1fr' }, gap: { xs: 6, md: 10 } }}>
            <LibraryCover item={item} sx={{ maxWidth: 240, width: '100%', mx: { xs: 'auto', sm: 0 } }} />
            <Box>
              <Typography variant='body2' sx={{ color: 'primary.main', fontWeight: 600 }}>
                {t(`library.type.${item.type}`)}
              </Typography>
              <Typography
                component='h1'
                dir='auto'
                sx={{ fontFamily: serifFont(lang), fontSize: { xs: '1.9rem', md: '2.5rem' }, fontWeight: 600, mt: 1 }}
              >
                {item.title}
              </Typography>
              <Typography sx={{ color: 'text.secondary', mt: 1 }} dir='auto'>
                {item.authorName}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 6 }}>
                {item.fileUrl ? (
                  <>
                    <Button
                      variant='contained'
                      href={item.fileUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      startIcon={<Icon icon='tabler:book-2' />}
                    >
                      {t('library.read')}
                    </Button>
                    <Button
                      variant='outlined'
                      href={item.fileUrl}
                      download={item.fileName || true}
                      startIcon={<Icon icon='tabler:download' />}
                    >
                      {t('library.download')}
                    </Button>
                  </>
                ) : null}
                {item.externalUrl ? (
                  <Button
                    variant={item.fileUrl ? 'text' : 'contained'}
                    href={item.externalUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    startIcon={<Icon icon='tabler:external-link' />}
                  >
                    {t('library.openLink')}
                  </Button>
                ) : null}
              </Box>

              {item.summary ? (
                <Typography sx={{ mt: 8, lineHeight: 1.9, whiteSpace: 'pre-line' }} dir='auto'>
                  {item.summary}
                </Typography>
              ) : null}

              {details.length ? (
                <Box
                  component='dl'
                  sx={{ mt: 8, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, columnGap: 6 }}
                >
                  {details.map(([key, value]) => (
                    <Box key={key} sx={{ display: 'contents' }}>
                      <Typography component='dt' sx={{ color: 'text.secondary' }}>
                        {t(`library.field.${key}`)}
                      </Typography>
                      <Typography component='dd' sx={{ m: 0 }}>
                        <bdi>{value}</bdi>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Box>
    </SiteShell>
  )
}

LibraryItemPage.getLayout = page => page
LibraryItemPage.authGuard = false

export default LibraryItemPage
