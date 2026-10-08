// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableBody from '@mui/material/TableBody'
import TableHead from '@mui/material/TableHead'
import TableCell from '@mui/material/TableCell'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import TableContainer from '@mui/material/TableContainer'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// Building blocks shared by the report pages (src/pages/admin/reports/*).

export const formatNumber = (value, lang) =>
  value === null || value === undefined ? '-' : new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'ar-AE').format(value)

// Row of headline figures: [{ labelKey, value, icon, color, hintKey? }].
export const StatTiles = ({ tiles }) => {
  const { t } = useTranslation()

  return tiles.map(tile => (
    <Grid key={tile.labelKey} item xs={12} sm={6} md={12 / Math.min(tiles.length, 4)}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <CustomAvatar skin='light' variant='rounded' color={tile.color || 'primary'} sx={{ width: 42, height: 42 }}>
            <Icon icon={tile.icon} fontSize='1.5rem' />
          </CustomAvatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h5'>{tile.value}</Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {t(tile.labelKey)}
            </Typography>
            {tile.hintKey ? (
              <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                {t(tile.hintKey)}
              </Typography>
            ) : null}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  ))
}

// Monthly series from the API's `monthly` rows: series = [{ key, labelKey }].
export const MonthlyChart = ({ titleKey, monthly, series, format, type = 'bar' }) => {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const monthFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE', { month: 'short', year: '2-digit' })
  const palette = [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.error.main,
    theme.palette.success.main
  ]
  const show = value => (format ? format(value) : formatNumber(value, lang))

  // Counts are whole numbers: with small values, one tick per unit so the axis never repeats a label.
  const max = Math.max(0, ...monthly.flatMap(m => series.map(s => m[s.key])))
  const tickAmount = !format && max > 0 && max < 5 ? max : 5

  const options = {
    chart: { parentHeightOffset: 0, toolbar: { show: false }, stacked: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: series.length > 1 ? '60%' : '40%' } },
    colors: palette.slice(0, series.length),
    dataLabels: { enabled: false },
    stroke: type === 'line' ? { width: 3, curve: 'smooth' } : { show: false },
    legend: {
      show: series.length > 1,
      position: 'top',
      horizontalAlign: 'start',
      labels: { colors: theme.palette.text.secondary },
      fontFamily: theme.typography.fontFamily
    },
    grid: { borderColor: theme.palette.divider, padding: { top: -10 } },
    tooltip: { y: { formatter: show } },
    xaxis: {
      categories: monthly.map(m => monthFormatter.format(new Date(`${m.month}-01T00:00:00`))),
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: theme.palette.text.disabled, fontFamily: theme.typography.fontFamily } }
    },
    yaxis: {
      min: 0,
      tickAmount,
      labels: {
        formatter: value => show(Math.round(value)),
        style: { colors: theme.palette.text.disabled, fontFamily: theme.typography.fontFamily }
      }
    }
  }

  return (
    <Card>
      <CardHeader title={t(titleKey)} />
      <CardContent>
        <ReactApexcharts
          type={type}
          height={300}
          options={options}
          series={series.map(s => ({ name: t(s.labelKey), data: monthly.map(m => m[s.key]) }))}
        />
      </CardContent>
    </Card>
  )
}

// Share of each value in a { value: count } object, e.g. { ar: 3, en: 1 } with labelPrefix 'language'.
// `label` replaces the translation lookup (e.g. plan names); `format` shows amounts as money.
export const Breakdown = ({ titleKey, counts, labelPrefix, label, format, color = 'primary', subheader }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const labelOf = label || (key => t(`${labelPrefix}.${key}`, key))
  const show = format || (value => formatNumber(value, lang))
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t(titleKey)} subheader={subheader} />
      <CardContent>
        {total === 0 ? (
          <Typography sx={{ color: 'text.disabled' }}>{t('admin.reports.noData')}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            {Object.entries(counts).map(([key, count]) => (
              <div key={key}>
                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant='body2'>{labelOf(key)}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {show(count)} · {Math.round((count / total) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  color={color}
                  value={(count / total) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </div>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// Ranked list: columns = [{ key, labelKey, render?, numeric? }].
export const RankTable = ({ titleKey, rows, columns, rowKey }) => {
  const { t } = useTranslation()

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t(titleKey)} />
      {rows.length === 0 ? (
        <CardContent>
          <Typography sx={{ color: 'text.disabled' }}>{t('admin.reports.noData')}</Typography>
        </CardContent>
      ) : (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 32 }}>#</TableCell>
                {columns.map(column => (
                  <TableCell key={column.key} align={column.numeric ? 'right' : 'left'}>
                    {t(column.labelKey)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={rowKey(row, index)}>
                  <TableCell>{index + 1}</TableCell>
                  {columns.map(column => (
                    <TableCell key={column.key} align={column.numeric ? 'right' : 'left'}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  )
}
