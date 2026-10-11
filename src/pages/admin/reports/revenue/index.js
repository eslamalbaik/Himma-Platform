// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportLayout from 'src/views/admin/reports/ReportLayout'
import useReport from 'src/views/admin/reports/useReport'
import { BreakdownCard, MonthlyChart, StatTiles, TableCard } from 'src/views/admin/reports/parts'
import { formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const RevenueReport = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const report = useReport('revenue')

  return (
    <ReportLayout
      title='admin.reports.revenue.title'
      subtitle='admin.reports.revenue.subtitle'
      subject='billing'
      report={report}
    >
      {data => {
        const money = amount => formatMoney(amount, data.currency, lang)
        const methodCounts = Object.fromEntries(data.byMethod.map(m => [m.method, m.payments]))

        return (
          <>
            <StatTiles
              items={[
                {
                  label: t('admin.reports.revenue.invoiced'),
                  value: money(data.totals.invoiced),
                  icon: 'tabler:file-invoice'
                },
                {
                  label: t('admin.reports.revenue.collected'),
                  value: money(data.totals.collected),
                  icon: 'tabler:cash',
                  color: 'success'
                },
                {
                  label: t('admin.reports.revenue.refunded'),
                  value: money(data.totals.refunded),
                  icon: 'tabler:receipt-refund',
                  color: 'info'
                },
                {
                  label: t('admin.reports.revenue.net'),
                  value: money(data.totals.net),
                  icon: 'tabler:currency-dollar'
                },
                {
                  label: t('admin.reports.revenue.outstanding'),
                  value: money(data.totals.outstanding),
                  icon: 'tabler:clock-exclamation',
                  color: 'warning'
                }
              ]}
            />
            <Grid item xs={12}>
              <MonthlyChart
                title={t('admin.reports.revenue.monthly')}
                monthly={data.monthly}
                format={money}
                series={[
                  { key: 'invoiced', label: t('admin.reports.revenue.invoiced') },
                  { key: 'collected', label: t('admin.reports.revenue.collected') }
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TableCard
                title={t('admin.reports.revenue.byPlan')}
                rows={data.byPlan}
                columns={[
                  {
                    key: 'plan',
                    label: t('admin.reports.revenue.plan'),
                    render: row => localName(row, 'planName', lang)
                  },
                  { key: 'subscriptions', label: t('admin.reports.revenue.subscriptions'), align: 'right' },
                  { key: 'mrr', label: t('admin.reports.revenue.mrr'), align: 'right', render: row => money(row.mrr) }
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <BreakdownCard
                title={t('admin.reports.revenue.byMethod')}
                counts={methodCounts}
                labelPrefix='admin.billing.method'
              />
            </Grid>
            <Grid item xs={12}>
              <TableCard
                title={t('admin.reports.revenue.topClients')}
                rows={data.topClients.map(r => ({ ...r, id: r.tenantId }))}
                columns={[
                  {
                    key: 'client',
                    label: t('admin.reports.client'),
                    render: row => localName(row, 'tenantName', lang)
                  },
                  { key: 'payments', label: t('admin.reports.revenue.payments'), align: 'right' },
                  {
                    key: 'amount',
                    label: t('admin.reports.revenue.collected'),
                    align: 'right',
                    render: row => money(row.amount)
                  }
                ]}
              />
            </Grid>
          </>
        )
      }}
    </ReportLayout>
  )
}

RevenueReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default RevenueReport
