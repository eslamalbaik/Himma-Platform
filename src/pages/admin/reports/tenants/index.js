// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportLayout from 'src/views/admin/reports/ReportLayout'
import useReport from 'src/views/admin/reports/useReport'
import { BreakdownCard, MonthlyChart, StatTiles } from 'src/views/admin/reports/parts'

const TenantsReport = () => {
  const { t } = useTranslation()
  const report = useReport('tenants')

  return (
    <ReportLayout
      title='admin.reports.tenants.title'
      subtitle='admin.reports.tenants.subtitle'
      subject='tenants'
      report={report}
    >
      {data => (
        <>
          <StatTiles
            items={[
              {
                label: t('admin.reports.tenants.clients'),
                value: data.totals.clients,
                icon: 'tabler:building-community'
              },
              { label: t('admin.reports.tenants.new'), value: data.totals.new, icon: 'tabler:plus', color: 'success' },
              {
                label: t('admin.reports.tenants.cancelled'),
                value: data.totals.cancelled,
                icon: 'tabler:calendar-x',
                color: 'error'
              },
              {
                label: t('admin.reports.tenants.clientUsers'),
                value: data.totals.clientUsers,
                icon: 'tabler:users',
                color: 'info'
              },
              {
                label: t('admin.reports.tenants.activeClientUsers'),
                value: data.totals.activeClientUsers,
                icon: 'tabler:user-check',
                color: 'warning'
              }
            ]}
          />
          <Grid item xs={12}>
            <MonthlyChart
              title={t('admin.reports.tenants.monthly')}
              monthly={data.monthly}
              series={[
                { key: 'new', label: t('admin.reports.tenants.new') },
                { key: 'cancelled', label: t('admin.reports.tenants.cancelled') }
              ]}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.tenants.byStatus')}
              counts={data.byStatus}
              labelPrefix='admin.stats.status'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.tenants.byType')}
              counts={data.byType}
              labelPrefix='admin.tenantType'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.tenants.requests')}
              counts={data.requests}
              labelPrefix='admin.tenants.requests.status'
            />
          </Grid>
        </>
      )}
    </ReportLayout>
  )
}

TenantsReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default TenantsReport
