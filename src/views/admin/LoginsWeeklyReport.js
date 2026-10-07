// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import { styled, useTheme } from '@mui/material/styles'
import LinearProgress from '@mui/material/LinearProgress'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// ** Util Import
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'

const StyledGrid = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up('sm')]: {
    paddingTop: '0 !important'
  }
}))

// Same visual design as the template's "Earning Reports" widget, wired to real sign-in data:
// the weekly bar chart and the three sub-stats now come from the audit log.
const LoginsWeeklyReport = ({ daily, total, growthPercent, successful, failed, uniqueUsers }) => {
  const { t, i18n } = useTranslation()
  const theme = useTheme()

  const locale = i18n.language === 'en' ? 'en' : 'ar'
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const categories = daily.map(d => weekdayFormatter.format(new Date(`${d.date}T00:00:00`)))
  const series = [{ data: daily.map(d => d.count) }]
  const peakIndex = daily.reduce((best, d, i) => (d.count > daily[best].count ? i : best), 0)

  const attempts = successful + failed
  const data = [
    {
      progress: attempts > 0 ? Math.round((successful / attempts) * 100) : 0,
      stats: successful,
      title: t('admin.stats.successfulLogins'),
      avatarIcon: 'tabler:login-2'
    },
    {
      progress: attempts > 0 ? Math.round((failed / attempts) * 100) : 0,
      stats: failed,
      title: t('admin.stats.failedLogins'),
      avatarColor: 'error',
      progressColor: 'error',
      avatarIcon: 'tabler:shield-x'
    },
    {
      progress: total > 0 ? Math.round((uniqueUsers / total) * 100) : 0,
      stats: uniqueUsers,
      title: t('admin.stats.uniqueUsers'),
      avatarColor: 'info',
      progressColor: 'info',
      avatarIcon: 'tabler:users'
    }
  ]

  const options = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        distributed: true,
        columnWidth: '42%',
        endingShape: 'rounded',
        startingShape: 'rounded'
      }
    },
    legend: { show: false },
    tooltip: { enabled: false },
    dataLabels: { enabled: false },
    colors: categories.map((_, i) =>
      hexToRGBA(theme.palette.primary.main, i === peakIndex ? 1 : 0.16)
    ),
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    grid: {
      show: false,
      padding: {
        top: -28,
        left: -9,
        right: -10,
        bottom: -12
      }
    },
    xaxis: {
      axisTicks: { show: false },
      axisBorder: { show: false },
      categories,
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

  return (
    <Card>
      <CardHeader sx={{ pb: 0 }} title={t('admin.stats.loginsWeeklyTitle')} subheader={t('admin.stats.loginsWeeklySubtitle')} />
      <CardContent>
        <Grid container spacing={6}>
          <StyledGrid
            item
            sm={5}
            xs={12}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end' }}
          >
            <Box sx={{ mb: 3, rowGap: 1, columnGap: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant='h1'>{total}</Typography>
              <CustomChip
                rounded
                size='small'
                skin='light'
                color={growthPercent >= 0 ? 'success' : 'error'}
                label={`${growthPercent >= 0 ? '+' : ''}${growthPercent}%`}
              />
            </Box>
            <Typography variant='body2'>{t('admin.stats.loginsComparedNote')}</Typography>
          </StyledGrid>
          <StyledGrid item xs={12} sm={7}>
            <ReactApexcharts type='bar' height={163} series={series} options={options} />
          </StyledGrid>
        </Grid>
        <Box sx={{ mt: 6, borderRadius: 1, p: theme.spacing(4, 5), border: `1px solid ${theme.palette.divider}` }}>
          <Grid container spacing={6}>
            {data.map((item, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
                  <CustomAvatar
                    skin='light'
                    variant='rounded'
                    color={item.avatarColor}
                    sx={{ mr: 2, width: 26, height: 26 }}
                  >
                    <Icon fontSize='1.125rem' icon={item.avatarIcon} />
                  </CustomAvatar>
                  <Typography variant='h6'>{item.title}</Typography>
                </Box>
                <Typography variant='h4' sx={{ mb: 2.5 }}>
                  {item.stats}
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={item.progress}
                  color={item.progressColor}
                  sx={{ height: 4 }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  )
}

export default LoginsWeeklyReport
