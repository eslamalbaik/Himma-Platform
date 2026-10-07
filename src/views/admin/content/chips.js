// ** MUI Imports
import Chip from '@mui/material/Chip'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

const statusColors = {
  draft: 'secondary',
  in_review: 'warning',
  approved: 'info',
  published: 'success',
  rejected: 'error',
  withdrawn: 'secondary'
}

const complianceColors = { compliant: 'success', needs_review: 'warning', non_compliant: 'error' }

export const complianceValueColors = { pass: 'success', warn: 'warning', fail: 'error' }

export const ArticleStatusChip = ({ status }) => {
  const { t } = useTranslation()

  return (
    <Chip
      size='small'
      variant='tonal'
      color={statusColors[status] || 'default'}
      label={t(`admin.content.status.${status}`)}
    />
  )
}

export const ComplianceChip = ({ result }) => {
  const { t } = useTranslation()

  return (
    <Chip
      size='small'
      variant={result ? 'tonal' : 'outlined'}
      color={complianceColors[result] || 'default'}
      label={t(result ? `admin.content.compliance.result.${result}` : 'admin.content.compliance.notChecked')}
    />
  )
}

// Chip for a status inside a translation namespace, e.g. ('admin.content.reports.status', 'open').
export const KeyedStatusChip = ({ namespace, status, colors }) => {
  const { t } = useTranslation()

  return <Chip size='small' variant='tonal' color={colors[status] || 'default'} label={t(`${namespace}.${status}`)} />
}
