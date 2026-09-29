// ** MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// Shown for sidebar sections whose page has not been built yet.
const SectionPlaceholder = ({ title, sectionTitle, icon }) => {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Box sx={{ color: 'primary.main' }}>
          <Icon icon={icon || 'tabler:tools'} fontSize='3rem' />
        </Box>
        {sectionTitle && sectionTitle !== title ? (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {t(sectionTitle)}
          </Typography>
        ) : null}
        <Typography variant='h4'>{t(title)}</Typography>
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 480 }}>
          {t('admin.placeholder')}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default SectionPlaceholder
