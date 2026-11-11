// A round (or rounded-square) picture with "change" and "remove" buttons: a person's profile picture
// (`/api/me/profile/avatar`) or an organization's logo (`/api/me/organization/logo`).

// ** React Imports
import { useRef, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

const PhotoUpload = ({ url, endpoint, initial, variant = 'circular', onChange }) => {
  const { t } = useTranslation()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  const fail = err => toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`))

  const upload = file => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    axios
      .post(endpoint, form)
      .then(({ data }) => {
        onChange(data.data.avatarUrl ?? data.data.logoUrl)
        toast.success(t('community.photo.updated'))
      })
      .catch(fail)
      .finally(() => setBusy(false))
  }

  const remove = () => {
    setBusy(true)
    axios
      .delete(endpoint)
      .then(() => {
        onChange(null)
        toast.success(t('community.photo.removed'))
      })
      .catch(fail)
      .finally(() => setBusy(false))
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <Avatar
        variant={variant}
        src={url || undefined}
        sx={{ width: 88, height: 88, fontSize: '2.2rem', bgcolor: 'primary.main' }}
      >
        {initial}
      </Avatar>
      <Box>
        <input
          ref={input}
          type='file'
          hidden
          accept='image/jpeg,image/png,image/webp'
          onChange={e => {
            upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant='outlined'
            color='secondary'
            size='small'
            disabled={busy}
            onClick={() => input.current?.click()}
            sx={{ borderRadius: 99 }}
          >
            {t('community.photo.change')}
          </Button>
          {url ? (
            <Button color='error' size='small' disabled={busy} onClick={remove} sx={{ borderRadius: 99 }}>
              {t('community.photo.remove')}
            </Button>
          ) : null}
        </Box>
        <Typography variant='body2' sx={{ color: 'text.disabled', mt: 1.5 }}>
          {t('community.photo.hint')}
        </Typography>
      </Box>
    </Box>
  )
}

export default PhotoUpload
