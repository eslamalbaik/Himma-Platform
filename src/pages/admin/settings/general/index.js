// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

const SettingsGeneralPage = () => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)
  const canUpdate = Boolean(ability?.can('update', 'settings'))

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [toast, setToast] = useState(null)

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      platformNameAr: '',
      platformNameEn: '',
      defaultLocale: 'ar',
      supportEmail: '',
      maintenanceMode: false
    }
  })

  useEffect(() => {
    axios
      .get('/api/admin/settings')
      .then(response => reset(response.data.data))
      .catch(() => setLoadError('loadError'))
      .finally(() => setLoading(false))
  }, [reset])

  const onSubmit = data => {
    setSubmitting(true)
    setFormError(null)
    axios
      .put('/api/admin/settings', data)
      .then(response => {
        reset(response.data.data)
        setToast('saveSuccess')
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('admin.settings.general.title')} subheader={t('admin.settings.general.subtitle')} />
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent>
              {loadError ? (
                <Alert severity='error' sx={{ mb: 4 }}>
                  {t(`admin.settings.general.${loadError}`)}
                </Alert>
              ) : null}
              {formError ? (
                <Alert severity='error' sx={{ mb: 4 }}>
                  {t(`errors.${formError}`)}
                </Alert>
              ) : null}
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='platformNameAr'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        disabled={!canUpdate}
                        label={t('admin.settings.general.platformNameAr')}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='platformNameEn'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        disabled={!canUpdate}
                        label={t('admin.settings.general.platformNameEn')}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='defaultLocale'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        select
                        fullWidth
                        disabled={!canUpdate}
                        label={t('admin.settings.general.defaultLocale')}
                      >
                        <MenuItem value='ar'>{t('language.ar')}</MenuItem>
                        <MenuItem value='en'>{t('language.en')}</MenuItem>
                      </CustomTextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='supportEmail'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        type='email'
                        fullWidth
                        disabled={!canUpdate}
                        label={t('admin.settings.general.supportEmail')}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name='maintenanceMode'
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                        disabled={!canUpdate}
                        label={t('admin.settings.general.maintenanceMode')}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
            {canUpdate ? (
              <CardContent sx={{ pt: 0 }}>
                <Button type='submit' variant='contained' disabled={submitting}>
                  {t('admin.settings.general.save')}
                </Button>
              </CardContent>
            ) : null}
          </form>
        </Card>
      </Grid>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(`admin.settings.general.${toast}`) : ''}
      />
    </Grid>
  )
}

SettingsGeneralPage.acl = {
  action: 'read',
  subject: 'settings'
}

export default SettingsGeneralPage
