// ** MUI Imports
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import SettingsCard from 'src/views/admin/settings/SettingsCard'
import useSettingsGroup from 'src/views/admin/settings/useSettingsGroup'

// Same order as App\Settings\Publishing::RULES.
const RULES = [
  'requireSource',
  'requireRightsNote',
  'requireSection',
  'requireVerifiedWriter',
  'publishNeedsCompliant',
  'separatePublisher'
]

const PublishingSettingsPage = () => {
  const { t } = useTranslation()
  const group = useSettingsGroup('/api/admin/settings/publishing')
  const { values, setValues, canUpdate, save } = group

  return (
    <SettingsCard
      title='admin.settings.publishing.title'
      subtitle='admin.settings.publishing.subtitle'
      group={group}
      onSave={() => save(values)}
    >
      {values ? (
        <Grid container spacing={4}>
          {RULES.map(rule => (
            <Grid item xs={12} key={rule}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values[rule])}
                    onChange={e => setValues({ ...values, [rule]: e.target.checked })}
                    disabled={!canUpdate}
                  />
                }
                label={t(`admin.settings.publishing.rule.${rule}`)}
              />
              <Typography variant='body2' sx={{ color: 'text.secondary', ps: 12 }}>
                {t(`admin.settings.publishing.ruleHelp.${rule}`)}
              </Typography>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Divider />
          </Grid>
          <Grid item xs={12}>
            <Typography variant='h6'>{t('admin.settings.publishing.sponsoredLabel')}</Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {t('admin.settings.publishing.sponsoredLabelHelp')}
            </Typography>
          </Grid>
          {['Ar', 'En'].map(lang => (
            <Grid item xs={12} sm={6} key={lang}>
              <CustomTextField
                fullWidth
                label={t(`admin.settings.publishing.sponsoredLabel${lang}`)}
                value={values[`sponsoredLabel${lang}`]}
                onChange={e => setValues({ ...values, [`sponsoredLabel${lang}`]: e.target.value })}
                disabled={!canUpdate}
                inputProps={{ dir: lang === 'Ar' ? 'rtl' : 'ltr', maxLength: 60 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : null}
    </SettingsCard>
  )
}

PublishingSettingsPage.acl = { action: 'read', subject: 'settings' }

export default PublishingSettingsPage
