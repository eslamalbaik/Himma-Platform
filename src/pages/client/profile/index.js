// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

const errorOf = err => err.response?.data?.error?.code || 'network_error'

const ReadOnly = ({ label, value }) => (
  <Box>
    <Typography variant='body2' sx={{ color: 'text.disabled' }}>
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 500 }}>{value || '-'}</Typography>
  </Box>
)

// The client's profile: names, type and status are kept by the Himma team; the client keeps its billing email,
// contact phone and YouTube channel up to date (GET/PUT /api/client/profile).
const ClientProfile = () => {
  const { t } = useTranslation()
  const [tenant, setTenant] = useState(null)
  const [values, setValues] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  const apply = data => {
    setTenant(data)
    setValues({
      billingEmail: data.billingEmail || '',
      contactPhone: data.contactPhone || '',
      youtubeChannelUrl: data.youtubeChannelUrl || ''
    })
  }

  useEffect(() => {
    axios
      .get('/api/client/profile')
      .then(response => apply(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [])

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put('/api/client/profile', values)
      .then(response => {
        apply(response.data.data)
        setToast(true)
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const field = (name, props = {}) => (
    <CustomTextField
      fullWidth
      label={t(`client.profile.${name}`)}
      helperText={t(`client.profile.${name}Help`)}
      value={values[name]}
      onChange={e => setValues({ ...values, [name]: e.target.value })}
      inputProps={{ dir: 'ltr' }}
      {...props}
    />
  )

  return (
    <Card>
      <CardHeader title={t('client.profile.title')} subheader={t('client.profile.subtitle')} />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!tenant ? (
          errorCode ? null : (
            <CircularProgress size={28} />
          )
        ) : (
          <Grid container spacing={5}>
            <Grid item xs={12} sm={6} md={3}>
              <ReadOnly label={t('client.profile.nameAr')} value={tenant.nameAr} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ReadOnly label={t('client.profile.nameEn')} value={tenant.nameEn} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ReadOnly label={t('client.profile.type')} value={t(`admin.tenantType.${tenant.type}`)} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <ReadOnly label={t('client.profile.status')} value={t(`admin.stats.status.${tenant.status}`)} />
            </Grid>
            <Grid item xs={12}>
              <Alert severity='info'>{t('client.profile.namesNote')}</Alert>
            </Grid>
            <Grid item xs={12} md={6}>
              {field('billingEmail', { type: 'email' })}
            </Grid>
            <Grid item xs={12} md={6}>
              {field('contactPhone', { type: 'tel' })}
            </Grid>
            <Grid item xs={12}>
              {field('youtubeChannelUrl', { placeholder: 'https://www.youtube.com/@...' })}
            </Grid>
            <Grid item xs={12}>
              <Button variant='contained' onClick={save} disabled={submitting}>
                {t('admin.common.save')}
              </Button>
            </Grid>
          </Grid>
        )}
      </CardContent>
      <Snackbar
        open={toast}
        autoHideDuration={4000}
        onClose={() => setToast(false)}
        message={t('admin.common.saved')}
      />
    </Card>
  )
}

ClientProfile.acl = { action: 'read', subject: 'client_basic' }

export default ClientProfile
