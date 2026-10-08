// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportPage from 'src/views/admin/reports/ReportPage'
import { Breakdown, MonthlyChart, RankTable, StatTiles, formatNumber } from 'src/views/admin/reports/widgets'

// ** Helpers
import { formatMoney, localName } from 'src/views/admin/billing/format'

const RevenueReport = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <ReportPage report='revenue' subject='billing' titleKey='nav.reports.revenue'>
      {data => {
        const money = amount => formatMoney(amount, data.currency, lang)
        const { summary } = data

        // Amount per payment method and per plan, shown as shares of what was collected.
        const byMethod = Object.fromEntries(data.byMethod.map(row => [row.method, row.amount]))
        const byPlan = Object.fromEntries(data.byPlan.map(row => [row.planId || '', row.amount]))
        const planName = id =>
          id
            ? localName(
                data.byPlan.find(row => row.planId === id),
                'name',
                lang
              )
            : t('admin.reports.revenue.noPlan')

        return (
          <>
            <StatTiles
              tiles={[
                {
                  labelKey: 'admin.reports.revenue.invoiced',
                  value: money(summary.invoiced),
                  icon: 'tabler:file-invoice'
                },
                {
                  labelKey: 'admin.reports.revenue.collected',
                  value: money(summary.collected),
                  icon: 'tabler:cash',
                  color: 'success'
                },
                {
                  labelKey: 'admin.reports.revenue.refunded',
                  value: money(summary.refunded),
                  icon: 'tabler:receipt-refund',
                  color: 'error'
                },
                {
                  labelKey: 'admin.reports.revenue.net',
                  value: money(summary.net),
                  icon: 'tabler:wallet',
                  color: 'info'
                }
              ]}
            />
            <StatTiles
              tiles={[
                {
                  labelKey: 'admin.reports.revenue.outstandingNow',
                  value: money(summary.outstandingNow),
                  icon: 'tabler:hourglass',
                  color: 'warning',
                  hintKey: 'admin.reports.nowHint'
                },
                {
                  labelKey: 'admin.reports.revenue.overdueNow',
                  value: `${money(summary.overdueNow)} (${formatNumber(summary.overdueCountNow, lang)})`,
                  icon: 'tabler:alert-triangle',
                  color: 'error',
                  hintKey: 'admin.reports.nowHint'
                },
                {
                  labelKey: 'admin.reports.revenue.invoiceCount',
                  value: formatNumber(summary.invoiceCount, lang),
                  icon: 'tabler:files',
                  color: 'secondary'
                },
                {
                  labelKey: 'admin.reports.revenue.paymentCount',
                  value: formatNumber(summary.paymentCount, lang),
                  icon: 'tabler:credit-card',
                  color: 'secondary'
                }
              ]}
            />

            <Grid item xs={12}>
              <MonthlyChart
                titleKey='admin.reports.revenue.monthlyTitle'
                monthly={data.monthly}
                format={money}
                series={[
                  { key: 'invoiced', labelKey: 'admin.reports.revenue.invoiced' },
                  { key: 'collected', labelKey: 'admin.reports.revenue.collected' },
                  { key: 'refunded', labelKey: 'admin.reports.revenue.refunded' }
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Breakdown
                titleKey='admin.reports.revenue.byMethod'
                counts={byMethod}
                labelPrefix='admin.billing.method'
                format={money}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Breakdown
                titleKey='admin.reports.revenue.byPlan'
                counts={byPlan}
                label={planName}
                format={money}
                color='info'
              />
            </Grid>

            <Grid item xs={12}>
              <RankTable
                titleKey='admin.reports.revenue.topClients'
                rows={data.topClients}
                rowKey={row => row.tenantId}
                columns={[
                  { key: 'name', labelKey: 'admin.reports.client', render: row => localName(row, 'name', lang) },
                  {
                    key: 'count',
                    labelKey: 'admin.reports.revenue.paymentCount',
                    numeric: true,
                    render: row => formatNumber(row.count, lang)
                  },
                  {
                    key: 'amount',
                    labelKey: 'admin.reports.revenue.collected',
                    numeric: true,
                    render: row => money(row.amount)
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

RevenueReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default RevenueReport
