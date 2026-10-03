// ** MUI Imports
import Chip from '@mui/material/Chip'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Helpers
import { statusColors } from './format'

const StatusChip = ({ status }) => {
  const { t } = useTranslation()

  return (
    <Chip
      size='small'
      variant='tonal'
      color={statusColors[status] || 'default'}
      label={t(`admin.billing.status.${status}`)}
    />
  )
}

export default StatusChip
