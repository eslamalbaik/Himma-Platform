// ** React Imports
import { useEffect } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Configs
import { PLATFORM_ROLES, roleLabel } from 'src/configs/roles'

const STATUSES = ['active', 'disabled']

const emptyValues = { nameAr: '', nameEn: '', email: '', role: 'support', status: 'active', password: '' }

// Add/edit form for a platform staff account. `editingUser` is null when adding.
const UserFormDialog = ({ open, editingUser, submitting, errorCode, onSubmit, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: emptyValues,
    values: editingUser ? { ...emptyValues, ...editingUser, password: '' } : emptyValues
  })

  const handleClose = () => {
    reset(emptyValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(editingUser ? 'admin.users.form.editTitle' : 'admin.users.form.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Controller
                name='nameAr'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label={t('admin.users.form.nameAr')}
                    error={Boolean(errors.nameAr)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='nameEn'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label={t('admin.users.form.nameEn')}
                    error={Boolean(errors.nameEn)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='email'
                control={control}
                rules={{ required: !editingUser }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    type='email'
                    fullWidth
                    disabled={Boolean(editingUser)}
                    label={t('admin.users.form.email')}
                    error={Boolean(errors.email)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='role'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.users.form.role')}>
                    {Object.keys(PLATFORM_ROLES).map(role => (
                      <MenuItem key={role} value={role}>
                        {roleLabel(role, lang)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='status'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.users.form.status')}>
                    {STATUSES.map(status => (
                      <MenuItem key={status} value={status}>
                        {t(`admin.users.status.${status}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='password'
                control={control}
                rules={{ required: !editingUser }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    type='password'
                    fullWidth
                    label={t(editingUser ? 'admin.users.form.passwordOptional' : 'admin.users.form.password')}
                    error={Boolean(errors.password)}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
            {t('admin.users.form.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('admin.users.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default UserFormDialog
