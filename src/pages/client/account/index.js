// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

const emptyForm = { currentPassword: '', password: '', passwordConfirmation: '' }

// The signed-in client account: who it is and a password change (PUT /api/client/account/password).
// A new password signs the account out everywhere else, but not here.
const ClientAccount = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const { user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  const change = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put('/api/client/account/password', {
        currentPassword: form.currentPassword,
        password: form.password,
        password_confirmation: form.passwordConfirmation
      })
      .then(() => {
        setForm(emptyForm)
        setToast(true)
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const field = name => (
    <CustomTextField
      fullWidth
      type='password'
      autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
      label={t(`client.account.${name}`)}
      value={form[name]}
      onChange={e => setForm({ ...form, [name]: e.target.value })}
    />
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={5}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title={t('client.account.title')} />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
              <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                {t('client.account.name')}
              </Typography>
              <Typography sx={{ fontWeight: 500 }}>{lang === 'en' ? user?.nameEn : user?.nameAr}</Typography>
            </Box>
            <Box>
              <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                {t('client.account.email')}
              </Typography>
              <Typography sx={{ fontWeight: 500 }} dir='ltr'>
                {user?.email}
              </Typography>
            </Box>
            <Alert severity='info'>{t('client.account.managedNote')}</Alert>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardHeader title={t('client.account.passwordTitle')} subheader={t('client.account.passwordHelp')} />
          <CardContent>
            {errorCode ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`errors.${errorCode}`)}
              </Alert>
            ) : null}
            <Grid container spacing={4}>
              <Grid item xs={12}>
                {field('currentPassword')}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('password')}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('passwordConfirmation')}
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant='contained'
                  onClick={change}
                  disabled={submitting || !form.currentPassword || !form.password}
                >
                  {t('client.account.change')}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Snackbar
        open={toast}
        autoHideDuration={4000}
        onClose={() => setToast(false)}
        message={t('client.account.changed')}
      />
    </Grid>
  )
}

ClientAccount.acl = { action: 'read', subject: 'client_basic' }

export default ClientAccount
