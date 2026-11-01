// The contact of an approved organization chooses a password with the link from the invitation email
// (`POST /api/auth/set-password`, token valid once) and is signed in at once.

// ** React Imports
import { useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Components
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import AuthShell from 'src/views/site/AuthShell'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

const SetPasswordPage = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const auth = useAuth()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const email = typeof router.query.email === 'string' ? router.query.email : ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = event => {
    event.preventDefault()
    if (password.length < 8) return setError('invalid_password')
    if (password !== confirm) return setError('password_mismatch')

    setError(null)
    setSubmitting(true)
    axios
      .post('/api/auth/set-password', { email, token, password })
      .then(({ data }) => {
        auth.setUser(data.user)
        router.replace('/')
      })
      .catch(err => {
        setError(err.response?.data?.error?.code || 'network_error')
        setSubmitting(false)
      })
  }

  const incomplete = router.isReady && (!token || !email)

  return (
    <AuthShell title={t('site.setPassword.title')} subtitle={t('site.setPassword.subtitle')}>
      {incomplete ? <Alert severity='error'>{t('site.setPassword.invalidLink')}</Alert> : null}
      {error ? (
        <Alert severity='error' sx={{ mb: 4 }}>
          {error === 'password_mismatch' ? t('site.setPassword.mismatch') : t(`errors.${error}`)}
        </Alert>
      ) : null}
      {!incomplete ? (
        <form noValidate autoComplete='off' onSubmit={onSubmit}>
          <Box sx={{ mb: 4 }}>
            <CustomTextField fullWidth disabled label={t('login.email')} value={email} dir='ltr' />
          </Box>
          <Box sx={{ mb: 4 }}>
            <CustomTextField
              fullWidth
              autoFocus
              label={t('login.password')}
              autoComplete='new-password'
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              helperText={t('site.register.passwordHint')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      edge='end'
                      aria-label={t('site.showPassword')}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setShow(!show)}
                    >
                      <Icon fontSize='1.25rem' icon={show ? 'tabler:eye' : 'tabler:eye-off'} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
          <Box sx={{ mb: 4 }}>
            <CustomTextField
              fullWidth
              label={t('site.setPassword.confirm')}
              autoComplete='new-password'
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </Box>
          <Button fullWidth type='submit' variant='contained' size='large' disabled={submitting} sx={pillSx}>
            {t('site.setPassword.cta')}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  )
}

SetPasswordPage.getLayout = page => page
SetPasswordPage.guestGuard = true

export default SetPasswordPage
