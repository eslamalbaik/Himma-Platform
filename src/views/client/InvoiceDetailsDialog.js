// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

// ** Views
import StatusChip from 'src/views/admin/billing/StatusChip'
import { formatDate, formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const Row = ({ label, children }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 4, py: 1.5 }}>
    <Typography sx={{ color: 'text.secondary' }}>{label}</Typography>
    <Typography component='div'>{children}</Typography>
  </Box>
)

// One invoice of the organisation: amounts, dates and the payments made against it.
const InvoiceDetailsDialog = ({ invoiceId, onClose, onPdf }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [invoice, setInvoice] = useState(null)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    if (!invoiceId) return
    setInvoice(null)
    setErrorCode(null)
    axios
      .get(`/api/client/billing/invoices/${invoiceId}`)
      .then(response => setInvoice(response.data.data))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
  }, [invoiceId])

  return (
    <Dialog open={Boolean(invoiceId)} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        {t('client.billing.details.title')} {invoice ? <bdi>{invoice.number}</bdi> : null}
      </DialogTitle>
      <DialogContent>
        {errorCode ? <Alert severity='error'>{t(`errors.${errorCode}`)}</Alert> : null}
        {!invoice && !errorCode ? <CircularProgress size={24} /> : null}
        {invoice ? (
          <>
            <Row label={t('client.billing.table.status')}>
              <StatusChip status={invoice.status} />
            </Row>
            <Row label={t('client.billing.table.period')}>
              {invoice.periodStart
                ? `${formatDate(invoice.periodStart, lang)} – ${formatDate(invoice.periodEnd, lang)}`
                : '-'}
            </Row>
            <Row label={t('client.billing.details.issuedAt')}>{formatDate(invoice.issuedAt, lang)}</Row>
            <Row label={t('client.billing.table.dueAt')}>{formatDate(invoice.dueAt, lang)}</Row>
            <Row label={t('client.billing.table.amount')}>{formatMoney(invoice.amount, invoice.currency, lang)}</Row>
            <Row label={t('client.billing.details.paid')}>
              {formatMoney(invoice.paidAmount, invoice.currency, lang)}
            </Row>
            {invoice.status === 'unpaid' ? (
              <Row label={t('client.billing.table.balance')}>
                <strong>{formatMoney(invoice.balance, invoice.currency, lang)}</strong>
              </Row>
            ) : null}

            <Divider sx={{ my: 4 }} />
            <Typography variant='h6' sx={{ mb: 2 }}>
              {t('client.billing.details.payments')}
            </Typography>
            {invoice.payments.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>{t('client.billing.details.noPayments')}</Typography>
            ) : (
              invoice.payments.map(payment => (
                <Box
                  key={payment.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    py: 2,
                    borderBottom: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Box>
                    <Typography>{formatMoney(payment.amount, payment.currency, lang)}</Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {payment.method === 'online'
                        ? localName(payment, 'gatewayName', lang)
                        : t(`admin.billing.method.${payment.method}`)}
                      {' · '}
                      {formatDate(payment.paidAt || payment.createdAt, lang)}
                    </Typography>
                  </Box>
                  <StatusChip status={payment.status} />
                </Box>
              ))
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        {invoice ? (
          <Button variant='tonal' startIcon={<Icon icon='tabler:file-download' />} onClick={() => onPdf(invoice)}>
            {t('client.billing.pdf')}
          </Button>
        ) : null}
        <Button variant='contained' onClick={onClose}>
          {t('client.billing.details.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InvoiceDetailsDialog
