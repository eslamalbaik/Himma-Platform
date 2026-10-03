// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

const UserDeleteDialog = ({ open, user, submitting, onConfirm, onClose }) => {
  const { t, i18n } = useTranslation()
  const name = user ? (i18n.language === 'en' ? user.nameEn : user.nameAr) : ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{t('admin.users.deleteConfirm.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('admin.users.deleteConfirm.message', { name })}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.users.deleteConfirm.cancel')}
        </Button>
        <Button variant='contained' color='error' onClick={onConfirm} disabled={submitting}>
          {t('admin.users.deleteConfirm.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UserDeleteDialog
