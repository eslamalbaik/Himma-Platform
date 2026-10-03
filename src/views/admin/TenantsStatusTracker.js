// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import { useTheme } from '@mui/material/styles'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// ** Util Import
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'

// Same visual design as the template's "Support Tracker" widget, wired to real tenant data:
// the radial gauge is the active-tenant rate, and the list is new/active/suspended tenants.
const TenantsStatusTracker = ({ total, activePercent, newThisMonth, active, suspended }) => {
  const { t } = useTranslation()
  const theme = useTheme()

  const data = [
    {
      subtitle: newThisMonth,
      title: t('admin.stats.tenantsNew'),
      avatarIcon: 'tabler:building-plus'
    },
    {
      subtitle: active,
      avatarColor: 'success',
      title: t('admin.stats.activeTenants'),
      avatarIcon: 'tabler:circle-check'
    },
    {
      subtitle: suspended,
      title: t('admin.stats.suspendedTenants'),
      avatarColor: 'warning',
      avatarIcon: 'tabler:player-pause'
    }
  ]

  const options = {
    chart: {
      sparkline: { enabled: true }
    },
    stroke: { dashArray: 10 },
    labels: [t('admin.stats.activeRateLabel')],
    colors: [hexToRGBA(theme.palette.primary.main, 1)],
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        opacityTo: 0.5,
        opacityFrom: 1,
        shadeIntensity: 0.5,
        stops: [30, 70, 100],
        inverseColors: false,
        gradientToColors: [theme.palette.primary.main]
      }
    },
    plotOptions: {
      radialBar: {
        endAngle: 130,
        startAngle: -140,
        hollow: { size: '60%' },
        track: { background: 'transparent' },
        dataLabels: {
          name: {
            offsetY: -15,
            color: theme.palette.text.disabled,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.body2.fontSize
          },
          value: {
            offsetY: 15,
            fontWeight: 500,
            formatter: value => `${value}%`,
            color: theme.palette.text.primary,
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.h1.fontSize
          }
        }
      }
    },
    grid: {
      padding: {
        top: -30,
        bottom: 12
      }
    },
    responsive: [
      {
        breakpoint: 1300,
        options: {
          grid: {
            padding: {
              left: 22
            }
          }
        }
      },
      {
        breakpoint: theme.breakpoints.values.md,
        options: {
          grid: {
            padding: {
              left: 0
            }
          }
        }
      }
    ]
  }

  return (
    <Card>
      <CardHeader title={t('admin.stats.tenantsTrackerTitle')} subheader={t('admin.stats.tenantsTrackerSubtitle')} />
      <CardContent>
        <Grid container spacing={6}>
          <Grid item xs={12} sm={5}>
            <Typography variant='h1'>{total}</Typography>
            <Typography sx={{ mb: 6, color: 'text.secondary' }}>{t('admin.stats.tenantsTotal')}</Typography>
            {data.map((item, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', alignItems: 'center', mb: index !== data.length - 1 ? 4 : undefined }}
              >
                <CustomAvatar
                  skin='light'
                  variant='rounded'
                  color={item.avatarColor}
                  sx={{ mr: 4, width: 34, height: 34 }}
                >
                  <Icon icon={item.avatarIcon} />
                </CustomAvatar>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant='h6'>{item.title}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                    {item.subtitle}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} sm={7} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReactApexcharts type='radialBar' height={325} options={options} series={[activePercent]} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default TenantsStatusTracker
