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

const TYPES = ['association', 'school', 'institution', 'government']

const emptyValues = {
  nameAr: '',
  nameEn: '',
  type: 'association',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  message: ''
}

// Lets staff manually log a join request until a public request form exists.
const TenantRequestFormDialog = ({ open, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues: emptyValues })

  useEffect(() => {
    if (open) reset(emptyValues)
  }, [open, reset])

  const handleClose = () => {
    reset(emptyValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.tenants.requests.form.addTitle')}</DialogTitle>
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
                    label={t('admin.tenants.requests.form.nameAr')}
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
                    label={t('admin.tenants.requests.form.nameEn')}
                    error={Boolean(errors.nameEn)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='type'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.tenants.requests.form.type')}>
                    {TYPES.map(type => (
                      <MenuItem key={type} value={type}>
                        {t(`admin.tenantType.${type}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='contactName'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label={t('admin.tenants.requests.form.contactName')}
                    error={Boolean(errors.contactName)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='contactEmail'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    type='email'
                    fullWidth
                    label={t('admin.tenants.requests.form.contactEmail')}
                    error={Boolean(errors.contactEmail)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='contactPhone'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth label={t('admin.tenants.requests.form.contactPhone')} />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='message'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label={t('admin.tenants.requests.form.message')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
            {t('admin.tenants.requests.form.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('admin.tenants.requests.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default TenantRequestFormDialog
