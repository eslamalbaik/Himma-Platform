// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

const TENANT_STATUS_COLORS = { trial: 'info', active: 'success', suspended: 'error', cancelled: 'secondary' }

const SUBSCRIPTION_STATUS_COLORS = { trial: 'info', active: 'success', past_due: 'warning', cancelled: 'secondary' }

const StatCard = ({ icon, color, value, label, hint }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <CustomAvatar skin='light' color={color} variant='rounded' sx={{ width: 46, height: 46 }}>
        <Icon icon={icon} fontSize='1.6rem' />
      </CustomAvatar>
      <Box>
        <Typography variant='h4'>{value}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>{label}</Typography>
        {hint ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </CardContent>
  </Card>
)

// Client dashboard home: the organisation, its subscription and what it has on the platform.
const ClientHome = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const locale = lang === 'en' ? 'en-GB' : 'ar-EG'
  const pick = (item, field) => item?.[`${field}${lang === 'en' ? 'En' : 'Ar'}`]

  const [data, setData] = useState(null)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    axios
      .get('/api/client/overview')
      .then(response => setData(response.data.data))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
  }, [])

  const money = (amount, currency) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'AED' }).format(amount || 0)
  const date = value => (value ? new Date(value).toLocaleDateString(locale) : '-')

  const billing = Boolean(data?.invoices)
  const statSize = billing ? 3 : 4
  const tenant = data?.tenant
  const subscription = data?.subscription
  const readOnly = tenant && ['suspended', 'cancelled'].includes(tenant.status)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 56, height: 56 }}>
              <Icon icon='tabler:building-community' fontSize='2rem' />
            </CustomAvatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant='h4'>{t('client.home.welcome', { name: pick(user, 'name') })}</Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {t('client.home.signedInAs', { role: pick(user, 'roleName'), tenant: pick(user?.tenant, 'name') })}
              </Typography>
            </Box>
            {tenant ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip variant='tonal' label={t(`admin.tenantType.${tenant.type}`)} />
                <Chip
                  variant='tonal'
                  color={TENANT_STATUS_COLORS[tenant.status] || 'secondary'}
                  label={t(`admin.stats.status.${tenant.status}`)}
                />
              </Box>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      {readOnly ? (
        <Grid item xs={12}>
          <Alert severity='warning'>{t(`client.home.readOnly.${tenant.status}`)}</Alert>
        </Grid>
      ) : null}

      {errorCode ? (
        <Grid item xs={12}>
          <Alert severity='error'>{t(`errors.${errorCode}`)}</Alert>
        </Grid>
      ) : null}

      {!data && !errorCode ? (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={28} />
        </Grid>
      ) : null}

      {data ? (
        <>
          <Grid item xs={12} sm={6} lg={statSize}>
            <StatCard
              icon='tabler:users'
              color='primary'
              value={data.members.active}
              label={t('client.home.members')}
              hint={data.members.disabled ? t('client.home.membersDisabled', { count: data.members.disabled }) : null}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={statSize}>
            <StatCard
              icon='tabler:article'
              color='success'
              value={data.articles.published}
              label={t('client.home.published')}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={statSize}>
            <StatCard
              icon='tabler:clock-edit'
              color='info'
              value={data.articles.in_review + data.articles.approved}
              label={t('client.home.inReview')}
            />
          </Grid>
          {billing ? (
            <Grid item xs={12} sm={6} lg={statSize}>
              <StatCard
                icon='tabler:file-invoice'
                color={data.invoices.overdue ? 'error' : 'warning'}
                value={data.invoices.unpaid}
                label={t('client.home.unpaidInvoices')}
                hint={
                  data.invoices.unpaid
                    ? t('client.home.outstanding', { amount: money(data.invoices.outstanding, data.invoices.currency) })
                    : null
                }
              />
            </Grid>
          ) : null}

          {billing ? (
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title={t('client.home.subscription')} />
                <CardContent>
                  {subscription ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Typography variant='h5'>{pick(subscription, 'planName')}</Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={SUBSCRIPTION_STATUS_COLORS[subscription.status] || 'secondary'}
                          label={t(`admin.billing.status.${subscription.status}`)}
                        />
                      </Box>
                      <Typography sx={{ color: 'text.secondary' }}>
                        {t(`client.home.price.${subscription.interval}`, {
                          amount: money(subscription.price, subscription.currency)
                        })}
                      </Typography>
                      <Typography sx={{ color: 'text.secondary' }}>
                        {t('client.home.period', { from: date(subscription.startsAt), to: date(subscription.endsAt) })}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ color: 'text.secondary' }}>{t('client.home.noSubscription')}</Typography>
                  )}
                  {data.invoices.overdue ? (
                    <Alert severity='error' sx={{ mt: 4 }}>
                      {t('client.home.overdue', { count: data.invoices.overdue })}
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
          ) : null}

          <Grid item xs={12} md={billing ? 6 : 12}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title={t('client.home.content')} />
              <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.entries(data.articles).map(([status, count]) => (
                  <Chip key={status} variant='tonal' label={`${t(`admin.content.status.${status}`)}: ${count}`} />
                ))}
              </CardContent>
            </Card>
          </Grid>
        </>
      ) : null}
    </Grid>
  )
}

ClientHome.acl = {
  action: 'read',
  subject: 'client'
}

export default ClientHome
