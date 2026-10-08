// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Settings → YouTube: the platform's channel and how live events use YouTube. The event endpoints enforce
// the rules; the live broadcast page embeds and links by them.
const YoutubeSettingsPage = () => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)
  const canUpdate = Boolean(ability?.can('update', 'settings'))

  const [values, setValues] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    axios
      .get('/api/admin/settings/youtube')
      .then(response => setValues(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [])

  const set = (name, value) => setValues({ ...values, [name]: value })

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put('/api/admin/settings/youtube', values)
      .then(response => {
        setValues(response.data.data)
        setToast(true)
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const text = (name, props = {}) => (
    <CustomTextField
      fullWidth
      label={t(`admin.settings.youtube.${name}`)}
      value={values[name] || ''}
      onChange={e => set(name, e.target.value)}
      disabled={!canUpdate}
      {...props}
    />
  )

  const rule = name => (
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch checked={Boolean(values[name])} onChange={e => set(name, e.target.checked)} disabled={!canUpdate} />
        }
        label={t(`admin.settings.youtube.${name}`)}
      />
      <Typography variant='body2' sx={{ color: 'text.secondary', paddingInlineStart: 12 }}>
        {t(`admin.settings.youtube.${name}Help`)}
      </Typography>
    </Grid>
  )

  return (
    <Card>
      <CardHeader title={t('admin.settings.youtube.title')} subheader={t('admin.settings.youtube.subtitle')} />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!values ? (
          errorCode ? null : (
            <CircularProgress size={28} />
          )
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Typography variant='h6'>{t('admin.settings.youtube.channel')}</Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {t('admin.settings.youtube.channelHelp')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              {text('channelUrl', { placeholder: 'https://www.youtube.com/@himma', inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('channelNameAr', { inputProps: { dir: 'rtl' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('channelNameEn', { inputProps: { dir: 'ltr' } })}
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant='h6'>{t('admin.settings.youtube.broadcasts')}</Typography>
            </Grid>
            {rule('youtubeOnly')}
            {rule('recordingRequired')}
            {rule('privacyEnhanced')}

            {canUpdate ? (
              <Grid item xs={12}>
                <Box>
                  <Button variant='contained' onClick={save} disabled={submitting}>
                    {t('admin.common.save')}
                  </Button>
                </Box>
              </Grid>
            ) : null}
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

YoutubeSettingsPage.acl = { action: 'read', subject: 'settings' }

export default YoutubeSettingsPage
