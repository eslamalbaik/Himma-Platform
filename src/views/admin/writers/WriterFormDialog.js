// ** MUI Imports
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import TenantPicker from 'src/views/admin/billing/TenantPicker'

const emptyWriter = {
  nameAr: '',
  nameEn: '',
  email: '',
  phone: '',
  tenant: null,
  affiliation: '',
  bioAr: '',
  bioEn: ''
}

const toForm = writer => ({
  ...emptyWriter,
  nameAr: writer.nameAr,
  nameEn: writer.nameEn,
  email: writer.email || '',
  phone: writer.phone || '',
  tenant: writer.tenantId ? { id: writer.tenantId, nameAr: writer.tenantNameAr, nameEn: writer.tenantNameEn } : null,
  affiliation: writer.affiliation || '',
  bioAr: writer.bioAr || '',
  bioEn: writer.bioEn || ''
})

// Add or edit a writer's profile. Verification and suspension are separate actions.
const WriterFormDialog = ({ open, writer, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({ values: writer ? toForm(writer) : emptyWriter })

  const submit = ({ tenant, ...rest }) => onSubmit({ ...rest, tenantId: tenant?.id || null })

  const field = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      rules={props.required ? { required: true } : undefined}
      render={({ field: f }) => (
        <CustomTextField
          {...f}
          fullWidth
          label={t(`admin.writers.field.${name}`)}
          error={Boolean(errors[name])}
          {...props}
          required={undefined}
        />
      )}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t(writer ? 'admin.writers.editTitle' : 'admin.writers.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              {field('nameAr', { required: true, inputProps: { dir: 'rtl' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('nameEn', { required: true, inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('email', { type: 'email', inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('phone', { inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='tenant'
                control={control}
                render={({ field: f }) => (
                  <TenantPicker value={f.value} onChange={f.onChange} label={t('admin.writers.field.tenant')} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('affiliation', { helperText: t('admin.writers.affiliationHint') })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('bioAr', { multiline: true, minRows: 3, inputProps: { dir: 'rtl', maxLength: 2000 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('bioEn', { multiline: true, minRows: 3, inputProps: { dir: 'ltr', maxLength: 2000 } })}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
            {t('admin.common.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('admin.common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default WriterFormDialog
