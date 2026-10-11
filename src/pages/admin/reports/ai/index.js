// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportLayout from 'src/views/admin/reports/ReportLayout'
import useReport from 'src/views/admin/reports/useReport'
import { BreakdownCard, MonthlyChart, StatTiles, TableCard } from 'src/views/admin/reports/parts'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'

// AI usage (AI-P-02): who used AI, which tool, what was applied, and what became of the article.
const AiReport = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const report = useReport('ai')
  const number = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'ar-EG')

  return (
    <ReportLayout
      title='admin.reports.ai.title'
      subtitle='admin.reports.ai.subtitle'
      subject='ai_agent'
      report={report}
    >
      {data => (
        <>
          <StatTiles
            items={[
              { label: t('admin.reports.ai.uses'), value: data.totals.uses, icon: 'tabler:robot' },
              {
                label: t('admin.reports.ai.completed'),
                value: data.totals.completed,
                icon: 'tabler:circle-check',
                color: 'success'
              },
              {
                label: t('admin.reports.ai.refusedOrFailed'),
                value: data.totals.refused + data.totals.failed,
                icon: 'tabler:circle-x',
                color: 'error'
              },
              {
                label: t('admin.reports.ai.appliedRate'),
                value: `${data.totals.appliedRate}%`,
                icon: 'tabler:edit',
                color: 'info'
              },
              {
                label: t('admin.reports.ai.tokens'),
                value: number.format(data.totals.inputTokens + data.totals.outputTokens),
                icon: 'tabler:chart-bar',
                color: 'warning'
              }
            ]}
          />
          <Grid item xs={12} md={6}>
            <MonthlyChart
              title={t('admin.reports.ai.monthly')}
              monthly={data.monthly}
              series={[{ key: 'uses', label: t('admin.reports.ai.uses') }]}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <BreakdownCard title={t('admin.reports.ai.byTool')} counts={data.byTool} labelPrefix='admin.ai.tool' />
          </Grid>
          <Grid item xs={12} md={3}>
            <TableCard
              title={t('admin.reports.ai.byUser')}
              rows={data.byUser.map(r => ({ ...r, id: r.userId }))}
              columns={[
                { key: 'name', label: t('admin.reports.ai.user'), render: row => localName(row, 'name', lang) },
                { key: 'uses', label: t('admin.reports.ai.uses'), align: 'right' }
              ]}
            />
          </Grid>
          <Grid item xs={12}>
            <TableCard
              title={t('admin.reports.ai.trail')}
              rows={data.usages}
              columns={[
                { key: 'date', label: t('admin.reports.date'), render: row => formatDate(row.createdAt, lang) },
                { key: 'user', label: t('admin.reports.ai.user'), render: row => localName(row, 'userName', lang) },
                { key: 'tool', label: t('admin.ai.toolLabel'), render: row => t(`admin.ai.tool.${row.tool}`) },
                { key: 'subject', label: t('admin.ai.article'), render: row => row.articleTitle || row.subject || '-' },
                {
                  key: 'applied',
                  label: t('admin.ai.appliedLabel'),
                  render: row =>
                    row.appliedFields?.length
                      ? row.appliedFields.map(f => t(`admin.ai.applyField.${f}`, f)).join('، ')
                      : '-'
                },
                {
                  key: 'articleStatus',
                  label: t('admin.reports.ai.articleStatus'),
                  render: row => (row.articleStatus ? t(`admin.content.status.${row.articleStatus}`) : '-')
                },
                {
                  key: 'reviewer',
                  label: t('admin.reports.ai.reviewer'),
                  render: row => (row.reviewerNameAr ? localName(row, 'reviewerName', lang) : '-')
                },
                {
                  key: 'publishedAt',
                  label: t('admin.reports.ai.publishedAt'),
                  render: row => (row.publishedAt ? formatDate(row.publishedAt, lang) : '-')
                }
              ]}
            />
          </Grid>
        </>
      )}
    </ReportLayout>
  )
}

AiReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default AiReport
