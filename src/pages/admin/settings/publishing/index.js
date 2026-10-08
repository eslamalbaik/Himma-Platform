// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import { CLASSIFICATIONS } from 'src/views/admin/content/ArticleFormDialog'

// Same list as App\Support\PublishingRules::REQUIRABLE_FIELDS.
const REQUIRABLE_FIELDS = ['summary', 'source', 'rightsNote', 'section', 'audiences']

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Rules the content workflow enforces on top of the fixed ones (review before publishing, compliance
// before approval). Editors read them in the article form; only settings managers change them.
const PublishingSettingsPage = () => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)
  const canUpdate = Boolean(ability?.can('update', 'settings'))

  const [values, setValues] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    axios
      .get('/api/admin/settings/publishing')
      .then(response => setValues(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [])

  const set = (name, value) => setValues({ ...values, [name]: value })

  const toggleRequired = field => e =>
    set(
      'requiredOnSubmit',
      e.target.checked ? [...values.requiredOnSubmit, field] : values.requiredOnSubmit.filter(f => f !== field)
    )

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put('/api/admin/settings/publishing', values)
      .then(response => {
        setValues(response.data.data)
        setToast(true)
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const rule = name => (
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch checked={Boolean(values[name])} onChange={e => set(name, e.target.checked)} disabled={!canUpdate} />
        }
        label={t(`admin.settings.publishing.${name}`)}
      />
      <Typography variant='body2' sx={{ color: 'text.secondary', ps: 12 }}>
        {t(`admin.settings.publishing.${name}Help`)}
      </Typography>
    </Grid>
  )

  return (
    <Card>
      <CardHeader title={t('admin.settings.publishing.title')} subheader={t('admin.settings.publishing.subtitle')} />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!values ? (
          errorCode ? null : (
            <CircularProgress size={28} />
          )
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Alert severity='info'>{t('admin.settings.publishing.fixedRules')}</Alert>
            </Grid>

            <Grid item xs={12}>
              <Typography variant='h6'>{t('admin.settings.publishing.requiredOnSubmit')}</Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {t('admin.settings.publishing.requiredOnSubmitHelp')}
              </Typography>
            </Grid>
            {REQUIRABLE_FIELDS.map(field => (
              <Grid item xs={12} sm={6} md={4} key={field}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.requiredOnSubmit.includes(field)}
                      onChange={toggleRequired(field)}
                      disabled={!canUpdate}
                    />
                  }
                  label={t(`admin.settings.publishing.field.${field}`)}
                />
              </Grid>
            ))}

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant='h6'>{t('admin.settings.publishing.approvalRules')}</Typography>
            </Grid>
            {rule('separateApprover')}
            {rule('sponsoredChecks')}

            <Grid item xs={12}>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography variant='h6'>{t('admin.settings.publishing.defaults')}</Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {t('admin.settings.publishing.defaultsHelp')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                select
                fullWidth
                label={t('admin.content.field.classification')}
                value={values.defaultClassification}
                onChange={e => set('defaultClassification', e.target.value)}
                disabled={!canUpdate}
              >
                {CLASSIFICATIONS.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.content.classification.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                select
                fullWidth
                label={t('admin.content.field.language')}
                value={values.defaultLanguage}
                onChange={e => set('defaultLanguage', e.target.value)}
                disabled={!canUpdate}
              >
                {['ar', 'en'].map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`language.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>

            {canUpdate ? (
              <Grid item xs={12}>
                <Box>
                  <Button variant='contained' onClick={save} disabled={submitting}>
                    {t('admin.common.save')}
                  </Button>
                </Box>
              </Grid>
            ) : null}
          </Grid>
        )}
      </CardContent>
      <Snackbar
        open={toast}
        autoHideDuration={4000}
        onClose={() => setToast(false)}
        message={t('admin.common.saved')}
      />
    </Card>
  )
}

PublishingSettingsPage.acl = { action: 'read', subject: 'settings' }

export default PublishingSettingsPage
