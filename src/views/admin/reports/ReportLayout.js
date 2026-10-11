// ** React Imports
import { useContext } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import AdminMessage from 'src/views/admin/AdminMessage'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Hooks
import { presets } from './useReport'

// The frame every report page shares: title, period filter, CSV export, loading and errors.
// `subject` is the area the report covers; the API checks it too, this only avoids a request
// that would be refused.
// `canExport` hides the CSV button for users who may read the report but not take its data out.
const ReportLayout = ({ title, subtitle, subject, report, canExport = true, children }) => {
  const { t, i18n } = useTranslation()
  const ability = useContext(AbilityContext)
  const { range, setRange, data, loading, error, exporting, exportCsv } = report

  if (ability && !ability.can('read', subject)) {
    return <AdminMessage messageKey='errors.forbidden' icon='tabler:lock' />
  }

  const activePreset = Object.keys(presets).find(key => {
    const p = presets[key]()

    return p.from === range.from && p.to === range.to
  })

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 4, mb: 4 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant='h4'>{t(title)}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {t(subtitle)}
                  </Typography>
                </Box>
                {canExport ? (
                  <Button
                    variant='tonal'
                    disabled={exporting || !data}
                    onClick={() => exportCsv(i18n.language === 'en' ? 'en' : 'ar')}
                    startIcon={<Icon icon='tabler:file-download' />}
                  >
                    {t('admin.reports.export')}
                  </Button>
                ) : null}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 4 }}>
                <ToggleButtonGroup
                  exclusive
                  size='small'
                  value={activePreset || null}
                  onChange={(e, key) => key && setRange(presets[key]())}
                >
                  {Object.keys(presets).map(key => (
                    <ToggleButton key={key} value={key}>
                      {t(`admin.reports.preset.${key}`)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <CustomTextField
                  type='date'
                  label={t('admin.reports.from')}
                  value={range.from}
                  onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <CustomTextField
                  type='date'
                  label={t('admin.reports.to')}
                  value={range.to}
                  onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </CardContent>
            {loading ? <LinearProgress /> : null}
          </Card>
        </Grid>

        {error ? (
          <Grid item xs={12}>
            <Alert severity='error'>{t(`errors.${error}`)}</Alert>
          </Grid>
        ) : null}

        {data ? children(data) : null}
      </Grid>
    </ApexChartWrapper>
  )
}

export default ReportLayout
