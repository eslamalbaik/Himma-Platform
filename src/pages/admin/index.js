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

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Configs
import { roleLabel } from 'src/configs/roles'

// ** Custom Components
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import CardStatsWithAreaChart from 'src/@core/components/card-statistics/card-stats-with-area-chart'
import TenantsOverviewCard from 'src/views/admin/TenantsOverviewCard'
import UsersOverviewCard from 'src/views/admin/UsersOverviewCard'
import LoginsWeeklyReport from 'src/views/admin/LoginsWeeklyReport'
import TenantsStatusTracker from 'src/views/admin/TenantsStatusTracker'
import RevenueCard from 'src/views/admin/RevenueCard'
import AttentionCard from 'src/views/admin/AttentionCard'
import SubscriptionsEndingCard from 'src/views/admin/SubscriptionsEndingCard'
import UpcomingEventsCard from 'src/views/admin/UpcomingEventsCard'

const StatusChips = ({ counts, labelKey, t }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 4 }}>
    {Object.entries(counts || {}).map(([key, value]) => (
      <Chip key={key} variant='tonal' label={`${t(`${labelKey}.${key}`, key)}: ${value}`} />
    ))}
  </Box>
)

const AdminOverview = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const name = lang === 'en' ? user?.nameEn : user?.nameAr

  const [stats, setStats] = useState(null)
  const [business, setBusiness] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('/api/admin/stats')
      .then(response => setStats(response.data))
      .catch(() => setError('loadError'))

    // Only the blocks this role may read come back (revenue for billing, events for events, ...).
    axios
      .get('/api/admin/stats/business')
      .then(response => setBusiness(response.data.data))
      .catch(() => setError('loadError'))
  }, [])

  const tenantsActivePercent =
    stats && stats.tenants.total > 0
      ? Math.round(((stats.tenants.byStatus.active || 0) / stats.tenants.total) * 100)
      : 0

  const usersGrowthPercent =
    stats && stats.users.total > 0 ? Math.round((stats.users.newThisMonth / stats.users.total) * 100) : 0

  const loginsGrowthPercent =
    stats && stats.activity.loginsPrev7d > 0
      ? Math.round(((stats.activity.loginsLast7d - stats.activity.loginsPrev7d) / stats.activity.loginsPrev7d) * 100)
      : stats && stats.activity.loginsLast7d > 0
      ? 100
      : 0

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
              <Typography variant='h4'>{t('admin.welcome', { name })}</Typography>
              {user ? <Chip color='primary' variant='tonal' label={roleLabel(user.role, lang)} /> : null}
            </CardContent>
          </Card>
        </Grid>

        {error ? (
          <Grid item xs={12}>
            <Alert severity='error'>{t(`admin.stats.${error}`)}</Alert>
          </Grid>
        ) : null}

        {business?.attention ? (
          <Grid item xs={12} md={business.revenue ? 4 : 12}>
            <AttentionCard attention={business.attention} />
          </Grid>
        ) : null}
        {business?.revenue ? (
          <Grid item xs={12} md={business.attention ? 8 : 12}>
            <RevenueCard revenue={business.revenue} />
          </Grid>
        ) : null}
        {business?.subscriptions ? (
          <Grid item xs={12} md={business.events ? 6 : 12}>
            <SubscriptionsEndingCard subscriptions={business.subscriptions} clients={business.clients} />
          </Grid>
        ) : null}
        {business?.events ? (
          <Grid item xs={12} md={business.subscriptions ? 6 : 12}>
            <UpcomingEventsCard events={business.events} />
          </Grid>
        ) : null}

        {stats ? (
          <>
            <Grid item xs={12} lg={6}>
              <TenantsOverviewCard activePercent={tenantsActivePercent} byType={stats.tenants.byType} />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <UsersOverviewCard
                total={stats.users.total}
                growthPercent={usersGrowthPercent}
                platformStaff={stats.users.platformStaff}
                tenantUsers={stats.users.tenantUsers}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <CardStatsWithAreaChart
                stats={stats.activity.auditLast7d}
                title={t('admin.stats.auditAreaTitle')}
                avatarIcon='tabler:activity'
                avatarColor='success'
                chartColor='success'
                chartSeries={[{ data: stats.activity.auditDaily.map(d => d.count) }]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LoginsWeeklyReport
                daily={stats.activity.loginsDaily}
                total={stats.activity.loginsLast7d}
                growthPercent={loginsGrowthPercent}
                successful={stats.activity.loginsLast7d}
                failed={stats.activity.loginsFailed7d}
                uniqueUsers={stats.activity.uniqueLoginUsers7d}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TenantsStatusTracker
                total={stats.tenants.total}
                activePercent={tenantsActivePercent}
                newThisMonth={stats.tenants.newThisMonth}
                active={stats.tenants.byStatus.active || 0}
                suspended={stats.tenants.byStatus.suspended || 0}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title={t('admin.stats.tenantsSection')} />
                <CardContent>
                  <StatusChips counts={stats.tenants.byStatus} labelKey='admin.stats.status' t={t} />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title={t('admin.stats.usersSection')} />
                <CardContent>
                  <StatusChips counts={stats.users.byStatus} labelKey='admin.stats.status' t={t} />
                </CardContent>
              </Card>
            </Grid>
          </>
        ) : null}
      </Grid>
    </ApexChartWrapper>
  )
}

AdminOverview.acl = {
  action: 'read',
  subject: 'dashboard'
}

export default AdminOverview
