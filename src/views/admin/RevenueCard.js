// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// ** Helpers
import { formatMoney } from 'src/views/admin/billing/format'

// Recurring revenue and money collected over the last six months (GET /api/admin/stats/business → revenue).
const RevenueCard = ({ revenue }) => {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const money = amount => formatMoney(amount, revenue.currency, lang)

  const monthFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG', { month: 'short' })
  const categories = revenue.monthly.map(m => monthFormatter.format(new Date(`${m.month}-01T00:00:00`)))

  const growthPercent =
    revenue.collectedLastMonth > 0
      ? Math.round(((revenue.collectedThisMonth - revenue.collectedLastMonth) / revenue.collectedLastMonth) * 100)
      : null

  const tiles = [
    { title: t('admin.stats.business.mrr'), value: money(revenue.mrr), icon: 'tabler:repeat', color: 'primary' },
    { title: t('admin.stats.business.arr'), value: money(revenue.arr), icon: 'tabler:calendar-dollar', color: 'info' },
    {
      title: t('admin.stats.business.unpaid'),
      value: money(revenue.unpaidAmount),
      icon: 'tabler:file-invoice',
      color: 'warning'
    },
    {
      title: t('admin.stats.business.overdue', { count: revenue.overdueCount }),
      value: money(revenue.overdueAmount),
      icon: 'tabler:alert-triangle',
      color: 'error'
    }
  ]

  const options = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '42%' } },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { show: false, padding: { top: -10, left: -9, right: -10 } },
    tooltip: { y: { formatter: value => money(value) } },
    xaxis: {
      categories,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: theme.palette.text.disabled, fontFamily: theme.typography.fontFamily } }
    },
    yaxis: { show: false }
  }

  return (
    <Card>
      <CardHeader
        title={t('admin.stats.business.revenueTitle')}
        subheader={t('admin.stats.business.revenueSubtitle')}
      />
      <CardContent>
        <Grid container spacing={6}>
          <Grid item xs={12} md={5}>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {t('admin.stats.business.collectedThisMonth')}
            </Typography>
            <Box sx={{ mb: 5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <Typography variant='h3'>{money(revenue.collectedThisMonth)}</Typography>
              {growthPercent !== null ? (
                <CustomChip
                  rounded
                  size='small'
                  skin='light'
                  color={growthPercent >= 0 ? 'success' : 'error'}
                  label={`${growthPercent > 0 ? '+' : ''}${growthPercent}%`}
                />
              ) : null}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tiles.map(tile => (
                <Box key={tile.title} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CustomAvatar skin='light' variant='rounded' color={tile.color} sx={{ width: 34, height: 34 }}>
                    <Icon icon={tile.icon} fontSize='1.25rem' />
                  </CustomAvatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {tile.title}
                    </Typography>
                    <Typography variant='h6'>{tile.value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant='body2' sx={{ mb: 2, color: 'text.disabled' }}>
              {t('admin.stats.business.collectedMonthly')}
            </Typography>
            <ReactApexcharts
              type='bar'
              height={260}
              series={[{ name: t('admin.stats.business.collected'), data: revenue.monthly.map(m => m.amount) }]}
              options={options}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default RevenueCard
