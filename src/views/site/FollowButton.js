// Follow / Following button for a person (`type='person'`, key = handle) or an organization
// (`type='organization'`, key = slug). Guests are sent to sign in and come back to the same page.

// ** React Imports
import { useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Button from '@mui/material/Button'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Components
import { pillSx } from 'src/views/site/SiteHeader'

const FollowButton = ({ type, id, following, onChange, size = 'medium' }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const toggle = () => {
    if (!user) {
      router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)

      return
    }
    setBusy(true)
    const request = following
      ? axios.delete(`/api/me/follows/${type}/${encodeURIComponent(id)}`)
      : axios.post('/api/me/follows', { type, key: id })

    request
      .then(({ data }) => onChange?.(data.data))
      .catch(err => toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`)))
      .finally(() => setBusy(false))
  }

  return following ? (
    <Button variant='outlined' color='secondary' size={size} disabled={busy} onClick={toggle} sx={{ borderRadius: 99 }}>
      {t('community.following')}
    </Button>
  ) : (
    <Button variant='contained' size={size} disabled={busy} onClick={toggle} sx={pillSx}>
      {t('community.follow')}
    </Button>
  )
}

export default FollowButton
