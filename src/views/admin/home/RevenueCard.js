// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// ** Helpers
import { formatMoney, pickLang } from 'src/views/admin/billing/format'

// Revenue on the home page: recurring revenue, what was collected per month (last six months)
// and what clients still owe.
const RevenueCard = ({ revenue }) => {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const lang = pickLang(i18n)
  const money = amount => formatMoney(amount, revenue.currency, lang)

  const monthFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG', { month: 'short' })
  const categories = revenue.monthly.map(m => monthFormatter.format(new Date(`${m.month}-01T00:00:00`)))

  const growthPercent =
    revenue.collectedLastMonth > 0
      ? Math.round(((revenue.collectedThisMonth - revenue.collectedLastMonth) / revenue.collectedLastMonth) * 100)
      : null

  const options = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '42%' } },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: [theme.palette.primary.main],
    tooltip: { y: { formatter: value => money(value) } },
    grid: { show: false, padding: { top: -20, left: -6, right: -6, bottom: -10 } },
    xaxis: {
      categories,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: {
        style: {
          colors: theme.palette.text.disabled,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize
        }
      }
    },
    yaxis: { show: false }
  }

  const figures = [
    { title: t('admin.home.mrr'), value: money(revenue.mrr), icon: 'tabler:currency-dollar', color: 'primary' },
    { title: t('admin.home.arr'), value: money(revenue.arr), icon: 'tabler:chart-bar', color: 'info' },
    {
      title: t('admin.home.unpaid'),
      value: money(revenue.unpaidAmount),
      icon: 'tabler:file-invoice',
      color: 'warning'
    },
    {
      title: t('admin.home.overdue', { count: revenue.overdueCount }),
      value: money(revenue.overdueAmount),
      icon: 'tabler:clock-exclamation',
      color: 'error'
    }
  ]

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('admin.home.revenueTitle')} subheader={t('admin.home.revenueSubtitle')} />
      <CardContent>
        <Grid container spacing={6}>
          <Grid item xs={12} sm={5} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <Typography variant='body2' sx={{ mb: 1 }}>
              {t('admin.home.collectedThisMonth')}
            </Typography>
            <Box sx={{ mb: 2, rowGap: 1, columnGap: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant='h3'>{money(revenue.collectedThisMonth)}</Typography>
              {growthPercent === null ? null : (
                <CustomChip
                  rounded
                  size='small'
                  skin='light'
                  color={growthPercent >= 0 ? 'success' : 'error'}
                  label={`${growthPercent >= 0 ? '+' : ''}${growthPercent}%`}
                />
              )}
            </Box>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {t('admin.home.collectedLastMonth', { amount: money(revenue.collectedLastMonth) })}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={7}>
            <ReactApexcharts
              type='bar'
              height={160}
              series={[{ name: t('admin.home.collected'), data: revenue.monthly.map(m => m.amount) }]}
              options={options}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 6, borderRadius: 1, p: theme.spacing(4, 5), border: `1px solid ${theme.palette.divider}` }}>
          <Grid container spacing={4}>
            {figures.map(item => (
              <Grid item xs={12} sm={6} md={3} key={item.icon}>
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CustomAvatar skin='light' variant='rounded' color={item.color} sx={{ width: 26, height: 26 }}>
                    <Icon fontSize='1.125rem' icon={item.icon} />
                  </CustomAvatar>
                  <Typography variant='body2'>{item.title}</Typography>
                </Box>
                <Typography variant='h5'>{item.value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  )
}

export default RevenueCard
