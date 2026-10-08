// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Helpers
import StatusChip from 'src/views/admin/billing/StatusChip'
import { formatDate, formatMoney, localName, pickLang } from 'src/views/admin/billing/format'
import { formatDateTime } from 'src/views/admin/events/helpers'

const Tile = ({ icon, color = 'primary', value, label }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <CustomAvatar skin='light' variant='rounded' color={color} sx={{ width: 42, height: 42 }}>
        <Icon icon={icon} fontSize='1.5rem' />
      </CustomAvatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='h5'>{value}</Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </CardContent>
  </Card>
)

// Client dashboard home (GET /api/client/overview): subscription, what is owed, upcoming events, content.
const ClientHome = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('/api/client/overview')
      .then(response => setData(response.data.data))
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
  }, [])

  const tenant = user?.tenant
  const name = (lang === 'en' ? user?.nameEn : user?.nameAr) || user?.email

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant='h4'>{t('client.home.welcome', { name })}</Typography>
              <Typography sx={{ color: 'text.secondary' }}>{tenant ? localName(tenant, 'name', lang) : ''}</Typography>
            </Box>
            {tenant ? <Chip variant='tonal' color='primary' label={t(`admin.tenantType.${tenant.type}`)} /> : null}
          </CardContent>
        </Card>
      </Grid>

      {error ? (
        <Grid item xs={12}>
          <Alert severity='error'>{t(`errors.${error}`)}</Alert>
        </Grid>
      ) : null}
      {!data && !error ? (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Grid>
      ) : null}

      {data ? (
        <>
          {data.billing.suspended ? (
            <Grid item xs={12}>
              <Alert severity='error' icon={<Icon icon='tabler:lock' />}>
                {t('client.home.billingSuspended')}
              </Alert>
            </Grid>
          ) : data.billing.overdueCount > 0 ? (
            <Grid item xs={12}>
              <Alert severity='warning'>{t('client.home.overdue', { count: data.billing.overdueCount })}</Alert>
            </Grid>
          ) : null}

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title={t('client.home.subscription')} />
              <CardContent>
                {data.subscription ? (
                  <>
                    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant='h5'>{localName(data.subscription, 'planName', lang)}</Typography>
                      <StatusChip status={data.subscription.status} />
                    </Box>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {data.subscription.endsAt
                        ? t('client.home.endsOn', {
                            date: formatDate(data.subscription.endsAt, lang),
                            days: data.subscription.daysLeft
                          })
                        : t('client.home.noEndDate')}
                    </Typography>
                  </>
                ) : (
                  <Typography sx={{ color: 'text.secondary' }}>{t('client.home.noSubscription')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title={t('client.home.billing')} />
              <CardContent>
                {data.billing.unpaidCount === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>{t('client.home.nothingDue')}</Typography>
                ) : (
                  <>
                    <Typography variant='h5' sx={{ mb: 1 }}>
                      {formatMoney(data.billing.unpaidAmount, data.billing.currency, lang)}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {t('client.home.unpaid', {
                        count: data.billing.unpaidCount,
                        date: formatDate(data.billing.nextDueAt, lang)
                      })}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Tile
              icon='tabler:world-upload'
              color='success'
              value={data.content.published}
              label={t('client.home.published')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Tile
              icon='tabler:file-pencil'
              color='warning'
              value={data.content.drafts}
              label={t('client.home.drafts')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Tile icon='tabler:users' color='info' value={data.accountsCount} label={t('client.home.accounts')} />
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader title={t('client.home.upcomingEvents')} />
              <CardContent>
                {data.upcomingEvents.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>{t('client.home.noEvents')}</Typography>
                ) : (
                  data.upcomingEvents.map(event => (
                    <Box key={event.id} sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontWeight: 500 }}>{localName(event, 'title', lang)}</Typography>
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                          {formatDateTime(event.startsAt, lang)}
                        </Typography>
                      </Box>
                      <Chip size='small' variant='tonal' label={t(`admin.events.format.${event.format}`)} />
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </>
      ) : null}
    </Grid>
  )
}

ClientHome.acl = { action: 'read', subject: 'client_basic' }

export default ClientHome
