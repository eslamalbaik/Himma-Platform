// The small blue tick next to the name of a verified person or organization.

// ** MUI Imports
import Tooltip from '@mui/material/Tooltip'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

const VerifiedBadge = ({ verified, size = '1.1rem' }) => {
  const { t } = useTranslation()
  if (!verified) return null

  return (
    <Tooltip title={t('community.verified')}>
      <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginInlineStart: 4 }}>
        <Icon
          icon='tabler:rosette-discount-check-filled'
          fontSize={size}
          color='#1D9BF0'
          aria-label={t('community.verified')}
        />
      </span>
    </Tooltip>
  )
}

export default VerifiedBadge
