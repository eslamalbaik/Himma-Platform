// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// Same visual design as the template's "Sales Overview" widget, wired to real user data:
// platform staff vs. tenant users instead of orders vs. visits.
const UsersOverviewCard = ({ total, growthPercent, platformStaff, tenantUsers }) => {
  const { t } = useTranslation()

  const staffPercent = total > 0 ? Math.round((platformStaff / total) * 100) : 0
  const tenantPercent = total > 0 ? Math.round((tenantUsers / total) * 100) : 0

  return (
    <Card>
      <CardContent sx={{ p: theme => `${theme.spacing(5)} !important` }}>
        <Box sx={{ gap: 2, mb: 5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {t('admin.stats.usersOverviewTitle')}
            </Typography>
            <Typography variant='h4'>{total}</Typography>
          </div>
          {growthPercent > 0 ? (
            <Typography sx={{ fontWeight: 500, color: 'success.main' }}>
              {t('admin.stats.growthThisMonth', { percent: growthPercent })}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ mb: 3.5, gap: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ py: 2.25, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
              <CustomAvatar skin='light' color='info' variant='rounded' sx={{ mr: 1.5, height: 24, width: 24 }}>
                <Icon icon='tabler:shield-check' fontSize='1.125rem' />
              </CustomAvatar>
              <Typography sx={{ color: 'text.secondary' }}>{t('admin.stats.platformStaff')}</Typography>
            </Box>
            <Typography variant='h5'>{staffPercent}%</Typography>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {platformStaff}
            </Typography>
          </Box>
          <Divider flexItem sx={{ m: 0 }} orientation='vertical'>
            <CustomAvatar
              skin='light'
              color='secondary'
              sx={{ height: 24, width: 24, fontSize: '0.6875rem', color: 'text.secondary' }}
            >
              {t('admin.stats.vs')}
            </CustomAvatar>
          </Divider>
          <Box sx={{ py: 2.25, display: 'flex', alignItems: 'flex-end', flexDirection: 'column' }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 1.5, color: 'text.secondary' }}>{t('admin.stats.tenantUsers')}</Typography>
              <CustomAvatar skin='light' variant='rounded' sx={{ height: 24, width: 24 }}>
                <Icon icon='tabler:users' fontSize='1.125rem' />
              </CustomAvatar>
            </Box>
            <Typography variant='h5'>{tenantPercent}%</Typography>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {tenantUsers}
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          value={staffPercent}
          color='info'
          variant='determinate'
          sx={{
            height: 10,
            '&.MuiLinearProgress-colorInfo': { backgroundColor: 'primary.main' },
            '& .MuiLinearProgress-bar': {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export default UsersOverviewCard
