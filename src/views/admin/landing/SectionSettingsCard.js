// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

const FIELDS = ['chipAr', 'chipEn', 'titleAr', 'titleEn', 'subtitleAr', 'subtitleEn']

// The chip, title, subtitle and on/off switch of one landing page section (`pricing` or `testimonials`).
const SectionSettingsCard = ({ section, canUpdate }) => {
  const { t } = useTranslation()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorCode, setErrorCode] = useState(null)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    axios
      .get('/api/admin/landing/sections')
      .then(({ data }) => setForm(data.data[section]))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
  }, [section])

  const save = event => {
    event.preventDefault()
    setSaving(true)
    setErrorCode(null)
    axios
      .put(`/api/admin/landing/sections/${section}`, form)
      .then(({ data }) => {
        setForm(data.data)
        setToast(true)
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSaving(false))
  }

  return (
    <Card>
      <CardHeader title={t('admin.landing.section.title')} subheader={t('admin.landing.section.subtitle')} />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {form ? (
          <form onSubmit={save} noValidate>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.enabled)}
                      disabled={!canUpdate}
                      onChange={e => setForm({ ...form, enabled: e.target.checked })}
                    />
                  }
                  label={t('admin.landing.section.enabled')}
                />
              </Grid>
              {FIELDS.map(name => (
                <Grid item xs={12} sm={6} key={name}>
                  <CustomTextField
                    fullWidth
                    label={t(`admin.landing.section.${name}`)}
                    value={form[name] || ''}
                    disabled={!canUpdate}
                    onChange={e => setForm({ ...form, [name]: e.target.value })}
                  />
                </Grid>
              ))}
              {canUpdate ? (
                <Grid item xs={12}>
                  <Button type='submit' variant='contained' disabled={saving}>
                    {t('admin.common.save')}
                  </Button>
                </Grid>
              ) : null}
            </Grid>
          </form>
        ) : null}
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

export default SectionSettingsCard
