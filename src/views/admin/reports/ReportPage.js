// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import CustomTextField from 'src/@core/components/mui/text-field'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import AdminMessage from 'src/views/admin/AdminMessage'

const pad = n => String(n).padStart(2, '0')
const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// Quick periods; the API takes at most 36 months.
const PRESETS = {
  thisMonth: today => new Date(today.getFullYear(), today.getMonth(), 1),
  last3Months: today => new Date(today.getFullYear(), today.getMonth() - 2, 1),
  last12Months: today => new Date(today.getFullYear(), today.getMonth() - 11, 1),
  thisYear: today => new Date(today.getFullYear(), 0, 1)
}

const presetPeriod = key => {
  const today = new Date()

  return { from: isoDate(PRESETS[key](today)), to: isoDate(today) }
}

// Frame shared by every report: the period filter, loading and error states, and the second permission
// each report needs on top of `read reports` (e.g. revenue also needs `read billing`, as in routes/api.php).
// `children` renders the report from the API's `data`.
const ReportPage = ({ report, subject, titleKey, children }) => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)
  const allowed = ability?.can('read', subject)

  const [period, setPeriod] = useState(() => presetPeriod('last12Months'))
  const [preset, setPreset] = useState('last12Months')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!allowed || !period.from || !period.to) return
    const controller = new AbortController()

    setLoading(true)
    setError(null)
    axios
      .get(`/api/admin/reports/${report}`, { signal: controller.signal, params: period })
      .then(response => setData(response.data.data))
      .catch(err => {
        if (axios.isCancel(err)) return
        setError(err.response ? err.response.data?.error?.code || 'server_error' : 'network_error')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [report, period, allowed])

  if (!allowed) return <AdminMessage messageKey='errors.forbidden' icon='tabler:lock' />

  const choosePreset = key => {
    setPreset(key)
    setPeriod(presetPeriod(key))
  }

  const changeDate = field => event => {
    setPreset(null)
    setPeriod(current => ({ ...current, [field]: event.target.value }))
  }

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 4 }}>
              <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                <Typography variant='h4'>{t(titleKey)}</Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {t('admin.reports.periodHint')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.keys(PRESETS).map(key => (
                  <Button
                    key={key}
                    size='small'
                    variant={preset === key ? 'contained' : 'tonal'}
                    color={preset === key ? 'primary' : 'secondary'}
                    onClick={() => choosePreset(key)}
                  >
                    {t(`admin.reports.preset.${key}`)}
                  </Button>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <CustomTextField
                  type='date'
                  size='small'
                  InputLabelProps={{ shrink: true }}
                  label={t('admin.reports.from')}
                  value={period.from}
                  onChange={changeDate('from')}
                />
                <CustomTextField
                  type='date'
                  size='small'
                  InputLabelProps={{ shrink: true }}
                  label={t('admin.reports.to')}
                  value={period.to}
                  onChange={changeDate('to')}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {error ? (
          <Grid item xs={12}>
            <Alert severity='error'>{t(`errors.${error}`, t('errors.server_error'))}</Alert>
          </Grid>
        ) : null}

        {loading && !data ? (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Grid>
        ) : null}

        {data && !error ? children(data) : null}
      </Grid>
    </ApexChartWrapper>
  )
}

export default ReportPage
