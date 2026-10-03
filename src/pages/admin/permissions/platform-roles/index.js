// ** MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Configs
import { PLATFORM_ROLES } from 'src/configs/roles'

const actionColor = {
  manage: 'primary',
  read: 'info',
  create: 'success',
  update: 'warning',
  delete: 'error'
}

// Read-only view of the platform roles defined in src/configs/roles.js (mirrored in backend/config/roles.php).
const PlatformRolesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5' sx={{ mb: 1 }}>
          {t('admin.permissions.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>{t('admin.permissions.subtitle')}</Typography>
      </Grid>

      {Object.entries(PLATFORM_ROLES).map(([key, role]) => (
        <Grid item xs={12} md={6} key={key}>
          <Card>
            <CardHeader title={role.label[lang]} subheader={key} />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {role.rules.map((rule, i) => {
                  const actions = [].concat(rule.action)
                  const subjects = [].concat(rule.subject)

                  return actions.map(action =>
                    subjects.map(subject => (
                      <Chip
                        key={`${i}-${action}-${subject}`}
                        size='small'
                        variant='tonal'
                        color={actionColor[action] || 'default'}
                        label={`${t(`admin.permissions.action.${action}`)}: ${
                          subject === 'all'
                            ? t('admin.permissions.allSubjects')
                            : t(`admin.permissions.subject.${subject}`, subject)
                        }`}
                      />
                    ))
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

PlatformRolesPage.acl = {
  action: 'read',
  subject: 'permissions'
}

export default PlatformRolesPage
