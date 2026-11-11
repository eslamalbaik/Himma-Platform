// A member's own profile (`/api/me/profile`): public name, handle and bio; the verified badge request
// (`/api/me/verification`); and the people and organizations they follow (`/api/me/following`).

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import VerifiedBadge from 'src/views/site/VerifiedBadge'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Utils
import { serifFont } from 'src/views/site/storyText'

const errorText = (t, err) => t(`errors.${err.response?.data?.error?.code || 'network_error'}`)

// The badge request for one subject (the person, or their organization): its state, and a form when none is open.
const VerificationBox = ({ subject, verified, requests, onSent }) => {
  const { t } = useTranslation()
  const [evidence, setEvidence] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const mine = requests.filter(request => request.subjectType === subject)
  const pending = mine.find(request => request.status === 'pending')
  const last = mine[0]

  const send = () => {
    setBusy(true)
    setError(null)
    axios
      .post('/api/me/verification', { subject, evidence })
      .then(() => {
        toast.success(t('community.verification.sent'))
        setEvidence('')
        onSent()
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setBusy(false))
  }

  return (
    <Box sx={{ py: 4 }}>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>{t(`community.verification.${subject}`)}</Typography>
      {verified ? (
        <Typography variant='body2' sx={{ color: 'success.main' }}>
          <VerifiedBadge verified /> {t('community.verification.done')}
        </Typography>
      ) : pending ? (
        <Alert severity='info'>{t('community.verification.pending')}</Alert>
      ) : (
        <>
          {last?.status === 'rejected' ? (
            <Alert severity='warning' sx={{ mb: 3 }}>
              {t('community.verification.rejected')}
              {last.reviewNote ? ` ${last.reviewNote}` : ''}
            </Alert>
          ) : null}
          <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3 }}>
            {t(`community.verification.${subject}Help`)}
          </Typography>
          {error ? (
            <Alert severity='error' sx={{ mb: 3 }}>
              {t(`errors.${error}`)}
            </Alert>
          ) : null}
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={evidence}
            onChange={e => setEvidence(e.target.value)}
            label={t('community.verification.evidence')}
            inputProps={{ maxLength: 2000 }}
          />
          <Button variant='contained' disabled={busy} onClick={send} sx={{ ...pillSx, mt: 3 }}>
            {t('community.verification.request')}
          </Button>
        </>
      )}
    </Box>
  )
}

const MyProfilePage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const auth = useAuth()

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [verification, setVerification] = useState(null)
  const [following, setFollowing] = useState(null)

  const loadVerification = useCallback(() => {
    axios
      .get('/api/me/verification')
      .then(({ data }) => setVerification(data))
      .catch(() => setVerification({ data: [], person: { verified: false }, organization: null }))
  }, [])

  useEffect(() => {
    axios
      .get('/api/me/profile')
      .then(({ data }) => {
        const p = data.data
        setForm({
          handle: p.handle,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          bioAr: p.bioAr || '',
          bioEn: p.bioEn || ''
        })
      })
      .catch(() => setError('network_error'))
    loadVerification()
    axios
      .get('/api/me/following')
      .then(({ data }) => setFollowing(data.data))
      .catch(() => setFollowing([]))
  }, [loadVerification])

  const change = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const save = () => {
    setSaving(true)
    setError(null)
    axios
      .put('/api/me/profile', form)
      .then(({ data }) => {
        setForm(prev => ({ ...prev, handle: data.data.handle }))
        toast.success(t('community.profile.saved'))
        auth.setUser?.(prev =>
          prev ? { ...prev, handle: data.data.handle, nameAr: data.data.nameAr, nameEn: data.data.nameEn } : prev
        )
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSaving(false))
  }

  const unfollow = item => {
    axios
      .delete(`/api/me/follows/${item.type}/${encodeURIComponent(item.key)}`)
      .then(() => setFollowing(prev => prev.filter(other => !(other.type === item.type && other.key === item.key))))
      .catch(err => toast.error(errorText(t, err)))
  }

  return (
    <SiteShell title={t('community.profile.title')}>
      <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, mb: 6 }}>
          <Typography
            component='h1'
            sx={{ fontFamily: serifFont(lang), fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 600 }}
          >
            {t('community.profile.title')}
          </Typography>
          {form ? (
            <Button
              component={Link}
              href={`/u/${form.handle}`}
              variant='outlined'
              color='secondary'
              sx={{ borderRadius: 99 }}
            >
              {t('community.profile.view')}
            </Button>
          ) : null}
        </Box>

        {!form ? (
          <>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={120} />
          </>
        ) : (
          <Box sx={{ display: 'grid', gap: 4 }}>
            {error ? <Alert severity='error'>{t(`errors.${error}`)}</Alert> : null}
            <TextField
              label={t('community.profile.handle')}
              value={form.handle}
              onChange={change('handle')}
              helperText={t('community.profile.handleHelp', { handle: form.handle || '...' })}
              inputProps={{ dir: 'ltr', maxLength: 30 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 4 }}>
              <TextField label={t('community.profile.nameAr')} value={form.nameAr} onChange={change('nameAr')} />
              <TextField
                label={t('community.profile.nameEn')}
                value={form.nameEn}
                onChange={change('nameEn')}
                inputProps={{ dir: 'ltr' }}
              />
            </Box>
            <TextField
              multiline
              minRows={3}
              label={t('community.profile.bioAr')}
              value={form.bioAr}
              onChange={change('bioAr')}
              inputProps={{ maxLength: 500 }}
            />
            <TextField
              multiline
              minRows={3}
              label={t('community.profile.bioEn')}
              value={form.bioEn}
              onChange={change('bioEn')}
              inputProps={{ maxLength: 500, dir: 'ltr' }}
            />
            <Box>
              <Button variant='contained' disabled={saving} onClick={save} sx={pillSx}>
                {t('community.profile.save')}
              </Button>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 8 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem' }}>{t('community.verification.title')}</Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 1 }}>
          {t('community.verification.intro')}
        </Typography>
        {verification ? (
          <>
            <VerificationBox
              subject='person'
              verified={verification.person.verified}
              requests={verification.data}
              onSent={loadVerification}
            />
            {verification.organization ? (
              <VerificationBox
                subject='organization'
                verified={verification.organization.verified}
                requests={verification.data}
                onSent={loadVerification}
              />
            ) : null}
          </>
        ) : (
          <Skeleton height={80} />
        )}

        <Divider sx={{ my: 8 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', mb: 2 }}>{t('community.followingTitle')}</Typography>
        {following === null ? <Skeleton height={48} /> : null}
        {following?.length === 0 ? (
          <Typography sx={{ color: 'text.secondary' }}>{t('community.followingEmpty')}</Typography>
        ) : null}
        {following?.map(item => (
          <Box
            key={`${item.type}:${item.key}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              py: 2.5,
              borderBottom: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <Box
              component={Link}
              href={item.type === 'organization' ? `/org/${item.key}` : `/u/${item.key}`}
              sx={{ flex: 1, color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
            >
              {lang === 'en' ? item.nameEn : item.nameAr}
              <VerifiedBadge verified={item.verified} />
            </Box>
            <Chip size='small' variant='outlined' label={t(`community.followTypes.${item.type}`)} />
            <Button size='small' color='secondary' onClick={() => unfollow(item)}>
              {t('community.following')}
            </Button>
          </Box>
        ))}
      </Box>
    </SiteShell>
  )
}

MyProfilePage.getLayout = page => page
MyProfilePage.acl = { action: 'read', subject: 'profile' }

export default MyProfilePage
