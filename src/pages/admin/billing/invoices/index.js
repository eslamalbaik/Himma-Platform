// ** React Imports
import { useContext, useEffect, useState } from 'react'

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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'

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

const STATUSES = ['unpaid', 'paid', 'void', 'refunded']
const MANUAL_METHODS = ['bank_transfer', 'cash', 'card']

const errorOf = err => err.response?.data?.error?.code || 'network_error'

const IssueInvoiceDialog = ({ open, onClose, onSaved }) => {
  const { t } = useTranslation()
  const [tenant, setTenant] = useState(null)
  const [amount, setAmount] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    if (open) {
      setTenant(null)
      setAmount('')
      setDueAt('')
      setErrorCode(null)
    }
  }, [open])

  const submit = () => {
    setSubmitting(true)
    axios
      .post('/api/admin/billing/invoices', { tenantId: tenant?.id, amount: Number(amount), dueAt: dueAt || null })
      .then(() => onSaved())
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.billing.invoices.addTitle')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TenantPicker value={tenant} onChange={setTenant} label={t('admin.billing.client')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='number'
              label={t('admin.billing.amount')}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              type='date'
              InputLabelProps={{ shrink: true }}
              label={t('admin.billing.invoices.dueAt')}
              helperText={t('admin.billing.invoices.dueAtHelp')}
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' onClick={submit} disabled={submitting || !tenant || !amount}>
          {t('admin.billing.invoices.issue')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Invoice details with its payments and the actions finance and sales can take on it.
const InvoiceDialog = ({ invoiceId, onClose, onChanged }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canRecord = Boolean(ability?.can('update', 'billing'))
  const canCheckout = Boolean(ability?.can('create', 'billing'))

  const [invoice, setInvoice] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null) // 'record' | 'void'
  const [payment, setPayment] = useState({ amount: '', method: 'bank_transfer', reference: '', paidAt: '' })
  const [paymentLink, setPaymentLink] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = () =>
    axios.get(`/api/admin/billing/invoices/${invoiceId}`).then(response => {
      const data = response.data.data
      setInvoice(data)
      setPayment(p => ({ ...p, amount: Math.max(data.amount - data.paidAmount, 0).toFixed(2) }))
    })

  useEffect(() => {
    if (!invoiceId) return
    setInvoice(null)
    setErrorCode(null)
    setMode(null)
    setPaymentLink(null)
    setCopied(false)
    load().catch(err => setErrorCode(errorOf(err)))
  }, [invoiceId])

  const run = (request, after) => {
    setBusy(true)
    setErrorCode(null)
    request
      .then(response => {
        after?.(response)
        onChanged()

        return load()
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setBusy(false))
  }

  const recordPayment = () =>
    run(
      axios.post('/api/admin/billing/payments', {
        invoiceId,
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference || null,
        paidAt: payment.paidAt || null
      }),
      () => setMode(null)
    )

  const createLink = () =>
    run(axios.post(`/api/admin/billing/invoices/${invoiceId}/checkout`, {}), response =>
      setPaymentLink(response.data.data.checkoutUrl)
    )

  const voidInvoice = () => run(axios.post(`/api/admin/billing/invoices/${invoiceId}/void`, {}), () => setMode(null))

  const copyLink = () => {
    navigator.clipboard?.writeText(paymentLink).then(() => setCopied(true))
  }

  const balance = invoice ? Math.max(invoice.amount - invoice.paidAmount, 0) : 0
  const unpaid = invoice?.status === 'unpaid'

  return (
    <Dialog open={Boolean(invoiceId)} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {t('admin.billing.invoices.invoice')} {invoice?.number}
        {invoice ? <StatusChip status={invoice.status} /> : null}
      </DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!invoice ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              {[
                ['admin.billing.client', localName(invoice, 'tenantName', lang)],
                ['admin.billing.amount', formatMoney(invoice.amount, invoice.currency, lang)],
                ['admin.billing.invoices.paid', formatMoney(invoice.paidAmount, invoice.currency, lang)],
                ['admin.billing.invoices.balance', formatMoney(balance, invoice.currency, lang)],
                ['admin.billing.invoices.issuedAt', formatDate(invoice.issuedAt, lang)],
                ['admin.billing.invoices.dueAt', formatDate(invoice.dueAt, lang)],
                ...(invoice.periodStart
                  ? [
                      [
                        'admin.billing.invoices.period',
                        `${formatDate(invoice.periodStart, lang)} — ${formatDate(invoice.periodEnd, lang)}`
                      ]
                    ]
                  : [])
              ].map(([label, value]) => (
                <Grid item xs={6} sm={4} key={label}>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {t(label)}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mb: 4 }} />
            <Typography variant='h6' sx={{ mb: 2 }}>
              {t('admin.billing.payments.title')}
            </Typography>
            {invoice.payments.length === 0 ? (
              <Typography sx={{ color: 'text.secondary', mb: 4 }}>{t('admin.billing.payments.empty')}</Typography>
            ) : (
              invoice.payments.map(p => (
                <Box
                  key={p.id}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 3,
                    py: 2,
                    borderBottom: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Typography sx={{ fontWeight: 500, minWidth: 120 }}>
                    {formatMoney(p.amount, p.currency, lang)}
                  </Typography>
                  <Typography sx={{ minWidth: 120 }}>{t(`admin.billing.method.${p.method}`)}</Typography>
                  <StatusChip status={p.status} />
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {formatDate(p.paidAt || p.createdAt, lang)}
                  </Typography>
                  {p.reference ? (
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {p.reference}
                    </Typography>
                  ) : null}
                </Box>
              ))
            )}

            {paymentLink ? (
              <Alert severity='success' sx={{ mt: 4 }}>
                <Typography sx={{ mb: 2 }}>{t('admin.billing.invoices.linkReady')}</Typography>
                <CustomTextField
                  fullWidth
                  value={paymentLink}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton onClick={copyLink} aria-label={t('admin.billing.invoices.copy')}>
                          <Icon icon={copied ? 'tabler:check' : 'tabler:copy'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Alert>
            ) : null}

            {mode === 'record' ? (
              <Box sx={{ mt: 4, p: 4, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}` }}>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  {t('admin.billing.invoices.recordPayment')}
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={3}>
                    <CustomTextField
                      fullWidth
                      type='number'
                      label={t('admin.billing.amount')}
                      value={payment.amount}
                      onChange={e => setPayment({ ...payment, amount: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <CustomTextField
                      select
                      fullWidth
                      label={t('admin.billing.payments.method')}
                      value={payment.method}
                      onChange={e => setPayment({ ...payment, method: e.target.value })}
                    >
                      {MANUAL_METHODS.map(m => (
                        <MenuItem key={m} value={m}>
                          {t(`admin.billing.method.${m}`)}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <CustomTextField
                      fullWidth
                      label={t('admin.billing.payments.reference')}
                      value={payment.reference}
                      onChange={e => setPayment({ ...payment, reference: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <CustomTextField
                      fullWidth
                      type='date'
                      InputLabelProps={{ shrink: true }}
                      label={t('admin.billing.payments.paidAt')}
                      value={payment.paidAt}
                      onChange={e => setPayment({ ...payment, paidAt: e.target.value })}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                  <Button variant='contained' onClick={recordPayment} disabled={busy || !payment.amount}>
                    {t('admin.common.save')}
                  </Button>
                  <Button variant='tonal' color='secondary' onClick={() => setMode(null)} disabled={busy}>
                    {t('admin.common.cancel')}
                  </Button>
                </Box>
              </Box>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6, flexWrap: 'wrap', gap: 2 }}>
        {unpaid && canRecord ? (
          <Button variant='tonal' color='error' onClick={() => setMode('void')} disabled={busy}>
            {t('admin.billing.invoices.void')}
          </Button>
        ) : null}
        {invoice ? (
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:file-download' />}
            component='a'
            href={`/api/admin/billing/invoices/${invoiceId}/pdf`}
            target='_blank'
            rel='noopener'
          >
            {t('admin.billing.invoices.downloadPdf')}
          </Button>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {unpaid && canCheckout ? (
          <Button variant='tonal' startIcon={<Icon icon='tabler:link' />} onClick={createLink} disabled={busy}>
            {t('admin.billing.invoices.createLink')}
          </Button>
        ) : null}
        {unpaid && canRecord ? (
          <Button
            variant='contained'
            startIcon={<Icon icon='tabler:cash' />}
            onClick={() => setMode('record')}
            disabled={busy}
          >
            {t('admin.billing.invoices.recordPayment')}
          </Button>
        ) : null}
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {t('admin.common.close')}
        </Button>
      </DialogActions>

      <ConfirmDialog
        open={mode === 'void'}
        title={t('admin.billing.invoices.voidTitle')}
        message={t('admin.billing.invoices.voidMessage', { number: invoice?.number })}
        confirmLabel={t('admin.billing.invoices.void')}
        submitting={busy}
        onConfirm={voidInvoice}
        onClose={() => setMode(null)}
      />
    </Dialog>
  )
}

const InvoicesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'billing'))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [overdue, setOverdue] = useState(false)
  const list = useApiList('/api/admin/billing/invoices', { search, status, overdue: overdue ? 'true' : '' })

  const [issueOpen, setIssueOpen] = useState(false)
  const [openInvoice, setOpenInvoice] = useState(null)
  const [toast, setToast] = useState(null)

  const isOverdue = invoice =>
    invoice.status === 'unpaid' && invoice.dueAt && new Date(invoice.dueAt) < new Date(new Date().toDateString())

  const columns = [
    {
      key: 'number',
      label: t('admin.billing.invoices.number'),
      render: inv => <Typography sx={{ fontWeight: 500 }}>{inv.number}</Typography>
    },
    { key: 'tenant', label: t('admin.billing.client'), render: inv => localName(inv, 'tenantName', lang) },
    { key: 'amount', label: t('admin.billing.amount'), render: inv => formatMoney(inv.amount, inv.currency, lang) },
    {
      key: 'paid',
      label: t('admin.billing.invoices.paid'),
      render: inv => formatMoney(inv.paidAmount, inv.currency, lang)
    },
    { key: 'status', label: t('admin.billing.statusLabel'), render: inv => <StatusChip status={inv.status} /> },
    {
      key: 'dueAt',
      label: t('admin.billing.invoices.dueAt'),
      render: inv => (
        <Typography sx={{ color: isOverdue(inv) ? 'error.main' : 'inherit' }}>{formatDate(inv.dueAt, lang)}</Typography>
      )
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.billing.invoices.title')}
            subheader={
              list.meta.unpaidTotal !== undefined
                ? t('admin.billing.invoices.unpaidTotal', { amount: formatMoney(list.meta.unpaidTotal, 'AED', lang) })
                : null
            }
            action={
              canCreate ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => setIssueOpen(true)}>
                  {t('admin.billing.invoices.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.billing.invoices.searchPlaceholder')}
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
              <FormControlLabel
                control={<Checkbox checked={overdue} onChange={e => setOverdue(e.target.checked)} />}
                label={t('admin.billing.invoices.overdueOnly')}
              />
            </Box>
            <DataTable
              columns={columns}
              list={list}
              emptyKey='admin.billing.invoices.empty'
              onRowClick={inv => setOpenInvoice(inv.id)}
            />
          </CardContent>
        </Card>
      </Grid>

      <IssueInvoiceDialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onSaved={() => {
          setIssueOpen(false)
          setToast('admin.common.saved')
          list.reload()
        }}
      />
      <InvoiceDialog invoiceId={openInvoice} onClose={() => setOpenInvoice(null)} onChanged={list.reload} />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Grid>
  )
}

InvoicesPage.acl = { action: 'read', subject: 'billing' }

export default InvoicesPage
