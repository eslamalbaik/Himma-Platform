// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Views
import { ComplianceChip, complianceValueColors } from './chips'

// Same order and values as App\Models\Article::COMPLIANCE_ITEMS / COMPLIANCE_VALUES.
export const COMPLIANCE_ITEMS = [
  'rights',
  'source',
  'accuracy',
  'language',
  'advertising',
  'privacy',
  'sensitive',
  'national_identity',
  'conflict_of_interest',
  'approvals'
]
const VALUES = ['pass', 'warn', 'fail']

const resultFor = checks => {
  const values = COMPLIANCE_ITEMS.map(item => checks[item])
  if (values.some(value => !value)) return null
  if (values.includes('fail')) return 'non_compliant'
  if (values.includes('warn')) return 'needs_review'

  return 'compliant'
}

// The pre-publication compliance check (REQUIREMENTS.md §4): one result per item, and the overall
// result the server will apply.
const ComplianceDialog = ({ open, article, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const [checks, setChecks] = useState({})

  useEffect(() => {
    if (open) setChecks(article?.complianceChecks || {})
  }, [open, article])

  const result = resultFor(checks)

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.content.compliance.title')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2 }}>
          {article?.title}
        </Typography>
        <Alert severity='info' sx={{ mb: 4 }}>
          {t('admin.content.compliance.hint')}
        </Alert>
        {COMPLIANCE_ITEMS.map((item, index) => (
          <Box
            key={item}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              py: 1.5,
              flexWrap: 'wrap'
            }}
          >
            <Typography>
              {index + 1}. {t(`admin.content.compliance.item.${item}`)}
            </Typography>
            <ToggleButtonGroup
              exclusive
              size='small'
              value={checks[item] || null}
              onChange={(e, value) => value && setChecks(current => ({ ...current, [item]: value }))}
            >
              {VALUES.map(value => (
                <ToggleButton key={value} value={value} color={complianceValueColors[value]}>
                  {t(`admin.content.compliance.value.${value}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4 }}>
          <Typography sx={{ fontWeight: 500 }}>{t('admin.content.compliance.resultLabel')}:</Typography>
          <ComplianceChip result={result} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' onClick={() => onSubmit(checks)} disabled={submitting || !result}>
          {t('admin.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ComplianceDialog
