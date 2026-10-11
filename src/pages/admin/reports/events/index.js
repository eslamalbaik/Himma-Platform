// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportLayout from 'src/views/admin/reports/ReportLayout'
import useReport from 'src/views/admin/reports/useReport'
import { BreakdownCard, StatTiles, TableCard } from 'src/views/admin/reports/parts'
import { localName, pickLang } from 'src/views/admin/billing/format'

const EventsReport = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const report = useReport('events')
  const dateFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG', { dateStyle: 'medium' })

  return (
    <ReportLayout
      title='admin.reports.events.title'
      subtitle='admin.reports.events.subtitle'
      subject='events'
      report={report}
    >
      {data => (
        <>
          <StatTiles
            items={[
              { label: t('admin.reports.events.events'), value: data.totals.events, icon: 'tabler:calendar-event' },
              {
                label: t('admin.reports.events.held'),
                value: data.totals.held,
                icon: 'tabler:broadcast',
                color: 'success'
              },
              {
                label: t('admin.reports.events.cancelled'),
                value: data.totals.cancelled,
                icon: 'tabler:calendar-x',
                color: 'error'
              },
              {
                label: t('admin.reports.events.registrations'),
                value: data.totals.registrations,
                icon: 'tabler:users',
                color: 'info'
              },
              {
                label: t('admin.reports.events.attendanceRate'),
                value: `${data.totals.attendanceRate}%`,
                icon: 'tabler:circle-check',
                color: 'warning'
              }
            ]}
          />
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.events.byType')}
              counts={data.byType}
              labelPrefix='admin.events.type'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.events.byFormat')}
              counts={data.byFormat}
              labelPrefix='admin.events.format'
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <BreakdownCard
              title={t('admin.reports.events.byStatus')}
              counts={data.byStatus}
              labelPrefix='admin.events.status'
            />
          </Grid>
          <Grid item xs={12}>
            <TableCard
              title={t('admin.reports.events.list')}
              rows={data.events}
              columns={[
                { key: 'title', label: t('admin.reports.events.event'), render: row => localName(row, 'title', lang) },
                {
                  key: 'startsAt',
                  label: t('admin.reports.date'),
                  render: row => dateFormatter.format(new Date(row.startsAt))
                },
                {
                  key: 'type',
                  label: t('admin.reports.events.type'),
                  render: row => t(`admin.events.type.${row.type}`)
                },
                {
                  key: 'status',
                  label: t('admin.reports.events.status'),
                  render: row => t(`admin.events.status.${row.status}`)
                },
                {
                  key: 'capacity',
                  label: t('admin.reports.events.capacity'),
                  align: 'right',
                  render: row => row.capacity ?? '-'
                },
                { key: 'registered', label: t('admin.reports.events.registered'), align: 'right' },
                { key: 'attended', label: t('admin.reports.events.attended'), align: 'right' }
              ]}
            />
          </Grid>
        </>
      )}
    </ReportLayout>
  )
}

EventsReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default EventsReport
