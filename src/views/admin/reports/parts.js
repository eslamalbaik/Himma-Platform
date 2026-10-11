// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import TableContainer from '@mui/material/TableContainer'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// Two-series colours (Himma maroon and gold). Checked with the dataviz palette validator in light and
// dark mode: lightness band, chroma, colour-blind separation and normal-vision floor all pass. In dark
// mode the maroon is below 3:1 against the card, so every chart can switch to a table of the same numbers.
export const SERIES_COLORS = ['#A3304E', '#B07A12']

export const monthLabel = (month, lang) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG', { month: 'short', year: '2-digit' }).format(
    new Date(`${month}-01T00:00:00`)
  )

// A row of headline figures.
export const StatTiles = ({ items }) => (
  <Grid item xs={12}>
    <Card>
      <CardContent>
        <Grid container spacing={4}>
          {items.map(item => (
            <Grid item xs={6} sm={4} md key={item.label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <CustomAvatar
                  skin='light'
                  variant='rounded'
                  color={item.color || 'primary'}
                  sx={{ width: 40, height: 40 }}
                >
                  <Icon fontSize='1.5rem' icon={item.icon} />
                </CustomAvatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h5'>{item.value}</Typography>
                  <Typography variant='body2'>{item.label}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  </Grid>
)

// Grouped monthly bars (one y-axis, at most two series) with a switch to the same numbers as a table.
export const MonthlyChart = ({ title, monthly, series, format = v => v }) => {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const [view, setView] = useState('chart')
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const categories = monthly.map(m => monthLabel(m.month, lang))

  const options = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    colors: SERIES_COLORS,
    plotOptions: {
      bar: { borderRadius: 4, borderRadiusApplication: 'end', columnWidth: series.length > 1 ? '55%' : '40%' }
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    dataLabels: { enabled: false },
    legend: {
      show: series.length > 1,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: theme.palette.text.secondary },
      fontFamily: theme.typography.fontFamily
    },
    tooltip: { shared: true, intersect: false, y: { formatter: value => format(value) } },
    grid: { borderColor: theme.palette.divider, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: theme.palette.text.disabled, fontFamily: theme.typography.fontFamily } }
    },
    yaxis: {
      opposite: theme.direction === 'rtl',
      labels: {
        formatter: value => format(value),
        style: { colors: theme.palette.text.disabled, fontFamily: theme.typography.fontFamily }
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <ToggleButtonGroup exclusive size='small' value={view} onChange={(e, v) => v && setView(v)}>
            <ToggleButton value='chart' aria-label={t('admin.reports.viewChart')}>
              <Icon icon='tabler:chart-bar' />
            </ToggleButton>
            <ToggleButton value='table' aria-label={t('admin.reports.viewTable')}>
              <Icon icon='tabler:list-numbers' />
            </ToggleButton>
          </ToggleButtonGroup>
        }
      />
      <CardContent>
        {view === 'chart' ? (
          <ReactApexcharts
            type='bar'
            height={300}
            options={options}
            series={series.map(s => ({ name: s.label, data: monthly.map(m => m[s.key]) }))}
          />
        ) : (
          <RankTable
            columns={[
              { key: 'label', label: t('admin.reports.month') },
              ...series.map(s => ({ key: s.key, label: s.label, align: 'right', render: row => format(row[s.key]) }))
            ]}
            rows={monthly.map((m, i) => ({ ...m, label: categories[i], id: m.month }))}
          />
        )}
      </CardContent>
    </Card>
  )
}

// Counts per value (e.g. clients by type) as labelled bars, largest first.
export const BreakdownCard = ({ title, counts, labelPrefix }) => {
  const { t } = useTranslation()
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, n]) => sum + n, 0)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={title} />
      <CardContent>
        {entries.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.reports.empty')}
          </Typography>
        ) : (
          entries.map(([key, value]) => (
            <Box key={key} sx={{ mb: 3.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 2 }}>
                <Typography variant='body2' sx={{ color: 'text.primary' }}>
                  {labelPrefix ? t(`${labelPrefix}.${key}`, key) : key}
                </Typography>
                <Typography variant='body2' sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {value} · {total > 0 ? Math.round((value / total) * 100) : 0}%
                </Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={total > 0 ? (value / total) * 100 : 0}
                sx={{ height: 6, '& .MuiLinearProgress-bar': { backgroundColor: SERIES_COLORS[0] } }}
              />
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// A plain table: columns [{key, label, align, render}].
export const RankTable = ({ columns, rows }) => {
  const { t } = useTranslation()

  if (!rows.length) {
    return (
      <Typography variant='body2' sx={{ color: 'text.disabled' }}>
        {t('admin.reports.empty')}
      </Typography>
    )
  }

  return (
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            {columns.map(c => (
              <TableCell key={c.key} align={c.align || 'left'}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id || i}>
              {columns.map(c => (
                <TableCell key={c.key} align={c.align || 'left'}>
                  {c.render ? c.render(row) : row[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export const TableCard = ({ title, columns, rows }) => (
  <Card sx={{ height: '100%' }}>
    <CardHeader title={title} />
    <CardContent>
      <RankTable columns={columns} rows={rows} />
    </CardContent>
  </Card>
)
