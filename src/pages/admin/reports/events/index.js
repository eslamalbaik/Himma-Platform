// ** MUI Imports
import Grid from '@mui/material/Grid'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import ReportPage from 'src/views/admin/reports/ReportPage'
import { Breakdown, MonthlyChart, RankTable, StatTiles, formatNumber } from 'src/views/admin/reports/widgets'

// ** Helpers
import { formatDateTime } from 'src/views/admin/events/helpers'

const EventsReport = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const num = value => formatNumber(value, lang)

  return (
    <ReportPage report='events' subject='events' titleKey='nav.reports.events'>
      {data => {
        const { summary } = data

        return (
          <>
            <StatTiles
              tiles={[
                { labelKey: 'admin.reports.events.events', value: num(summary.events), icon: 'tabler:calendar-event' },
                {
                  labelKey: 'admin.reports.events.registrations',
                  value: num(summary.registrations),
                  icon: 'tabler:users',
                  color: 'info'
                },
                {
                  labelKey: 'admin.reports.events.attended',
                  value: num(summary.attended),
                  icon: 'tabler:user-check',
                  color: 'success'
                },
                {
                  labelKey: 'admin.reports.events.attendanceRate',
                  value: summary.attendanceRate === null ? '-' : `${num(summary.attendanceRate)}%`,
                  icon: 'tabler:percentage',
                  color: 'warning',
                  hintKey: 'admin.reports.events.attendanceHint'
                }
              ]}
            />
            <StatTiles
              tiles={[
                {
                  labelKey: 'admin.reports.events.ended',
                  value: num(summary.ended),
                  icon: 'tabler:circle-check',
                  color: 'success'
                },
                {
                  labelKey: 'admin.reports.events.cancelled',
                  value: num(summary.cancelled),
                  icon: 'tabler:circle-x',
                  color: 'error'
                },
                {
                  labelKey: 'admin.reports.events.byClients',
                  value: num(summary.byClients),
                  icon: 'tabler:building-community',
                  color: 'info'
                },
                {
                  labelKey: 'admin.reports.events.sponsored',
                  value: num(summary.sponsored),
                  icon: 'tabler:speakerphone',
                  color: 'secondary'
                }
              ]}
            />

            <Grid item xs={12}>
              <MonthlyChart
                titleKey='admin.reports.events.monthlyTitle'
                monthly={data.monthly}
                series={[
                  { key: 'events', labelKey: 'admin.reports.events.events' },
                  { key: 'registrations', labelKey: 'admin.reports.events.registrations' }
                ]}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.events.byStatus'
                counts={data.byStatus}
                labelPrefix='admin.events.status'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.events.byType'
                counts={data.byType}
                labelPrefix='admin.events.type'
                color='info'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Breakdown
                titleKey='admin.reports.events.byFormat'
                counts={data.byFormat}
                labelPrefix='admin.events.format'
                color='success'
              />
            </Grid>

            <Grid item xs={12}>
              <RankTable
                titleKey='admin.reports.events.topEvents'
                rows={data.topEvents}
                rowKey={row => row.id}
                columns={[
                  {
                    key: 'title',
                    labelKey: 'admin.reports.events.event',
                    render: row => (lang === 'en' ? row.titleEn : row.titleAr) || row.titleAr || row.titleEn
                  },
                  {
                    key: 'startsAt',
                    labelKey: 'admin.reports.events.startsAt',
                    render: row => formatDateTime(row.startsAt, lang)
                  },
                  {
                    key: 'status',
                    labelKey: 'admin.reports.status',
                    render: row => t(`admin.events.status.${row.status}`)
                  },
                  {
                    key: 'registered',
                    labelKey: 'admin.reports.events.registrations',
                    numeric: true,
                    render: row =>
                      row.capacity ? `${num(row.registered)} / ${num(row.capacity)}` : num(row.registered)
                  },
                  {
                    key: 'attended',
                    labelKey: 'admin.reports.events.attended',
                    numeric: true,
                    render: row => num(row.attended)
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

EventsReport.acl = {
  action: 'read',
  subject: 'reports'
}

export default EventsReport
