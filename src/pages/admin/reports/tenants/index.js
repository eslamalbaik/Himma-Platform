// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportPage from 'src/views/admin/reports/ReportPage'
import { Breakdown, MonthlyChart, RankTable, StatTiles, formatNumber } from 'src/views/admin/reports/widgets'

// ** Helpers
import { localName } from 'src/views/admin/billing/format'

const TenantsReport = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const num = value => formatNumber(value, lang)

  return (
    <ReportPage report='tenants' subject='tenants' titleKey='nav.reports.tenants'>
      {data => {
        const { summary } = data

        return (
          <>
            <StatTiles
              tiles={[
                {
                  labelKey: 'admin.reports.tenants.newTenants',
                  value: num(summary.newTenants),
                  icon: 'tabler:circle-plus'
                },
                {
                  labelKey: 'admin.reports.tenants.newSubscriptions',
                  value: num(summary.newSubscriptions),
                  icon: 'tabler:repeat',
                  color: 'success'
                },
                {
                  labelKey: 'admin.reports.tenants.cancellations',
                  value: num(summary.cancellations),
                  icon: 'tabler:circle-x',
                  color: 'error'
                },
                {
                  labelKey: 'admin.reports.tenants.totalNow',
                  value: num(summary.totalNow),
                  icon: 'tabler:building-community',
                  color: 'info',
                  hintKey: 'admin.reports.nowHint'
                }
              ]}
            />
            <StatTiles
              tiles={[
                {
                  labelKey: 'admin.reports.tenants.requests',
                  value: num(summary.requests),
                  icon: 'tabler:mail-forward'
                },
                {
                  labelKey: 'admin.reports.tenants.averageReview',
                  value:
                    data.averageReviewHours === null
                      ? '-'
                      : t('admin.reports.hours', { count: num(data.averageReviewHours) }),
                  icon: 'tabler:clock',
                  color: 'warning'
                },
                { labelKey: 'admin.reports.tenants.newUsers', value: num(summary.newUsers), icon: 'tabler:user-plus' },
                {
                  labelKey: 'admin.reports.tenants.activeUsers',
                  value: num(summary.activeUsers),
                  icon: 'tabler:user-check',
                  color: 'success'
                }
              ]}
            />

            <Grid item xs={12}>
              <MonthlyChart
                titleKey='admin.reports.tenants.monthlyTitle'
                monthly={data.monthly}
                series={[
                  { key: 'newTenants', labelKey: 'admin.reports.tenants.newTenants' },
                  { key: 'newSubscriptions', labelKey: 'admin.reports.tenants.newSubscriptions' },
                  { key: 'cancellations', labelKey: 'admin.reports.tenants.cancellations' }
                ]}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.tenants.newByType'
                counts={data.newByType}
                labelPrefix='admin.tenantType'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.tenants.byTypeNow'
                subheader={t('admin.reports.nowHint')}
                counts={data.byTypeNow}
                labelPrefix='admin.tenantType'
                color='info'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.tenants.byStatusNow'
                subheader={t('admin.reports.nowHint')}
                counts={data.byStatusNow}
                labelPrefix='admin.stats.status'
                color='success'
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.tenants.requestsByStatus'
                counts={data.requestsByStatus}
                labelPrefix='admin.tenants.requests.status'
                color='warning'
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <RankTable
                titleKey='admin.reports.tenants.topTenants'
                rows={data.topTenants}
                rowKey={row => row.tenantId}
                columns={[
                  { key: 'name', labelKey: 'admin.reports.client', render: row => localName(row, 'name', lang) },
                  { key: 'type', labelKey: 'admin.reports.type', render: row => t(`admin.tenantType.${row.type}`) },
                  {
                    key: 'activeUsers',
                    labelKey: 'admin.reports.tenants.activeUsers',
                    numeric: true,
                    render: row => num(row.activeUsers)
                  },
                  {
                    key: 'users',
                    labelKey: 'admin.reports.tenants.users',
                    numeric: true,
                    render: row => num(row.users)
                  }
                ]}
              />
            </Grid>
          </>
        )
      }}
    </ReportPage>
  )
}

TenantsReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default TenantsReport
