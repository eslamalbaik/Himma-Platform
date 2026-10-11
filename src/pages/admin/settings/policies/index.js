// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Accordion from '@mui/material/Accordion'
import Typography from '@mui/material/Typography'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SettingsCard from 'src/views/admin/settings/SettingsCard'
import useSettingsGroup, { errorOf } from 'src/views/admin/settings/useSettingsGroup'
import { formatDate, pickLang } from 'src/views/admin/billing/format'

// Settings → Policies: the texts of the public "Media policies and standards" page, one at a time.
const PoliciesSettingsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const group = useSettingsGroup('/api/admin/settings/policies')
  const { values, setValues, canUpdate, setToast } = group
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)
  const [errors, setErrors] = useState({})

  const draftOf = key => drafts[key] || values.policies[key]

  const edit = (key, field, text) => setDrafts({ ...drafts, [key]: { ...draftOf(key), [field]: text } })

  const saveOne = key => {
    setSaving(key)
    setErrors({ ...errors, [key]: null })
    const { ar, en } = draftOf(key)
    axios
      .put(`/api/admin/settings/policies/${key}`, { ar, en })
      .then(response => {
        const { key: _k, ...policy } = response.data.data
        setValues({ ...values, policies: { ...values.policies, [key]: policy } })
        setDrafts(({ [key]: _done, ...rest }) => rest)
        setToast('admin.common.saved')
      })
      .catch(err => setErrors({ ...errors, [key]: errorOf(err) }))
      .finally(() => setSaving(null))
  }

  return (
    <SettingsCard title='admin.settings.policies.title' subtitle='admin.settings.policies.subtitle' group={group}>
      {values
        ? values.keys.map(key => {
            const policy = draftOf(key)
            const written = Boolean(values.policies[key].ar.trim() || values.policies[key].en.trim())

            return (
              <Accordion key={key} disableGutters>
                <AccordionSummary expandIcon={<Icon icon='tabler:chevron-down' />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 500 }}>{t(`policies.${key}`)}</Typography>
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color={written ? 'success' : 'secondary'}
                      label={t(written ? 'admin.settings.policies.published' : 'admin.settings.policies.empty')}
                    />
                    {values.policies[key].updatedAt ? (
                      <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                        {t('admin.settings.policies.updatedOn', {
                          date: formatDate(values.policies[key].updatedAt, lang)
                        })}
                      </Typography>
                    ) : null}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={4}>
                    {['ar', 'en'].map(textLang => (
                      <Grid item xs={12} md={6} key={textLang}>
                        <CustomTextField
                          fullWidth
                          multiline
                          minRows={6}
                          label={t(`admin.settings.policies.text.${textLang}`)}
                          value={policy[textLang]}
                          onChange={e => edit(key, textLang, e.target.value)}
                          disabled={!canUpdate}
                          inputProps={{ dir: textLang === 'ar' ? 'rtl' : 'ltr', maxLength: 20000 }}
                        />
                      </Grid>
                    ))}
                    {errors[key] ? (
                      <Grid item xs={12}>
                        <Typography color='error'>{t(`errors.${errors[key]}`)}</Typography>
                      </Grid>
                    ) : null}
                    {canUpdate ? (
                      <Grid item xs={12}>
                        <Button
                          variant='contained'
                          onClick={() => saveOne(key)}
                          disabled={saving === key || !drafts[key]}
                        >
                          {t('admin.common.save')}
                        </Button>
                      </Grid>
                    ) : null}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )
          })
        : null}
    </SettingsCard>
  )
}

PoliciesSettingsPage.acl = { action: 'read', subject: 'settings' }

export default PoliciesSettingsPage
