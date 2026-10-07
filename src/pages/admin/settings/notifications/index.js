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

// Same order as App\Billing\BillingNotifier::KINDS.
const KINDS = [
  'invoice_issued',
  'renewal_reminder',
  'payment_received',
  'payment_failed',
  'invoice_overdue',
  'tenant_suspended'
]

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// "30, 7" ⇄ [30, 7]. Invalid parts are sent as they are so the server answers invalid_reminder_days.
const daysToText = days => (days || []).join(', ')

const textToDays = text =>
  text
    .split(/[,،\s]+/)
    .filter(Boolean)
    .map(part => (/^\d+$/.test(part) ? Number(part) : part))

const NotificationSettingsPage = () => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)
  const canUpdate = Boolean(ability?.can('update', 'settings'))

  const [values, setValues] = useState(null)
  const [daysText, setDaysText] = useState('')
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  const apply = data => {
    setValues(data)
    setDaysText(daysToText(data.reminderDays))
  }

  useEffect(() => {
    axios
      .get('/api/admin/settings/notifications')
      .then(response => apply(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [])

  const toggle = name => e => setValues({ ...values, [name]: e.target.checked })

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put('/api/admin/settings/notifications', { ...values, reminderDays: textToDays(daysText) })
      .then(response => {
        apply(response.data.data)
        setToast(true)
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Card>
      <CardHeader
        title={t('admin.settings.notifications.title')}
        subheader={t('admin.settings.notifications.subtitle')}
      />
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
              <Typography variant='h6'>{t('admin.settings.notifications.clientEmails')}</Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {t('admin.settings.notifications.clientEmailsHelp')}
              </Typography>
            </Grid>
            {KINDS.map(kind => (
              <Grid item xs={12} sm={6} key={kind}>
                <FormControlLabel
                  control={<Switch checked={Boolean(values[kind])} onChange={toggle(kind)} disabled={!canUpdate} />}
                  label={t(`admin.settings.notifications.kind.${kind}`)}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                label={t('admin.settings.notifications.reminderDays')}
                helperText={t('admin.settings.notifications.reminderDaysHelp')}
                value={daysText}
                onChange={e => setDaysText(e.target.value)}
                disabled={!canUpdate || !values.renewal_reminder}
                inputProps={{ dir: 'ltr' }}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values.staffAlerts)}
                    onChange={toggle('staffAlerts')}
                    disabled={!canUpdate}
                  />
                }
                label={t('admin.settings.notifications.staffAlerts')}
              />
              <Typography variant='body2' sx={{ color: 'text.secondary', ps: 12 }}>
                {t('admin.settings.notifications.staffAlertsHelp')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Alert severity='info'>{t('admin.settings.notifications.mailNote')}</Alert>
            </Grid>
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

NotificationSettingsPage.acl = { action: 'read', subject: 'settings' }

export default NotificationSettingsPage
