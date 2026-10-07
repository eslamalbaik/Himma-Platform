// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

const TenantDeleteDialog = ({ open, tenant, submitting, onConfirm, onClose }) => {
  const { t, i18n } = useTranslation()
  const name = tenant ? (i18n.language === 'en' ? tenant.nameEn : tenant.nameAr) : ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{t('admin.tenants.deleteConfirm.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('admin.tenants.deleteConfirm.message', { name })}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.tenants.deleteConfirm.cancel')}
        </Button>
        <Button variant='contained' color='error' onClick={onConfirm} disabled={submitting}>
          {t('admin.tenants.deleteConfirm.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TenantDeleteDialog
