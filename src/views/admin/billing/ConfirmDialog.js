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

// Yes/no confirmation for actions that cannot be undone. `title` and `message` are already translated.
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  color = 'error',
  submitting,
  errorCode,
  onConfirm,
  onClose
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <DialogContentText component='div'>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' color={color} onClick={onConfirm} disabled={submitting}>
          {confirmLabel || t('admin.common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
