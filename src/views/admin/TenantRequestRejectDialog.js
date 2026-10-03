// ** React Imports
import { useState, useEffect } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

const TenantRequestRejectDialog = ({ open, submitting, onConfirm, onClose }) => {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{t('admin.tenants.requests.rejectDialog.title')}</DialogTitle>
      <DialogContent>
        <CustomTextField
          fullWidth
          multiline
          rows={3}
          label={t('admin.tenants.requests.rejectDialog.reasonLabel')}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.tenants.requests.rejectDialog.cancel')}
        </Button>
        <Button variant='contained' color='error' onClick={() => onConfirm(reason)} disabled={submitting}>
          {t('admin.tenants.requests.rejectDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TenantRequestRejectDialog
