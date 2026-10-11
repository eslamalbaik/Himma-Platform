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

const STATUSES = ['active', 'disabled']

const emptyValues = { nameAr: '', nameEn: '', email: '', role: 'member', status: 'active', password: '' }

// Add/edit form for an account of the user's own organisation. `member` is null when adding. Only roles the
// signed-in user may give are offered (the server checks again); editing yourself keeps your role and status.
const MemberFormDialog = ({ open, member, isSelf, roles, submitting, errorCode, onSubmit, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: emptyValues,
    values: member ? { ...emptyValues, ...member, password: '' } : emptyValues
  })

  const handleClose = () => {
    reset(emptyValues)
    onClose()
  }

  // The member's current role stays listed even when it cannot be given (e.g. your own).
  const options = roles.filter(role => role.assignable || role.key === member?.role)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(member ? 'client.members.form.editTitle' : 'client.members.form.addTitle')}</DialogTitle>
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
                    dir='rtl'
                    label={t('client.members.form.nameAr')}
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
                    dir='ltr'
                    label={t('client.members.form.nameEn')}
                    error={Boolean(errors.nameEn)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='email'
                control={control}
                rules={{ required: !member }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    type='email'
                    fullWidth
                    dir='ltr'
                    disabled={Boolean(member)}
                    label={t('client.members.form.email')}
                    error={Boolean(errors.email)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='role'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    disabled={isSelf}
                    label={t('client.members.form.role')}
                    error={Boolean(errors.role)}
                    helperText={isSelf ? t('client.members.form.ownRole') : null}
                  >
                    {options.map(role => (
                      <MenuItem key={role.key} value={role.key}>
                        {lang === 'en' ? role.nameEn : role.nameAr}
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
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    disabled={isSelf}
                    label={t('client.members.form.status')}
                  >
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
                rules={{ required: !member, minLength: 8 }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    type='password'
                    fullWidth
                    dir='ltr'
                    label={t(member ? 'client.members.form.passwordOptional' : 'client.members.form.password')}
                    error={Boolean(errors.password)}
                    helperText={t('client.members.form.passwordHint')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
            {t('client.members.form.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('client.members.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default MemberFormDialog
