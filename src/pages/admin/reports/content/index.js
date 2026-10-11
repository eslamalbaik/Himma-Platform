// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportLayout from 'src/views/admin/reports/ReportLayout'
import useReport from 'src/views/admin/reports/useReport'
import { BreakdownCard, MonthlyChart, StatTiles, TableCard } from 'src/views/admin/reports/parts'
import { localName, pickLang } from 'src/views/admin/billing/format'

const ContentReport = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const report = useReport('content')

  return (
    <ReportLayout
      title='admin.reports.content.title'
      subtitle='admin.reports.content.subtitle'
      subject='content'
      report={report}
    >
      {data => (
        <>
          <StatTiles
            items={[
              { label: t('admin.reports.content.created'), value: data.totals.created, icon: 'tabler:edit' },
              {
                label: t('admin.reports.content.published'),
                value: data.totals.published,
                icon: 'tabler:world-upload',
                color: 'success'
              },
              {
                label: t('admin.reports.content.withdrawn'),
                value: data.totals.withdrawn,
                icon: 'tabler:file-off',
                color: 'error'
              },
              {
                label: t('admin.reports.content.reports'),
                value: data.totals.reports,
                icon: 'tabler:flag',
                color: 'warning'
              },
              {
                label: t('admin.reports.content.comments'),
                value: data.totals.comments,
                icon: 'tabler:messages',
                color: 'info'
              }
            ]}
          />
          <Grid item xs={12}>
            <MonthlyChart
              title={t('admin.reports.content.monthly')}
              monthly={data.monthly}
              series={[
                { key: 'created', label: t('admin.reports.content.created') },
                { key: 'published', label: t('admin.reports.content.published') }
              ]}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TableCard
              title={t('admin.reports.content.bySection')}
              rows={data.bySection.map(r => ({ ...r, id: r.sectionId || 'none' }))}
              columns={[
                {
                  key: 'section',
                  label: t('admin.reports.content.section'),
                  render: row => (row.sectionId ? localName(row, 'name', lang) : t('admin.reports.content.noSection'))
                },
                { key: 'articles', label: t('admin.reports.content.published'), align: 'right' }
              ]}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TableCard
              title={t('admin.reports.content.topAuthors')}
              rows={data.topAuthors}
              columns={[
                { key: 'author', label: t('admin.reports.content.author') },
                { key: 'articles', label: t('admin.reports.content.published'), align: 'right' }
              ]}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.content.byStatus')}
              counts={data.byStatus}
              labelPrefix='admin.content.status'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.content.byClassification')}
              counts={data.byClassification}
              labelPrefix='admin.content.classification'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.content.byLanguage')}
              counts={data.byLanguage}
              labelPrefix='language'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.content.compliance')}
              counts={data.compliance}
              labelPrefix='admin.content.compliance.result'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.content.reportsByStatus')}
              counts={data.reportsByStatus}
              labelPrefix='admin.content.reports.status'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.content.commentsByStatus')}
              counts={data.commentsByStatus}
              labelPrefix='admin.content.comments.status'
            />
          </Grid>
        </>
      )}
    </ReportLayout>
  )
}

ContentReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default ContentReport
