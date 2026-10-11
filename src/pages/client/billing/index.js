// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Hooks
import useApiList from 'src/hooks/useApiList'

// ** Views
import DataTable from 'src/views/admin/billing/DataTable'
import StatusChip from 'src/views/admin/billing/StatusChip'
import InvoiceDetailsDialog from 'src/views/client/InvoiceDetailsDialog'
import { formatDate, formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const STATUSES = ['unpaid', 'paid', 'void', 'refunded']

const isOverdue = invoice => invoice.status === 'unpaid' && invoice.dueAt && new Date(invoice.dueAt) < new Date()

// Client dashboard → Billing: the organisation's subscription and invoices, each invoice as a PDF, and online
// payment of what is still owed (the payer goes to the gateway's page and comes back to /billing/payment-result).
const ClientBillingPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const [summary, setSummary] = useState(null)
  const [summaryError, setSummaryError] = useState(null)
  const [status, setStatus] = useState('')
  const list = useApiList('/api/client/billing/invoices', { status })

  const [details, setDetails] = useState(null)
  const [paying, setPaying] = useState(null)
  const [payError, setPayError] = useState(null)
  const [gatewayMenu, setGatewayMenu] = useState(null)

  useEffect(() => {
    axios
      .get('/api/client/billing')
      .then(response => setSummary(response.data.data))
      .catch(err => setSummaryError(err.response?.data?.error?.code || 'network_error'))
  }, [])

  const gateways = summary?.gateways || []

  const pay = (invoice, gatewayId) => {
    setGatewayMenu(null)
    setPaying(invoice.id)
    setPayError(null)
    axios
      .post(`/api/client/billing/invoices/${invoice.id}/pay`, gatewayId ? { gatewayId } : {})
      .then(response => {
        window.location.assign(response.data.data.checkoutUrl)
      })
      .catch(err => {
        setPayError(err.response?.data?.error?.code || 'network_error')
        setPaying(null)
      })
  }

  const startPay = (event, invoice) => {
    if (gateways.length > 1) {
      setGatewayMenu({ anchor: event.currentTarget, invoice })
    } else {
      pay(invoice)
    }
  }

  const openPdf = invoice => window.open(`/api/client/billing/invoices/${invoice.id}/pdf`, '_blank', 'noopener')

  const columns = [
    {
      key: 'number',
      label: t('client.billing.table.number'),
      render: row => (
        <Typography
          component='button'
          onClick={() => setDetails(row)}
          sx={{ border: 0, p: 0, background: 'none', cursor: 'pointer', color: 'primary.main', font: 'inherit' }}
        >
          <bdi>{row.number}</bdi>
        </Typography>
      )
    },
    {
      key: 'period',
      label: t('client.billing.table.period'),
      render: row =>
        row.periodStart ? `${formatDate(row.periodStart, lang)} – ${formatDate(row.periodEnd, lang)}` : '-'
    },
    {
      key: 'amount',
      label: t('client.billing.table.amount'),
      render: row => formatMoney(row.amount, row.currency, lang)
    },
    {
      key: 'balance',
      label: t('client.billing.table.balance'),
      render: row => (row.status === 'unpaid' ? formatMoney(row.balance, row.currency, lang) : '-')
    },
    {
      key: 'dueAt',
      label: t('client.billing.table.dueAt'),
      render: row => (
        <Typography variant='body2' sx={{ color: isOverdue(row) ? 'error.main' : 'inherit' }}>
          {formatDate(row.dueAt, lang)}
          {isOverdue(row) ? ` · ${t('client.billing.overdue')}` : ''}
        </Typography>
      )
    },
    { key: 'status', label: t('client.billing.table.status'), render: row => <StatusChip status={row.status} /> },
    {
      key: 'actions',
      label: t('client.billing.table.actions'),
      align: 'right',
      render: row => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
          <Tooltip title={t('client.billing.pdf')}>
            <IconButton size='small' onClick={() => openPdf(row)} aria-label={t('client.billing.pdf')}>
              <Icon icon='tabler:file-download' fontSize='1.25rem' />
            </IconButton>
          </Tooltip>
          {row.status === 'unpaid' && row.balance > 0 ? (
            <Button
              size='small'
              variant='contained'
              disabled={!gateways.length || Boolean(paying)}
              onClick={event => startPay(event, row)}
              startIcon={paying === row.id ? <CircularProgress size={14} color='inherit' /> : null}
            >
              {t('client.billing.pay')}
            </Button>
          ) : null}
        </Box>
      )
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('client.billing.subscription')} />
          <CardContent>
            {summaryError ? <Alert severity='error'>{t(`errors.${summaryError}`)}</Alert> : null}
            {!summary && !summaryError ? <CircularProgress size={24} /> : null}
            {summary && summary.subscriptions.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>{t('client.home.noSubscription')}</Typography>
            ) : null}
            <Grid container spacing={4}>
              {(summary?.subscriptions || []).map(sub => (
                <Grid item xs={12} md={6} key={sub.id}>
                  <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                      <Typography variant='h5'>{localName(sub, 'planName', lang)}</Typography>
                      <StatusChip status={sub.status} />
                    </Box>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {t(`client.home.price.${sub.interval}`, { amount: formatMoney(sub.price, sub.currency, lang) })}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {t('client.home.period', {
                        from: formatDate(sub.startsAt, lang),
                        to: formatDate(sub.endsAt, lang)
                      })}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('client.billing.invoices')}
            subheader={summary && !gateways.length ? t('client.billing.noGateway') : t('client.billing.invoicesHint')}
            action={
              <CustomTextField
                select
                SelectProps={{ displayEmpty: true }}
                sx={{ minWidth: 180 }}
                value={status}
                onChange={e => setStatus(e.target.value)}
                aria-label={t('client.billing.filterStatus')}
              >
                <MenuItem value=''>{t('client.billing.allStatuses')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.billing.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            }
          />
          <CardContent>
            {payError ? (
              <Alert severity='error' sx={{ mb: 4 }} onClose={() => setPayError(null)}>
                {t(`errors.${payError}`)}
              </Alert>
            ) : null}
            <DataTable columns={columns} list={list} emptyKey='client.billing.empty' />
          </CardContent>
        </Card>
      </Grid>

      <Menu anchorEl={gatewayMenu?.anchor} open={Boolean(gatewayMenu)} onClose={() => setGatewayMenu(null)}>
        {gateways.map(gateway => (
          <MenuItem key={gateway.id} onClick={() => pay(gatewayMenu.invoice, gateway.id)}>
            {t('client.billing.payWith', { gateway: localName(gateway, 'name', lang) })}
          </MenuItem>
        ))}
      </Menu>

      <InvoiceDetailsDialog invoiceId={details?.id} onClose={() => setDetails(null)} onPdf={openPdf} />
    </Grid>
  )
}

ClientBillingPage.acl = {
  action: 'general_settings:allowed',
  subject: 'client'
}

export default ClientBillingPage
