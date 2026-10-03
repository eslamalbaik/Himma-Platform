// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import StatusChip from 'src/views/admin/billing/StatusChip'
import TenantPicker from 'src/views/admin/billing/TenantPicker'
import { formatDate, formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const STATUSES = ['trial', 'active', 'past_due', 'cancelled']

const today = () => new Date().toISOString().slice(0, 10)

// Start a subscription (`subscription` null) or change the plan / paid-until date of one.
const SubscriptionDialog = ({ open, subscription, onClose, onSaved }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [plans, setPlans] = useState([])
  const [tenant, setTenant] = useState(null)
  const [planId, setPlanId] = useState('')
  const [startsAt, setStartsAt] = useState(today())
  const [trialDays, setTrialDays] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    if (!open) return
    setErrorCode(null)
    setTenant(null)
    setPlanId(subscription?.planId || '')
    setStartsAt(today())
    setTrialDays('')
    setEndsAt(subscription?.endsAt || '')
    axios
      .get('/api/admin/billing/plans', { params: { active: 'true', perPage: 100 } })
      .then(response => setPlans(response.data.data))
  }, [open, subscription])

  const submit = () => {
    setSubmitting(true)
    setErrorCode(null)
    const request = subscription
      ? axios.put(`/api/admin/billing/subscriptions/${subscription.id}`, { planId, endsAt: endsAt || null })
      : axios.post('/api/admin/billing/subscriptions', {
          tenantId: tenant?.id,
          planId,
          startsAt,
          trialDays: trialDays === '' ? 0 : Number(trialDays)
        })
    request
      .then(() => onSaved())
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        {t(subscription ? 'admin.billing.subscriptions.editTitle' : 'admin.billing.subscriptions.addTitle')}
      </DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4} sx={{ pt: 1 }}>
          {subscription ? (
            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 500 }}>{localName(subscription, 'tenantName', lang)}</Typography>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <TenantPicker value={tenant} onChange={setTenant} label={t('admin.billing.client')} />
            </Grid>
          )}
          <Grid item xs={12}>
            <CustomTextField
              select
              fullWidth
              label={t('admin.billing.plan')}
              value={planId}
              onChange={e => setPlanId(e.target.value)}
            >
              {plans.map(plan => (
                <MenuItem key={plan.id} value={plan.id}>
                  {localName(plan, 'name', lang)} — {formatMoney(plan.price, plan.currency, lang)} /{' '}
                  {t(`admin.billing.interval.${plan.interval}`)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          {subscription ? (
            <Grid item xs={12}>
              <CustomTextField
                fullWidth
                type='date'
                InputLabelProps={{ shrink: true }}
                label={t('admin.billing.subscriptions.paidUntil')}
                helperText={t('admin.billing.subscriptions.paidUntilHelp')}
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
              />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  InputLabelProps={{ shrink: true }}
                  label={t('admin.billing.subscriptions.startsAt')}
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label={t('admin.billing.subscriptions.trialDays')}
                  helperText={t('admin.billing.subscriptions.trialHelp')}
                  value={trialDays}
                  onChange={e => setTrialDays(e.target.value)}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' onClick={submit} disabled={submitting || !planId || (!subscription && !tenant)}>
          {t('admin.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const SubscriptionsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'billing'))
  const canUpdate = Boolean(ability?.can('update', 'billing'))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const list = useApiList('/api/admin/billing/subscriptions', { search, status })

  const [dialog, setDialog] = useState({ open: false, subscription: null })
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelError, setCancelError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const cancel = () => {
    setSubmitting(true)
    axios
      .post(`/api/admin/billing/subscriptions/${cancelTarget.id}/cancel`, {})
      .then(() => {
        setCancelTarget(null)
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(err => setCancelError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const columns = [
    {
      key: 'tenant',
      label: t('admin.billing.client'),
      render: s => <Typography sx={{ fontWeight: 500 }}>{localName(s, 'tenantName', lang)}</Typography>
    },
    {
      key: 'plan',
      label: t('admin.billing.plan'),
      render: s => `${localName(s, 'planName', lang)} — ${formatMoney(s.price, s.currency, lang)}`
    },
    { key: 'status', label: t('admin.billing.statusLabel'), render: s => <StatusChip status={s.status} /> },
    { key: 'startsAt', label: t('admin.billing.subscriptions.startsAt'), render: s => formatDate(s.startsAt, lang) },
    { key: 'endsAt', label: t('admin.billing.subscriptions.paidUntil'), render: s => formatDate(s.endsAt, lang) },
    ...(canUpdate
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: s =>
              s.status === 'cancelled' ? null : (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <IconButton
                    size='small'
                    aria-label={t('admin.common.edit')}
                    onClick={() => setDialog({ open: true, subscription: s })}
                  >
                    <Icon icon='tabler:edit' fontSize='1.25rem' />
                  </IconButton>
                  <IconButton
                    size='small'
                    color='error'
                    aria-label={t('admin.billing.subscriptions.cancel')}
                    onClick={() => {
                      setCancelError(null)
                      setCancelTarget(s)
                    }}
                  >
                    <Icon icon='tabler:circle-x' fontSize='1.25rem' />
                  </IconButton>
                </Box>
              )
          }
        ]
      : [])
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.billing.subscriptions.title')}
            subheader={t('admin.billing.subscriptions.subtitle')}
            action={
              canCreate ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => setDialog({ open: true, subscription: null })}
                >
                  {t('admin.billing.subscriptions.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.billing.searchClient')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <CustomTextField
                select
                sx={{ minWidth: 180 }}
                label={t('admin.billing.statusLabel')}
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <MenuItem value=''>{t('admin.common.all')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.billing.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>
            <DataTable columns={columns} list={list} emptyKey='admin.billing.subscriptions.empty' />
          </CardContent>
        </Card>
      </Grid>

      <SubscriptionDialog
        open={dialog.open}
        subscription={dialog.subscription}
        onClose={() => setDialog({ open: false, subscription: null })}
        onSaved={() => {
          setDialog({ open: false, subscription: null })
          setToast('admin.common.saved')
          list.reload()
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={t('admin.billing.subscriptions.cancelTitle')}
        message={t('admin.billing.subscriptions.cancelMessage', { name: localName(cancelTarget, 'tenantName', lang) })}
        confirmLabel={t('admin.billing.subscriptions.cancel')}
        submitting={submitting}
        errorCode={cancelError}
        onConfirm={cancel}
        onClose={() => setCancelTarget(null)}
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

SubscriptionsPage.acl = { action: 'read', subject: 'billing' }

export default SubscriptionsPage
