// ** MUI Imports
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import MenuItem from '@mui/material/MenuItem'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Helpers
import { localName, pickLang } from 'src/views/admin/billing/format'

const empty = { nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', copyFrom: '' }

// ROL-04: add a custom role (optionally copying another role's permissions) or rename one.
const RoleFormDialog = ({ open, role, roles, submitting, errorCode, onSubmit, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    values: role
      ? {
          ...empty,
          nameAr: role.nameAr,
          nameEn: role.nameEn,
          descriptionAr: role.descriptionAr || '',
          descriptionEn: role.descriptionEn || ''
        }
      : empty
  })

  const submit = ({ copyFrom, ...rest }) => onSubmit(role ? rest : { ...rest, copyFrom: copyFrom || null })

  const text = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      rules={props.required ? { required: true } : undefined}
      render={({ field }) => (
        <CustomTextField
          {...field}
          fullWidth
          label={t(`admin.tenantRoles.field.${name}`)}
          error={Boolean(errors[name])}
          {...props}
          required={undefined}
        />
      )}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(role ? 'admin.tenantRoles.editTitle' : 'admin.tenantRoles.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              {text('nameAr', { required: true, inputProps: { dir: 'rtl', maxLength: 100 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('nameEn', { required: true, inputProps: { dir: 'ltr', maxLength: 100 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('descriptionAr', { multiline: true, minRows: 2, inputProps: { dir: 'rtl', maxLength: 500 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('descriptionEn', { multiline: true, minRows: 2, inputProps: { dir: 'ltr', maxLength: 500 } })}
            </Grid>
            {role ? null : (
              <Grid item xs={12}>
                <Controller
                  name='copyFrom'
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      select
                      fullWidth
                      label={t('admin.tenantRoles.field.copyFrom')}
                      helperText={t('admin.tenantRoles.copyFromHint')}
                    >
                      <MenuItem value=''>{t('admin.tenantRoles.startEmpty')}</MenuItem>
                      {roles.map(r => (
                        <MenuItem key={r.id} value={r.id}>
                          {localName(r, 'name', lang)}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  )}
                />
              </Grid>
            )}
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

export default RoleFormDialog
