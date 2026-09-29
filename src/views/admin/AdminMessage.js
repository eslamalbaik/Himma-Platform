// ** MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// A short bilingual notice inside the admin layout (no access, page not found...).
const AdminMessage = ({ messageKey, icon }) => {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Icon icon={icon} fontSize='3rem' />
        <Typography variant='h5' sx={{ textAlign: 'center' }}>
          {t(messageKey)}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default AdminMessage
