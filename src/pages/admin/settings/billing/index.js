// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { localName, pickLang } from 'src/views/admin/billing/format'

const DRIVERS = ['ziina', 'manual']
const SECRETS = [
  ['apiKey', 'hasApiKey'],
  ['apiSecret', 'hasApiSecret'],
  ['publicKey', 'hasPublicKey'],
  ['webhookSecret', 'hasWebhookSecret']
]

const emptyGateway = {
  driver: 'ziina',
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  apiKey: '',
  apiSecret: '',
  publicKey: '',
  webhookSecret: '',
  baseUrl: '',
  sortOrder: 0,
  isActive: true,
  testMode: true
}

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Secrets are never sent back by the server: an empty field keeps the stored value.
const GatewayDialog = ({ open, gateway, onClose, onSaved }) => {
  const { t } = useTranslation()
  const [values, setValues] = useState(emptyGateway)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    if (!open) return
    setErrorCode(null)
    setValues(
      gateway
        ? {
            ...emptyGateway,
            ...gateway,
            descriptionAr: gateway.descriptionAr || '',
            descriptionEn: gateway.descriptionEn || '',
            baseUrl: gateway.baseUrl || '',
            apiKey: '',
            apiSecret: '',
            publicKey: '',
            webhookSecret: ''
          }
        : emptyGateway
    )
  }, [open, gateway])

  const set = name => e =>
    setValues({ ...values, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = () => {
    setSubmitting(true)
    setErrorCode(null)
    const payload = { ...values, sortOrder: Number(values.sortOrder) || 0 }
    const request = gateway
      ? axios.put(`/api/admin/billing/gateways/${gateway.id}`, payload)
      : axios.post('/api/admin/billing/gateways', payload)
    request
      .then(() => onSaved())
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t(gateway ? 'admin.billing.gateways.editTitle' : 'admin.billing.gateways.addTitle')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4} sx={{ pt: 1 }}>
          {!gateway ? (
            <Grid item xs={12}>
              <CustomTextField
                select
                fullWidth
                label={t('admin.billing.gateways.driver')}
                value={values.driver}
                onChange={set('driver')}
              >
                {DRIVERS.map(d => (
                  <MenuItem key={d} value={d}>
                    {t(`admin.billing.gateways.drivers.${d}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          ) : null}
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              required
              label={t('admin.billing.gateways.nameEn')}
              value={values.nameEn}
              onChange={set('nameEn')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              required
              label={t('admin.billing.gateways.nameAr')}
              value={values.nameAr}
              onChange={set('nameAr')}
            />
          </Grid>
          {values.driver !== 'manual'
            ? SECRETS.map(([name, hasFlag]) => (
                <Grid item xs={12} sm={6} key={name}>
                  <CustomTextField
                    fullWidth
                    type='password'
                    autoComplete='new-password'
                    label={t(`admin.billing.gateways.${name}`)}
                    placeholder={
                      gateway?.[hasFlag]
                        ? t('admin.billing.gateways.secretKept')
                        : t('admin.billing.gateways.secretPlaceholder', { name: t(`admin.billing.gateways.${name}`) })
                    }
                    helperText={
                      name === 'apiKey' && values.driver === 'ziina' ? t('admin.billing.gateways.ziinaKeyHelp') : null
                    }
                    value={values[name]}
                    onChange={set(name)}
                  />
                </Grid>
              ))
            : null}
          {values.driver !== 'manual' ? (
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                label={t('admin.billing.gateways.baseUrl')}
                placeholder='https://api-v2.ziina.com/api'
                helperText={t('admin.billing.gateways.baseUrlHelp')}
                value={values.baseUrl}
                onChange={set('baseUrl')}
              />
            </Grid>
          ) : null}
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='number'
              label={t('admin.billing.gateways.sortOrder')}
              value={values.sortOrder}
              onChange={set('sortOrder')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label={t('admin.billing.gateways.descriptionEn')}
              value={values.descriptionEn}
              onChange={set('descriptionEn')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label={t('admin.billing.gateways.descriptionAr')}
              value={values.descriptionAr}
              onChange={set('descriptionAr')}
            />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', gap: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={values.isActive} onChange={set('isActive')} />}
              label={t('admin.billing.gateways.isActive')}
            />
            {values.driver !== 'manual' ? (
              <FormControlLabel
                control={<Checkbox checked={values.testMode} onChange={set('testMode')} />}
                label={t('admin.billing.gateways.testMode')}
              />
            ) : null}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' onClick={submit} disabled={submitting}>
          {t('admin.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const BillingRulesCard = ({ onSaved }) => {
  const { t } = useTranslation()
  const [values, setValues] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    axios
      .get('/api/admin/billing/settings')
      .then(response => setValues(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [])

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put('/api/admin/billing/settings', values)
      .then(response => {
        setValues(response.data.data)
        onSaved()
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Card>
      <CardHeader title={t('admin.billing.rules.title')} subheader={t('admin.billing.rules.subtitle')} />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!values ? (
          <CircularProgress size={28} />
        ) : (
          <Grid container spacing={4}>
            {[
              ['currency', 'text'],
              ['invoiceDueDays', 'number'],
              ['renewDaysBefore', 'number'],
              ['graceDays', 'number']
            ].map(([name, type]) => (
              <Grid item xs={12} sm={6} md={3} key={name}>
                <CustomTextField
                  fullWidth
                  type={type}
                  label={t(`admin.billing.rules.${name}`)}
                  helperText={t(`admin.billing.rules.${name}Help`)}
                  value={values[name]}
                  onChange={e =>
                    setValues({ ...values, [name]: type === 'number' ? Number(e.target.value) : e.target.value })
                  }
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button variant='contained' onClick={save} disabled={submitting}>
                {t('admin.common.save')}
              </Button>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  )
}

const BillingSettingsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const [gateways, setGateways] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [dialog, setDialog] = useState({ open: false, gateway: null })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const load = () =>
    axios
      .get('/api/admin/billing/gateways')
      .then(response => setGateways(response.data.data))
      .catch(err => setLoadError(errorOf(err)))

  useEffect(() => {
    load()
  }, [])

  const registerWebhook = gateway => {
    setBusy(true)
    setActionError(null)
    axios
      .post(`/api/admin/billing/gateways/${gateway.id}/register-webhook`, {})
      .then(() => setToast('admin.billing.gateways.webhookRegistered'))
      .catch(err => setActionError(errorOf(err)))
      .finally(() => setBusy(false))
  }

  const remove = () => {
    setBusy(true)
    setActionError(null)
    axios
      .delete(`/api/admin/billing/gateways/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setToast('admin.common.deleted')
        load()
      })
      .catch(err => setActionError(errorOf(err)))
      .finally(() => setBusy(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.billing.gateways.title')}
            subheader={gateways ? t('admin.billing.gateways.total', { count: gateways.length }) : null}
            action={
              <Button
                variant='contained'
                startIcon={<Icon icon='tabler:plus' />}
                onClick={() => setDialog({ open: true, gateway: null })}
              >
                {t('admin.billing.gateways.add')}
              </Button>
            }
          />
          <CardContent>
            {loadError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`errors.${loadError}`)}
              </Alert>
            ) : null}
            {actionError && !deleteTarget ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`errors.${actionError}`)}
              </Alert>
            ) : null}
            {!gateways ? (
              <CircularProgress size={28} />
            ) : gateways.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>{t('admin.billing.gateways.empty')}</Typography>
            ) : (
              <Grid container spacing={4}>
                {gateways.map(gateway => (
                  <Grid item xs={12} md={6} key={gateway.id}>
                    <Box
                      sx={{
                        p: 4,
                        height: '100%',
                        borderRadius: 1,
                        border: theme => `1px solid ${theme.palette.divider}`
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant='h6' sx={{ flex: 1 }}>
                          {localName(gateway, 'name', lang)}
                        </Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={gateway.isActive ? 'success' : 'secondary'}
                          label={t(
                            gateway.isActive ? 'admin.billing.gateways.active' : 'admin.billing.gateways.inactive'
                          )}
                        />
                        {gateway.driver !== 'manual' && gateway.testMode ? (
                          <Chip
                            size='small'
                            variant='tonal'
                            color='warning'
                            label={t('admin.billing.gateways.testMode')}
                          />
                        ) : null}
                        <IconButton
                          size='small'
                          aria-label={t('admin.common.edit')}
                          onClick={() => setDialog({ open: true, gateway })}
                        >
                          <Icon icon='tabler:edit' fontSize='1.25rem' />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          aria-label={t('admin.common.delete')}
                          onClick={() => {
                            setActionError(null)
                            setDeleteTarget(gateway)
                          }}
                        >
                          <Icon icon='tabler:trash' fontSize='1.25rem' />
                        </IconButton>
                      </Box>
                      <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3 }}>
                        {(lang === 'en' ? gateway.descriptionEn : gateway.descriptionAr) ||
                          t(`admin.billing.gateways.drivers.${gateway.driver}`)}
                      </Typography>
                      {gateway.driver !== 'manual' ? (
                        <>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                            {SECRETS.map(([name, hasFlag]) => (
                              <Chip
                                key={name}
                                size='small'
                                variant='outlined'
                                color={gateway[hasFlag] ? 'success' : 'default'}
                                icon={
                                  <Icon icon={gateway[hasFlag] ? 'tabler:check' : 'tabler:minus'} fontSize='1rem' />
                                }
                                label={t(`admin.billing.gateways.${name}`)}
                              />
                            ))}
                          </Box>
                          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            {t('admin.billing.gateways.webhookUrl')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ mb: 3, direction: 'ltr', textAlign: 'start', wordBreak: 'break-all' }}
                          >
                            {gateway.webhookUrl}
                          </Typography>
                          <Button
                            size='small'
                            variant='tonal'
                            startIcon={<Icon icon='tabler:plug-connected' />}
                            disabled={busy || !gateway.hasApiKey}
                            onClick={() => registerWebhook(gateway)}
                          >
                            {t('admin.billing.gateways.registerWebhook')}
                          </Button>
                        </>
                      ) : null}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <BillingRulesCard onSaved={() => setToast('admin.common.saved')} />
      </Grid>

      <GatewayDialog
        open={dialog.open}
        gateway={dialog.gateway}
        onClose={() => setDialog({ open: false, gateway: null })}
        onSaved={() => {
          setDialog({ open: false, gateway: null })
          setToast('admin.common.saved')
          load()
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.billing.gateways.deleteTitle')}
        message={t('admin.billing.gateways.deleteMessage', { name: localName(deleteTarget, 'name', lang) })}
        confirmLabel={t('admin.common.delete')}
        submitting={busy}
        errorCode={actionError}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Grid>
  )
}

BillingSettingsPage.acl = { action: 'manage', subject: 'billing' }

export default BillingSettingsPage
