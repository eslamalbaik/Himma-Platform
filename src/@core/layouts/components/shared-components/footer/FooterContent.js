// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Third Party Import
import { useTranslation } from 'react-i18next'

const FooterContent = () => {
  const { t } = useTranslation()

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ color: 'text.secondary' }}>{t('footer.copyright', { year: new Date().getFullYear() })}</Typography>
    </Box>
  )
}

export default FooterContent
