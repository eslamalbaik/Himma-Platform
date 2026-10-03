// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import CustomAvatar from 'src/@core/components/mui/avatar'

// Same visual design as the template's "Website Analytics" widget, wired to real tenant data:
// the illustration and layout stay, the metrics are the live tenant type breakdown.
const TenantsOverviewCard = ({ activePercent, byType }) => {
  const { t } = useTranslation()
  const theme = useTheme()

  const types = ['association', 'school', 'institution', 'government']

  return (
    <Card sx={{ position: 'relative', backgroundColor: 'primary.main' }}>
      <Box sx={{ p: 6, '& .MuiTypography-root': { color: 'common.white' } }}>
        <Typography variant='h5' sx={{ mb: 0.5 }}>
          {t('admin.stats.tenantsOverviewTitle')}
        </Typography>
        <Typography variant='body2' sx={{ mb: 4.5 }}>
          {t('admin.stats.activeRate', { percent: activePercent })}
        </Typography>
        <Grid container>
          <Grid item xs={12} sm={8} sx={{ order: [2, 1] }}>
            <Typography variant='h6' sx={{ mb: 4.5 }}>
              {t('admin.stats.byTypeTitle')}
            </Typography>
            <Grid container spacing={4.5}>
              {types.map(type => (
                <Grid item key={type} xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CustomAvatar
                      color='primary'
                      variant='rounded'
                      sx={{
                        mr: 2,
                        width: 48,
                        height: 30,
                        fontWeight: 500,
                        color: 'common.white',
                        backgroundColor: 'primary.dark'
                      }}
                    >
                      {byType[type] ?? 0}
                    </CustomAvatar>
                    <Typography noWrap>{t(`admin.tenantType.${type}`)}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid
            item
            xs={12}
            sm={4}
            sx={{
              order: [1, 2],
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '& img': {
                height: '160px !important',
                maxWidth: 'none !important',
                [theme.breakpoints.up('sm')]: {
                  top: '50%',
                  position: 'absolute',
                  right: theme.spacing(6),
                  transform: 'translateY(-50%)'
                }
              }
            }}
          >
            <img src='/images/cards/graphic-illustration-3.png' alt={t('admin.stats.tenantsOverviewTitle')} />
          </Grid>
        </Grid>
      </Box>
    </Card>
  )
}

export default TenantsOverviewCard
