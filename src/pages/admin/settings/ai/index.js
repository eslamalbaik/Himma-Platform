// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import SettingsCard from 'src/views/admin/settings/SettingsCard'
import SecretField from 'src/views/admin/settings/SecretField'
import useSettingsGroup from 'src/views/admin/settings/useSettingsGroup'
import { formatDate, pickLang } from 'src/views/admin/billing/format'

// Same order as App\Settings\Ai.
const FEATURES = ['writerAssistant', 'smartReviewer', 'complianceDetection', 'editorReport', 'issueBuilder']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']

const AiSettingsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const group = useSettingsGroup('/api/admin/settings/ai')
  const { values, setValues, canUpdate, save, run, busy } = group
  const [apiKey, setApiKey] = useState('')
  const [clearKey, setClearKey] = useState(false)

  const set = (name, value) => setValues({ ...values, [name]: value })

  const onSave = () =>
    save({
      enabled: values.enabled,
      model: values.model,
      effort: values.effort,
      features: values.features,
      monthlyLimit: Number(values.monthlyLimit),
      keepGeneratedText: values.keepGeneratedText,
      apiKey,
      clearApiKey: clearKey
    }).then(data => {
      if (data) {
        setApiKey('')
        setClearKey(false)
      }
    })

  return (
    <SettingsCard
      title='admin.settings.ai.title'
      subtitle='admin.settings.ai.subtitle'
      group={group}
      onSave={onSave}
      actions={
        <Button
          variant='tonal'
          startIcon={<Icon icon='tabler:plug-connected' />}
          disabled={busy || !values?.hasApiKey}
          onClick={() => run('test', 'admin.settings.ai.checked')}
        >
          {t('admin.settings.testConnection')}
        </Button>
      }
    >
      {values ? (
        <Grid container spacing={5}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(values.enabled)}
                  onChange={e => set('enabled', e.target.checked)}
                  disabled={!canUpdate}
                />
              }
              label={t('admin.settings.ai.enabled')}
            />
            <Typography variant='body2' sx={{ color: 'text.secondary', ps: 12 }}>
              {t('admin.settings.ai.enabledHelp')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomTextField
              select
              fullWidth
              label={t('admin.settings.ai.model')}
              value={values.model}
              onChange={e => set('model', e.target.value)}
              disabled={!canUpdate}
            >
              {values.models.map(model => (
                <MenuItem key={model} value={model}>
                  {t(`admin.settings.ai.modelName.${model}`)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomTextField
              select
              fullWidth
              label={t('admin.settings.ai.effort')}
              value={values.effort}
              onChange={e => set('effort', e.target.value)}
              disabled={!canUpdate}
              helperText={t('admin.settings.ai.effortHelp')}
            >
              {EFFORTS.map(effort => (
                <MenuItem key={effort} value={effort}>
                  {t(`admin.settings.ai.effortLevel.${effort}`)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <CustomTextField
              fullWidth
              type='number'
              label={t('admin.settings.ai.monthlyLimit')}
              value={values.monthlyLimit}
              onChange={e => set('monthlyLimit', e.target.value)}
              disabled={!canUpdate}
              helperText={t('admin.settings.ai.monthlyLimitHelp')}
              inputProps={{ min: 0, dir: 'ltr' }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <SecretField
              label={t('admin.settings.ai.apiKey')}
              hasValue={values.hasApiKey}
              value={apiKey}
              onChange={setApiKey}
              clear={clearKey}
              onClear={() => setClearKey(!clearKey)}
              disabled={!canUpdate}
            />
          </Grid>
          {values.modelName ? (
            <Grid item xs={12}>
              <Alert severity='success' icon={<Icon icon='tabler:circle-check' />}>
                {t('admin.settings.ai.connected', {
                  model: values.modelName,
                  date: formatDate(values.checkedAt, lang)
                })}
              </Alert>
            </Grid>
          ) : null}
          <Grid item xs={12}>
            <Divider />
          </Grid>
          <Grid item xs={12}>
            <Typography variant='h6'>{t('admin.settings.ai.features')}</Typography>
          </Grid>
          {FEATURES.map(feature => (
            <Grid item xs={12} sm={6} key={feature}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values.features[feature])}
                    onChange={e => set('features', { ...values.features, [feature]: e.target.checked })}
                    disabled={!canUpdate}
                  />
                }
                label={t(`admin.settings.ai.feature.${feature}`)}
              />
            </Grid>
          ))}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(values.keepGeneratedText)}
                  onChange={e => set('keepGeneratedText', e.target.checked)}
                  disabled={!canUpdate}
                />
              }
              label={t('admin.settings.ai.keepGeneratedText')}
            />
            <Typography variant='body2' sx={{ color: 'text.secondary', ps: 12 }}>
              {t('admin.settings.ai.keepGeneratedTextHelp')}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Alert severity='info'>{t('admin.settings.ai.policyNote')}</Alert>
          </Grid>
        </Grid>
      ) : null}
    </SettingsCard>
  )
}

AiSettingsPage.acl = { action: 'read', subject: 'settings' }

export default AiSettingsPage
