// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportPage from 'src/views/admin/reports/ReportPage'
import { Breakdown, MonthlyChart, RankTable, StatTiles, formatNumber } from 'src/views/admin/reports/widgets'

// ** Helpers
import { localName } from 'src/views/admin/billing/format'

const ContentReport = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const num = value => formatNumber(value, lang)

  return (
    <ReportPage report='content' subject='content' titleKey='nav.reports.content'>
      {data => {
        const { summary } = data
        const bySection = Object.fromEntries(data.publishedBySection.map(row => [row.sectionId || '', row.count]))

        const sectionName = id =>
          id
            ? localName(
                data.publishedBySection.find(row => row.sectionId === id),
                'name',
                lang
              )
            : t('admin.reports.content.noSection')

        return (
          <>
            <StatTiles
              tiles={[
                { labelKey: 'admin.reports.content.created', value: num(summary.created), icon: 'tabler:file-plus' },
                {
                  labelKey: 'admin.reports.content.published',
                  value: num(summary.published),
                  icon: 'tabler:world-upload',
                  color: 'success'
                },
                {
                  labelKey: 'admin.reports.content.withdrawn',
                  value: num(summary.withdrawn),
                  icon: 'tabler:file-x',
                  color: 'error'
                },
                {
                  labelKey: 'admin.reports.content.inReviewNow',
                  value: num(summary.inReviewNow),
                  icon: 'tabler:file-search',
                  color: 'warning',
                  hintKey: 'admin.reports.nowHint'
                }
              ]}
            />
            <StatTiles
              tiles={[
                {
                  labelKey: 'admin.reports.content.issuesPublished',
                  value: num(summary.issuesPublished),
                  icon: 'tabler:book',
                  color: 'info'
                },
                {
                  labelKey: 'admin.reports.content.reports',
                  value: num(summary.reports),
                  icon: 'tabler:flag',
                  color: 'error'
                },
                {
                  labelKey: 'admin.reports.content.averageResolution',
                  value:
                    data.averageResolutionHours === null
                      ? '-'
                      : t('admin.reports.hours', { count: num(data.averageResolutionHours) }),
                  icon: 'tabler:clock',
                  color: 'warning'
                },
                {
                  labelKey: 'admin.reports.content.comments',
                  value: num(summary.comments),
                  icon: 'tabler:message-circle',
                  color: 'secondary'
                }
              ]}
            />

            <Grid item xs={12}>
              <MonthlyChart
                titleKey='admin.reports.content.monthlyTitle'
                monthly={data.monthly}
                series={[
                  { key: 'created', labelKey: 'admin.reports.content.created' },
                  { key: 'published', labelKey: 'admin.reports.content.published' },
                  { key: 'reports', labelKey: 'admin.reports.content.reports' }
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Breakdown
                titleKey='admin.reports.content.publishedBySection'
                counts={bySection}
                label={sectionName}
                color='primary'
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Breakdown
                titleKey='admin.reports.content.publishedByClassification'
                counts={data.publishedByClassification}
                labelPrefix='admin.content.classification'
                color='info'
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.content.publishedByLanguage'
                counts={data.publishedByLanguage}
                labelPrefix='language'
                color='secondary'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.content.createdByStatus'
                counts={data.createdByStatus}
                labelPrefix='admin.content.status'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.content.compliance'
                counts={data.compliance}
                labelPrefix='admin.content.compliance.result'
                color='success'
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.content.reportsByReason'
                counts={data.reportsByReason}
                labelPrefix='admin.content.reports.reason'
                color='error'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.content.reportsByStatus'
                counts={data.reportsByStatus}
                labelPrefix='admin.content.reports.status'
                color='warning'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.content.commentsByStatus'
                counts={data.commentsByStatus}
                labelPrefix='admin.content.comments.status'
                color='secondary'
              />
            </Grid>

            <Grid item xs={12}>
              <RankTable
                titleKey='admin.reports.content.topAuthors'
                rows={data.topAuthors}
                rowKey={row => row.name}
                columns={[
                  { key: 'name', labelKey: 'admin.reports.content.author' },
                  {
                    key: 'count',
                    labelKey: 'admin.reports.content.published',
                    numeric: true,
                    render: row => num(row.count)
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

ContentReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default ContentReport
