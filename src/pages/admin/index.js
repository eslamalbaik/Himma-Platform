// ** MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Configs
import { roleLabel } from 'src/configs/roles'

// ** Views
import SectionPlaceholder from 'src/views/admin/SectionPlaceholder'

const AdminOverview = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const name = lang === 'en' ? user?.nameEn : user?.nameAr

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
            <Typography variant='h4'>{t('admin.welcome', { name })}</Typography>
            {user ? <Chip color='primary' variant='tonal' label={roleLabel(user.role, lang)} /> : null}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <SectionPlaceholder title='nav.overview' icon='tabler:smart-home' />
      </Grid>
    </Grid>
  )
}

AdminOverview.acl = {
  action: 'read',
  subject: 'dashboard'
}

export default AdminOverview
