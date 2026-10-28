// A member writes a story (`/write`) or edits one of theirs (`/write/{id}`), Medium-style: a quiet page with
// a big title, an optional summary and the text. Saving keeps a draft (`/api/me/stories`); "Send for
// review" passes it to the editors, who approve and publish it from the dashboard.

// ** React Imports
import { useEffect, useRef, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import InputBase from '@mui/material/InputBase'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import SiteHeader, { pillSx } from 'src/views/site/SiteHeader'

// ** Utils
import { countWords, serifFont, storyDir, ink } from 'src/views/site/storyText'

const EDITABLE = ['draft', 'in_review', 'approved', 'rejected']

const emptyStory = lang => ({ title: '', summary: '', body: '', language: lang === 'en' ? 'en' : 'ar', sectionId: '' })

const WritePage = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const id = router.query.id?.[0] || null

  const [story, setStory] = useState(() => emptyStory(i18n.language))
  const [status, setStatus] = useState('draft')
  const [reviewNote, setReviewNote] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [missing, setMissing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sections, setSections] = useState([])

  // The id of a draft created here: the page already holds its text, so it is not fetched again.
  const createdId = useRef(null)

  useEffect(() => {
    axios
      .get('/api/public/sections')
      .then(({ data }) => setSections(data.data))
      .catch(() => setSections([]))
  }, [])

  useEffect(() => {
    if (!router.isReady || !id || id === createdId.current) return
    setLoading(true)
    axios
      .get(`/api/me/stories/${id}`)
      .then(({ data }) => {
        const s = data.data
        setStory({
          title: s.title,
          summary: s.summary || '',
          body: s.body,
          language: s.language,
          sectionId: s.sectionId || ''
        })
        setStatus(s.status)
        setReviewNote(s.reviewNote)
        setDirty(false)
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
  }, [router.isReady, id])

  // Leaving with unsaved text asks first.
  useEffect(() => {
    const warn = e => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const editable = EDITABLE.includes(status)
  const change = key => e => {
    setStory(prev => ({ ...prev, [key]: e.target.value }))
    setDirty(true)
  }

  // Creates the draft on first save, then updates it. Resolves to the story id.
  const save = async () => {
    const payload = { ...story, sectionId: story.sectionId || null }
    if (id) {
      const { data } = await axios.put(`/api/me/stories/${id}`, payload)
      setStatus(data.data.status)

      return id
    }
    const { data } = await axios.post('/api/me/stories', payload)
    createdId.current = data.data.id
    router.replace(`/write/${data.data.id}`, undefined, { shallow: true })

    return data.data.id
  }

  const run = async (submit = false) => {
    if (!story.title.trim() || !story.body.trim()) {
      setError(story.title.trim() ? 'invalid_article_body' : 'invalid_article_title')

      return
    }
    setBusy(true)
    setError(null)
    try {
      const storyId = await save()
      setDirty(false)
      if (submit) {
        await axios.post(`/api/me/stories/${storyId}/submit`)
        toast.success(t('site.write.submitted'))
        router.push('/me/stories')
      } else {
        toast.success(t('site.write.saved'))
      }
    } catch (err) {
      setError(err.response?.data?.error?.code || 'network_error')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = ['draft', 'rejected'].includes(status)
  const font = serifFont(story.language)

  const actions = (
    <>
      <Typography variant='body2' sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
        {busy ? t('site.write.saving') : dirty ? t('site.write.unsaved') : t(`site.status.${status}`)}
      </Typography>
      {editable ? (
        <Button
          variant='outlined'
          color='secondary'
          size='small'
          disabled={busy}
          onClick={() => run(false)}
          sx={{ borderRadius: 99 }}
        >
          {t('site.write.save')}
        </Button>
      ) : null}
      {canSubmit ? (
        <Button variant='contained' size='small' disabled={busy} onClick={() => run(true)} sx={pillSx}>
          {t('site.write.submit')}
        </Button>
      ) : null}
    </>
  )

  if (missing) {
    return (
      <SiteShell title={t('site.write.title')}>
        <Box sx={{ maxWidth: 680, mx: 'auto', px: 4, py: 24, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: font, fontSize: '1.75rem', fontWeight: 600, mb: 6 }}>
            {t('site.write.notFound')}
          </Typography>
          <Button component={Link} href='/me/stories' variant='contained' sx={pillSx}>
            {t('site.myStories')}
          </Button>
        </Box>
      </SiteShell>
    )
  }

  return (
    <SiteShell title={t('site.write.title')} header={<SiteHeader actions={actions} />} footer={false}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 4, sm: 6 }, pt: { xs: 6, md: 10 }, pb: 20 }}>
        {status === 'rejected' ? (
          <Alert severity='warning' sx={{ mb: 6 }}>
            <Typography sx={{ fontWeight: 600 }}>{t('site.write.rejected')}</Typography>
            {reviewNote ? <Typography variant='body2'>{reviewNote}</Typography> : null}
          </Alert>
        ) : null}
        {['in_review', 'approved'].includes(status) ? (
          <Alert severity='info' sx={{ mb: 6 }}>
            {t('site.write.inReview')}
          </Alert>
        ) : null}
        {!editable && !loading ? (
          <Alert
            severity='success'
            sx={{ mb: 6 }}
            action={
              status === 'published' ? (
                <Button component={Link} href={`/stories/${id}`} color='inherit' size='small'>
                  {t('site.write.read')}
                </Button>
              ) : null
            }
          >
            {t(status === 'published' ? 'site.write.published' : 'site.write.locked')}
          </Alert>
        ) : null}
        {error ? (
          <Alert severity='error' sx={{ mb: 6 }}>
            {t(`errors.${error}`)}
          </Alert>
        ) : null}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, mb: 8 }}>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={story.language}
            disabled={!editable}
            onChange={(e, value) => {
              if (!value) return
              setStory(prev => ({ ...prev, language: value }))
              setDirty(true)
            }}
            aria-label={t('site.write.language')}
          >
            <ToggleButton value='ar'>{t('language.ar')}</ToggleButton>
            <ToggleButton value='en'>{t('language.en')}</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            select
            size='small'
            value={story.sectionId}
            onChange={change('sectionId')}
            disabled={!editable}
            label={t('site.write.section')}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value=''>{t('site.write.noSection')}</MenuItem>
            {sections.map(section => (
              <MenuItem key={section.id} value={section.id}>
                {i18n.language === 'en' ? section.nameEn : section.nameAr}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant='body2' sx={{ color: 'text.disabled', marginInlineStart: 'auto' }}>
            {t('site.write.words', { count: countWords(story.body) })}
          </Typography>
        </Box>

        {loading ? (
          <>
            <Skeleton height={70} />
            <Skeleton sx={{ mt: 6 }} />
            <Skeleton />
            <Skeleton width='70%' />
          </>
        ) : (
          <Box dir={storyDir(story.language)}>
            <InputBase
              fullWidth
              multiline
              autoFocus={!id}
              value={story.title}
              onChange={change('title')}
              readOnly={!editable}
              placeholder={t('site.write.titlePlaceholder')}
              inputProps={{ 'aria-label': t('site.write.titlePlaceholder'), maxLength: 255 }}
              sx={{
                fontFamily: font,
                fontSize: { xs: '2rem', md: '2.6rem' },
                fontWeight: 700,
                color: ink,
                lineHeight: 1.25,
                mb: 3
              }}
            />
            <InputBase
              fullWidth
              multiline
              value={story.summary}
              onChange={change('summary')}
              readOnly={!editable}
              placeholder={t('site.write.summaryPlaceholder')}
              inputProps={{ 'aria-label': t('site.write.summaryPlaceholder'), maxLength: 2000 }}
              sx={{ fontSize: { xs: '1.15rem', md: '1.3rem' }, color: 'text.secondary', mb: 6 }}
            />
            <InputBase
              fullWidth
              multiline
              minRows={14}
              value={story.body}
              onChange={change('body')}
              readOnly={!editable}
              placeholder={t('site.write.bodyPlaceholder')}
              inputProps={{ 'aria-label': t('site.write.bodyPlaceholder') }}
              sx={{
                fontFamily: font,
                fontSize: { xs: '1.125rem', md: '1.25rem' },
                color: ink,
                lineHeight: story.language === 'en' ? 1.65 : 1.95,
                alignItems: 'flex-start'
              }}
            />
            {editable ? (
              <Typography variant='body2' sx={{ color: 'text.disabled', mt: 8 }}>
                {t('site.write.formatHint')}
              </Typography>
            ) : null}
          </Box>
        )}
      </Box>
    </SiteShell>
  )
}

WritePage.getLayout = page => page
WritePage.acl = { action: 'create', subject: 'stories' }

export default WritePage
