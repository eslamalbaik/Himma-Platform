// An organization admin edits the organization's public profile (`/api/me/organization`).

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import { pillSx } from 'src/views/site/SiteHeader'
import VerifiedBadge from 'src/views/site/VerifiedBadge'

const OrgProfileTab = () => {
  const { t } = useTranslation()
  const [form, setForm] = useState(null)
  const [slug, setSlug] = useState('')
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('/api/me/organization')
      .then(({ data }) => {
        const o = data.data
        setSlug(o.slug)
        setVerified(o.verified)
        setForm({
          nameAr: o.nameAr,
          nameEn: o.nameEn,
          bioAr: o.bioAr || '',
          bioEn: o.bioEn || '',
          website: o.website || ''
        })
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
  }, [])

  const change = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const save = () => {
    setBusy(true)
    setError(null)
    axios
      .put('/api/me/organization', form)
      .then(() => toast.success(t('community.org.saved')))
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setBusy(false))
  }

  if (!form) return error ? <Alert severity='error'>{t(`errors.${error}`)}</Alert> : <Skeleton height={200} />

  return (
    <Box sx={{ display: 'grid', gap: 4, maxWidth: 620 }}>
      {error ? <Alert severity='error'>{t(`errors.${error}`)}</Alert> : null}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Button
          component={Link}
          href={`/org/${slug}`}
          variant='outlined'
          color='secondary'
          size='small'
          sx={{ borderRadius: 99 }}
        >
          {t('community.org.viewPublic')}
        </Button>
        {verified ? (
          <span>
            <VerifiedBadge verified /> {t('community.verification.done')}
          </span>
        ) : (
          <Button component={Link} href='/me/profile' size='small' color='secondary'>
            {t('community.org.askBadge')}
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 4 }}>
        <TextField label={t('community.org.nameAr')} value={form.nameAr} onChange={change('nameAr')} />
        <TextField
          label={t('community.org.nameEn')}
          value={form.nameEn}
          onChange={change('nameEn')}
          inputProps={{ dir: 'ltr' }}
        />
      </Box>
      <TextField
        multiline
        minRows={3}
        label={t('community.org.bioAr')}
        value={form.bioAr}
        onChange={change('bioAr')}
        inputProps={{ maxLength: 1000 }}
      />
      <TextField
        multiline
        minRows={3}
        label={t('community.org.bioEn')}
        value={form.bioEn}
        onChange={change('bioEn')}
        inputProps={{ maxLength: 1000, dir: 'ltr' }}
      />
      <TextField
        label={t('community.org.website')}
        value={form.website}
        onChange={change('website')}
        placeholder='https://'
        inputProps={{ dir: 'ltr' }}
      />
      <Box>
        <Button variant='contained' disabled={busy} onClick={save} sx={pillSx}>
          {t('community.org.save')}
        </Button>
      </Box>
    </Box>
  )
}

export default OrgProfileTab
