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
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import StatusChip from 'src/views/admin/billing/StatusChip'
import { formatDate, formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const STATUSES = ['pending', 'succeeded', 'failed', 'canceled', 'refunded']
const METHODS = ['online', 'bank_transfer', 'cash', 'card']

const errorOf = err => err.response?.data?.error?.code || 'network_error'

const PaymentDialog = ({ paymentId, onClose, onChanged }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canRefund = Boolean(ability?.can('manage', 'billing'))

  const [payment, setPayment] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refund, setRefund] = useState({ amount: '', reason: '' })

  const load = () =>
    axios.get(`/api/admin/billing/payments/${paymentId}`).then(response => {
      setPayment(response.data.data)
      setRefund({ amount: response.data.data.refundable.toFixed(2), reason: '' })
    })

  useEffect(() => {
    if (!paymentId) return
    setPayment(null)
    setErrorCode(null)
    setRefundOpen(false)
    load().catch(err => setErrorCode(errorOf(err)))
  }, [paymentId])

  const run = request => {
    setBusy(true)
    setErrorCode(null)
    request
      .then(() => {
        setRefundOpen(false)
        onChanged()

        return load()
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setBusy(false))
  }

  return (
    <Dialog open={Boolean(paymentId)} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {t('admin.billing.payments.payment')}
        {payment ? <StatusChip status={payment.status} /> : null}
      </DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!payment ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              {[
                ['admin.billing.client', localName(payment, 'tenantName', lang)],
                ['admin.billing.invoices.invoice', payment.invoiceNumber],
                ['admin.billing.amount', formatMoney(payment.amount, payment.currency, lang)],
                ['admin.billing.payments.method', t(`admin.billing.method.${payment.method}`)],
                [
                  'admin.billing.payments.gateway',
                  payment.gatewayNameAr ? localName(payment, 'gatewayName', lang) : '-'
                ],
                ['admin.billing.payments.paidAt', formatDate(payment.paidAt, lang)],
                ['admin.billing.payments.reference', payment.reference || payment.gatewayReference || '-'],
                ['admin.billing.payments.refundable', formatMoney(payment.refundable, payment.currency, lang)]
              ].map(([label, value]) => (
                <Grid item xs={6} key={label}>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {t(label)}
                  </Typography>
                  <Typography sx={{ fontWeight: 500, wordBreak: 'break-all' }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>

            {payment.refunds.length ? (
              <>
                <Divider sx={{ mb: 3 }} />
                <Typography variant='h6' sx={{ mb: 2 }}>
                  {t('admin.billing.payments.refunds')}
                </Typography>
                {payment.refunds.map(r => (
                  <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 1.5 }}>
                    <Typography sx={{ fontWeight: 500 }}>{formatMoney(r.amount, payment.currency, lang)}</Typography>
                    <StatusChip status={r.status} />
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {formatDate(r.createdAt, lang)}
                    </Typography>
                    {r.reason ? <Typography variant='body2'>{r.reason}</Typography> : null}
                  </Box>
                ))}
              </>
            ) : null}

            {refundOpen ? (
              <Box sx={{ mt: 4, p: 4, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}` }}>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  {t('admin.billing.payments.refund')}
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={5}>
                    <CustomTextField
                      fullWidth
                      type='number'
                      label={t('admin.billing.amount')}
                      value={refund.amount}
                      onChange={e => setRefund({ ...refund, amount: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <CustomTextField
                      fullWidth
                      label={t('admin.billing.payments.reason')}
                      value={refund.reason}
                      onChange={e => setRefund({ ...refund, reason: e.target.value })}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                  <Button
                    variant='contained'
                    color='error'
                    disabled={busy || !refund.amount}
                    onClick={() =>
                      run(
                        axios.post(`/api/admin/billing/payments/${paymentId}/refund`, {
                          amount: Number(refund.amount),
                          reason: refund.reason || null
                        })
                      )
                    }
                  >
                    {t('admin.billing.payments.confirmRefund')}
                  </Button>
                  <Button variant='tonal' color='secondary' onClick={() => setRefundOpen(false)} disabled={busy}>
                    {t('admin.common.cancel')}
                  </Button>
                </Box>
              </Box>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6, gap: 2 }}>
        {payment?.status === 'pending' && payment.gatewayReference ? (
          <Button
            variant='tonal'
            startIcon={<Icon icon='tabler:refresh' />}
            disabled={busy}
            onClick={() => run(axios.post(`/api/admin/billing/payments/${paymentId}/sync`, {}))}
          >
            {t('admin.billing.payments.checkStatus')}
          </Button>
        ) : null}
        {canRefund && payment?.refundable > 0 && !refundOpen ? (
          <Button
            variant='tonal'
            color='error'
            startIcon={<Icon icon='tabler:receipt-refund' />}
            onClick={() => setRefundOpen(true)}
            disabled={busy}
          >
            {t('admin.billing.payments.refund')}
          </Button>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {t('admin.common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const PaymentsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const list = useApiList('/api/admin/billing/payments', { search, status, method })
  const [openPayment, setOpenPayment] = useState(null)

  const columns = [
    {
      key: 'invoice',
      label: t('admin.billing.invoices.invoice'),
      render: p => <Typography sx={{ fontWeight: 500 }}>{p.invoiceNumber}</Typography>
    },
    { key: 'tenant', label: t('admin.billing.client'), render: p => localName(p, 'tenantName', lang) },
    { key: 'amount', label: t('admin.billing.amount'), render: p => formatMoney(p.amount, p.currency, lang) },
    { key: 'method', label: t('admin.billing.payments.method'), render: p => t(`admin.billing.method.${p.method}`) },
    { key: 'status', label: t('admin.billing.statusLabel'), render: p => <StatusChip status={p.status} /> },
    { key: 'date', label: t('admin.billing.payments.paidAt'), render: p => formatDate(p.paidAt || p.createdAt, lang) }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.billing.payments.title')}
            subheader={
              list.meta.receivedTotal !== undefined
                ? t('admin.billing.payments.receivedTotal', {
                    amount: formatMoney(list.meta.receivedTotal, 'AED', lang)
                  })
                : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.billing.payments.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <CustomTextField
                select
                sx={{ minWidth: 160 }}
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
              <CustomTextField
                select
                sx={{ minWidth: 160 }}
                label={t('admin.billing.payments.method')}
                value={method}
                onChange={e => setMethod(e.target.value)}
              >
                <MenuItem value=''>{t('admin.common.all')}</MenuItem>
                {METHODS.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.billing.method.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>
            <DataTable
              columns={columns}
              list={list}
              emptyKey='admin.billing.payments.empty'
              onRowClick={p => setOpenPayment(p.id)}
            />
          </CardContent>
        </Card>
      </Grid>
      <PaymentDialog paymentId={openPayment} onClose={() => setOpenPayment(null)} onChanged={list.reload} />
    </Grid>
  )
}

PaymentsPage.acl = { action: 'read', subject: 'billing' }

export default PaymentsPage
