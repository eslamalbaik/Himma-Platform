// ** React Imports
import { useContext } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import ReportLayout from 'src/views/admin/reports/ReportLayout'
import useReport from 'src/views/admin/reports/useReport'
import { BreakdownCard, MonthlyChart, StatTiles } from 'src/views/admin/reports/parts'
import { formatMoney, pickLang } from 'src/views/admin/billing/format'

// The API sends one map per series ({'2026-10': 3, ...}); the charts take one row per month.
const monthly = (months, series) =>
  months.map(month => ({ month, ...Object.fromEntries(Object.entries(series).map(([k, v]) => [k, v[month] ?? 0])) }))

const sum = values => Object.values(values || {}).reduce((total, value) => total + value, 0)

// Client dashboard → Reports: the organisation's own activity over a period, with a CSV export for roles that
// may export data.
const ClientReportsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const report = useReport('organisation', { url: '/api/client/reports' })

  return (
    <ReportLayout
      title='client.reports.title'
      subtitle='client.reports.subtitle'
      subject='client'
      report={report}
      canExport={Boolean(ability?.can('export_data', 'client'))}
    >
      {data => (
        <>
          <StatTiles
            items={[
              { label: t('client.reports.articlesCreated'), value: sum(data.articles.created), icon: 'tabler:edit' },
              {
                label: t('client.reports.articlesSubmitted'),
                value: sum(data.articles.submitted),
                icon: 'tabler:send',
                color: 'info'
              },
              {
                label: t('client.reports.articlesPublished'),
                value: sum(data.articles.published),
                icon: 'tabler:world-upload',
                color: 'success'
              },
              {
                label: t('client.reports.activeMembers'),
                value: data.members.active,
                icon: 'tabler:users',
                color: 'warning'
              },
              {
                label: t('client.reports.signedIn'),
                value: data.members.signedIn,
                icon: 'tabler:login',
                color: 'secondary'
              }
            ]}
          />
          <Grid item xs={12} lg={6}>
            <MonthlyChart
              title={t('client.reports.articles')}
              monthly={monthly(data.months, {
                created: data.articles.created,
                published: data.articles.published
              })}
              series={[
                { key: 'created', label: t('client.reports.articlesCreated') },
                { key: 'published', label: t('client.reports.articlesPublished') }
              ]}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <MonthlyChart
              title={t('client.reports.members')}
              monthly={monthly(data.months, {
                signIns: data.members.signIns,
                members: data.members.membersSignedIn
              })}
              series={[
                { key: 'signIns', label: t('client.reports.signIns') },
                { key: 'members', label: t('client.reports.signedIn') }
              ]}
            />
          </Grid>
          {data.billing ? (
            <Grid item xs={12}>
              <MonthlyChart
                title={t('client.reports.billing')}
                monthly={monthly(data.months, { invoiced: data.billing.invoiced, paid: data.billing.paid })}
                series={[
                  { key: 'invoiced', label: t('client.reports.invoiced') },
                  { key: 'paid', label: t('client.reports.paid') }
                ]}
                format={value => formatMoney(value, data.billing.currency, lang)}
              />
            </Grid>
          ) : null}
          <Grid item xs={12} md={6}>
            <BreakdownCard
              title={t('client.reports.byStatus')}
              counts={data.articles.byStatus}
              labelPrefix='admin.content.status'
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <BreakdownCard
              title={t('client.reports.byClassification')}
              counts={data.articles.byClassification}
              labelPrefix='admin.content.classification'
            />
          </Grid>
        </>
      )}
    </ReportLayout>
  )
}

ClientReportsPage.acl = {
  action: 'entity_reports',
  subject: 'client'
}

export default ClientReportsPage
