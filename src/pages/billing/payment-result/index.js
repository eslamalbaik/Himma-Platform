// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Layout and Components
import BlankLayout from 'src/@core/layouts/BlankLayout'
import Icon from 'src/@core/components/icon'
import { formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const LOOK = {
  succeeded: { icon: 'tabler:circle-check', color: 'success.main' },
  pending: { icon: 'tabler:clock', color: 'warning.main' },
  failed: { icon: 'tabler:circle-x', color: 'error.main' },
  canceled: { icon: 'tabler:circle-x', color: 'text.secondary' }
}

// Where the payment gateway sends the payer back after checkout. Public: the payer may have no account.
// The status shown is the one the server confirmed with the gateway, not the `result` in the URL.
const PaymentResultPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const router = useRouter()
  const [result, setResult] = useState(null)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    if (!router.isReady || !router.query.payment) return
    let attempts = 0
    let timer

    // A completed payment can take a few seconds to be confirmed; check again while it is pending.
    const check = () =>
      axios
        .get(`/api/billing/payments/${encodeURIComponent(router.query.payment)}/result`)
        .then(response => {
          setResult(response.data.data)
          if (response.data.data.status === 'pending' && router.query.result === 'success' && attempts++ < 5) {
            timer = setTimeout(check, 3000)
          }
        })
        .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))

    check()

    return () => clearTimeout(timer)
  }, [router.isReady, router.query.payment, router.query.result])

  const look = LOOK[result?.status] || LOOK.pending

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: theme => `${theme.spacing(10)} !important` }}>
          {errorCode ? (
            <Typography>{t(`errors.${errorCode}`)}</Typography>
          ) : !result ? (
            <CircularProgress />
          ) : (
            <>
              <Box sx={{ color: look.color, mb: 4 }}>
                <Icon icon={look.icon} fontSize='4rem' />
              </Box>
              <Typography variant='h4' sx={{ mb: 2 }}>
                {t(`paymentResult.${result.status}.title`)}
              </Typography>
              <Typography sx={{ color: 'text.secondary', mb: 6 }}>
                {t(`paymentResult.${result.status}.message`)}
              </Typography>
              <Typography sx={{ mb: 1 }}>{localName(result, 'tenantName', lang)}</Typography>
              <Typography sx={{ color: 'text.secondary', mb: 1 }}>
                {t('paymentResult.invoice', { number: result.invoiceNumber })}
              </Typography>
              <Typography variant='h5' sx={{ mb: 6 }}>
                {formatMoney(result.amount, result.currency, lang)}
              </Typography>
              {result.checkoutUrl ? (
                <Button variant='contained' href={result.checkoutUrl}>
                  {t('paymentResult.payNow')}
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

PaymentResultPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
PaymentResultPage.authGuard = false

export default PaymentResultPage
