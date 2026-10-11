// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
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

const YouTubeSettingsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const group = useSettingsGroup('/api/admin/settings/youtube')
  const { values, setValues, canUpdate, save, run, busy } = group
  const [apiKey, setApiKey] = useState('')
  const [clearKey, setClearKey] = useState(false)

  const onSave = () =>
    save({
      channelId: values.channelId,
      restrictStreamHosts: values.restrictStreamHosts,
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
      title='admin.settings.youtube.title'
      subtitle='admin.settings.youtube.subtitle'
      group={group}
      onSave={onSave}
      actions={
        <Button
          variant='tonal'
          startIcon={<Icon icon='tabler:plug-connected' />}
          disabled={busy || !values?.hasApiKey || !values?.channelId}
          onClick={() => run('test', 'admin.settings.youtube.checked')}
        >
          {t('admin.settings.testConnection')}
        </Button>
      }
    >
      {values ? (
        <Grid container spacing={5}>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label={t('admin.settings.youtube.channelId')}
              placeholder='UC…'
              value={values.channelId}
              onChange={e => setValues({ ...values, channelId: e.target.value.trim() })}
              disabled={!canUpdate}
              helperText={t('admin.settings.youtube.channelIdHelp')}
              inputProps={{ dir: 'ltr' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SecretField
              label={t('admin.settings.youtube.apiKey')}
              hasValue={values.hasApiKey}
              value={apiKey}
              onChange={setApiKey}
              clear={clearKey}
              onClear={() => setClearKey(!clearKey)}
              disabled={!canUpdate}
            />
          </Grid>
          {values.channelTitle ? (
            <Grid item xs={12}>
              <Alert severity='success' icon={<Icon icon='tabler:circle-check' />}>
                {t('admin.settings.youtube.connected', {
                  channel: values.channelTitle,
                  date: formatDate(values.checkedAt, lang)
                })}
              </Alert>
            </Grid>
          ) : null}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(values.restrictStreamHosts)}
                  onChange={e => setValues({ ...values, restrictStreamHosts: e.target.checked })}
                  disabled={!canUpdate}
                />
              }
              label={t('admin.settings.youtube.restrictStreamHosts')}
            />
            <Typography variant='body2' sx={{ color: 'text.secondary', ps: 12 }}>
              {t('admin.settings.youtube.restrictStreamHostsHelp')}
            </Typography>
          </Grid>
        </Grid>
      ) : null}
    </SettingsCard>
  )
}

YouTubeSettingsPage.acl = { action: 'read', subject: 'settings' }

export default YouTubeSettingsPage
