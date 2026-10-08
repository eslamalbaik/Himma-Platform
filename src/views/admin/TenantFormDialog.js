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
const STATUSES = ['trial', 'active', 'suspended', 'cancelled']

const emptyValues = {
  nameAr: '',
  nameEn: '',
  type: 'association',
  status: 'trial',
  billingEmail: '',
  youtubeChannelUrl: ''
}

// Add/edit form for a tenant. `tenant` is null when adding, or the record being edited.
const TenantFormDialog = ({ open, tenant, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: emptyValues,
    values: tenant
      ? {
          ...emptyValues,
          ...tenant,
          billingEmail: tenant.billingEmail || '',
          youtubeChannelUrl: tenant.youtubeChannelUrl || ''
        }
      : emptyValues
  })

  const handleClose = () => {
    reset(emptyValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(tenant ? 'admin.tenants.form.editTitle' : 'admin.tenants.form.addTitle')}</DialogTitle>
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
                    label={t('admin.tenants.form.nameAr')}
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
                    label={t('admin.tenants.form.nameEn')}
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
                  <CustomTextField {...field} select fullWidth label={t('admin.tenants.form.type')}>
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
                name='status'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.tenants.form.status')}>
                    {STATUSES.map(status => (
                      <MenuItem key={status} value={status}>
                        {t(`admin.stats.status.${status}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='billingEmail'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    type='email'
                    label={t('admin.tenants.form.billingEmail')}
                    helperText={t('admin.tenants.form.billingEmailHelp')}
                    inputProps={{ dir: 'ltr' }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='youtubeChannelUrl'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label={t('admin.tenants.form.youtubeChannelUrl')}
                    helperText={t('admin.tenants.form.youtubeChannelUrlHelp')}
                    placeholder='https://www.youtube.com/@...'
                    inputProps={{ dir: 'ltr' }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
            {t('admin.tenants.form.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('admin.tenants.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default TenantFormDialog
