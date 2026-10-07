// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// Asks for a written reason before a decision (reject, withdraw, close a complaint).
// `children` can add extra controls above the text box.
const ReasonDialog = ({
  open,
  title,
  message,
  label,
  confirmLabel,
  color = 'error',
  submitting,
  errorCode,
  onConfirm,
  onClose,
  children
}) => {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {message ? <DialogContentText sx={{ mb: 4 }}>{message}</DialogContentText> : null}
        {children}
        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          autoFocus
          label={label || t('admin.content.reasonLabel')}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button
          variant='contained'
          color={color}
          onClick={() => onConfirm(reason)}
          disabled={submitting || !reason.trim()}
        >
          {confirmLabel || t('admin.common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReasonDialog
