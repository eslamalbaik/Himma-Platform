// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { formatDate, formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

// One number with its icon. `href` makes the whole card a link to the page that explains it.
const Kpi = ({ icon, color, title, value, note, href }) => {
  const content = (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <CustomAvatar skin='light' variant='rounded' color={color} sx={{ width: 44, height: 44 }}>
          <Icon icon={icon} fontSize='1.6rem' />
        </CustomAvatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h5'>{value}</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {title}
          </Typography>
          {note ? (
            <Typography variant='caption' sx={{ color: 'text.disabled' }}>
              {note}
            </Typography>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      {content}
    </Link>
  ) : (
    content
  )
}

const RevenueChart = ({ revenue, lang }) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const monthFormat = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE', { month: 'short' })

  const options = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 6 },
    xaxis: {
      categories: revenue.monthly.map(m => monthFormat.format(new Date(`${m.month}-01T00:00:00`))),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: theme.palette.text.disabled } }
    },
    yaxis: {
      opposite: theme.direction === 'rtl',
      labels: {
        style: { colors: theme.palette.text.disabled },
        formatter: value => new Intl.NumberFormat(lang === 'en' ? 'en' : 'ar', { notation: 'compact' }).format(value)
      }
    },
    tooltip: { y: { formatter: value => formatMoney(value, revenue.currency, lang) } }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('admin.home.collectedTitle')} subheader={t('admin.home.collectedSubtitle')} />
      <CardContent>
        <ReactApexcharts
          type='bar'
          height={240}
          options={options}
          series={[{ name: t('admin.home.collected'), data: revenue.monthly.map(m => m.amount) }]}
        />
      </CardContent>
    </Card>
  )
}

const EndingSoon = ({ subscriptions, lang }) => {
  const { t } = useTranslation()

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={t('admin.home.endingSoonTitle')}
        subheader={t('admin.home.endingSoonSubtitle', { count: subscriptions.endingSoonCount })}
      />
      <CardContent>
        {subscriptions.endingSoon.length === 0 ? (
          <Typography sx={{ color: 'text.secondary' }}>{t('admin.home.endingSoonEmpty')}</Typography>
        ) : (
          subscriptions.endingSoon.map(s => (
            <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 500 }}>
                  {localName(s, 'tenantName', lang)}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {localName(s, 'planName', lang)}
                </Typography>
              </Box>
              {s.status === 'trial' ? (
                <Chip size='small' variant='tonal' color='info' label={t('admin.billing.status.trial')} />
              ) : null}
              <Typography variant='body2' sx={{ whiteSpace: 'nowrap' }}>
                {formatDate(s.endsAt, lang)}
              </Typography>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )
}

const ATTENTION = [
  ['invoicesOverdue', 'tabler:file-alert', 'error', '/admin/billing/invoices/'],
  ['articlesInReview', 'tabler:file-search', 'warning', '/admin/content/review/'],
  ['contentReportsOpen', 'tabler:flag', 'warning', '/admin/content/reports/'],
  ['commentsPending', 'tabler:message-circle', 'info', '/admin/content/comments/'],
  ['messageReportsOpen', 'tabler:message-report', 'error', '/admin/messages/']
]

const Attention = ({ attention, events, lang }) => {
  const { t } = useTranslation()
  const items = ATTENTION.filter(([key]) => attention[key] !== undefined)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('admin.home.attentionTitle')} />
      <CardContent>
        {items.map(([key, icon, color, href]) => (
          <Link key={key} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <CustomAvatar skin='light' color={attention[key] ? color : 'secondary'} sx={{ width: 34, height: 34 }}>
                <Icon icon={icon} fontSize='1.2rem' />
              </CustomAvatar>
              <Typography sx={{ flex: 1, color: 'text.primary' }}>{t(`admin.home.attention.${key}`)}</Typography>
              <Typography variant='h6'>{attention[key]}</Typography>
            </Box>
          </Link>
        ))}
        {events ? (
          <Link href='/admin/events/live/' style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <CustomAvatar skin='light' color={events.liveNow ? 'success' : 'secondary'} sx={{ width: 34, height: 34 }}>
                <Icon icon='tabler:broadcast' fontSize='1.2rem' />
              </CustomAvatar>
              <Typography sx={{ flex: 1, color: 'text.primary' }}>{t('admin.home.liveNow')}</Typography>
              <Typography variant='h6'>{events.liveNow}</Typography>
            </Box>
          </Link>
        ) : null}
        {events?.upcoming?.length ? (
          <Box sx={{ mt: 4 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2 }}>
              {t('admin.home.upcomingEvents', { count: events.upcomingCount })}
            </Typography>
            {events.upcoming.map(e => (
              <Box key={e.id} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                <Typography variant='body2' noWrap sx={{ flex: 1 }}>
                  {localName(e, 'title', lang)}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                  {formatDate(e.startsAt, lang)}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  )
}

// Business indicators on the home page (plan §9). The API leaves out blocks the user may not read.
const BusinessOverview = ({ data }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const { revenue, subscriptions, clients, events, attention } = data
  const money = amount => formatMoney(amount, revenue?.currency, lang)

  return (
    <>
      {revenue ? (
        <>
          <Grid item xs={12} sm={6} lg={3}>
            <Kpi
              icon='tabler:repeat'
              color='primary'
              title={t('admin.home.mrr')}
              value={money(revenue.mrr)}
              note={t('admin.home.arr', { amount: money(revenue.arr) })}
              href='/admin/billing/subscriptions/'
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Kpi
              icon='tabler:cash'
              color='success'
              title={t('admin.home.collectedThisMonth')}
              value={money(revenue.collectedThisMonth)}
              note={t('admin.home.lastMonth', { amount: money(revenue.collectedLastMonth) })}
              href='/admin/billing/payments/'
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Kpi
              icon='tabler:file-alert'
              color='error'
              title={t('admin.home.overdue', { count: revenue.overdueCount })}
              value={money(revenue.overdueAmount)}
              note={t('admin.home.unpaidTotal', { amount: money(revenue.unpaidAmount) })}
              href='/admin/billing/invoices/'
            />
          </Grid>
        </>
      ) : null}
      {clients ? (
        <Grid item xs={12} sm={6} lg={3}>
          <Kpi
            icon='tabler:building'
            color='info'
            title={t('admin.home.activeClients')}
            value={clients.active}
            note={t('admin.home.clientsNote', {
              trial: clients.trial,
              suspended: clients.suspended,
              added: clients.newThisMonth,
              churned: clients.churnedThisMonth
            })}
            href='/admin/tenants/'
          />
        </Grid>
      ) : null}
      {revenue ? (
        <Grid item xs={12} md={6}>
          <RevenueChart revenue={revenue} lang={lang} />
        </Grid>
      ) : null}
      {subscriptions ? (
        <Grid item xs={12} md={6} lg={3}>
          <EndingSoon subscriptions={subscriptions} lang={lang} />
        </Grid>
      ) : null}
      {attention || events ? (
        <Grid item xs={12} md={6} lg={3}>
          <Attention attention={attention || {}} events={events} lang={lang} />
        </Grid>
      ) : null}
    </>
  )
}

export default BusinessOverview
