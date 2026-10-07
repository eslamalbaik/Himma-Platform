// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import TenantPicker from 'src/views/admin/billing/TenantPicker'

// ** Helpers
import { FORMATS, TYPES, VISIBILITIES, fromLocalInput, toLocalInput } from './helpers'

const emptyEvent = {
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  type: 'webinar',
  format: 'online',
  visibility: 'public',
  tenant: null,
  location: '',
  startsAt: '',
  endsAt: '',
  capacity: '',
  registrationRequired: false,
  isSponsored: false,
  streamUrl: '',
  recordingUrl: ''
}

const toForm = event => ({
  ...emptyEvent,
  ...Object.fromEntries(Object.keys(emptyEvent).map(key => [key, event[key] ?? emptyEvent[key]])),
  tenant: event.tenantId ? { id: event.tenantId, nameAr: event.tenantNameAr, nameEn: event.tenantNameEn } : null,
  startsAt: toLocalInput(event.startsAt),
  endsAt: toLocalInput(event.endsAt),
  capacity: event.capacity ?? ''
})

const EventFormDialog = ({ open, event, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ values: event ? toForm(event) : emptyEvent })

  const format = watch('format')
  const visibility = watch('visibility')

  const submit = ({ tenant, ...data }) =>
    onSubmit({
      ...data,
      startsAt: fromLocalInput(data.startsAt),
      endsAt: fromLocalInput(data.endsAt),
      capacity: data.capacity === '' ? null : Number(data.capacity),
      tenantId: visibility === 'institutional' ? tenant?.id || null : null,
      location: format === 'online' ? null : data.location,
      streamUrl: format === 'onsite' ? null : data.streamUrl || null,
      recordingUrl: data.recordingUrl || null
    })

  const text = (name, props = {}, rules) => (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <CustomTextField
          {...field}
          fullWidth
          label={t(`admin.events.field.${name}`)}
          error={Boolean(errors[name])}
          {...props}
        />
      )}
    />
  )

  const select = (name, options) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <CustomTextField {...field} select fullWidth label={t(`admin.events.field.${name}`)}>
          {options.map(value => (
            <MenuItem key={value} value={value}>
              {t(`admin.events.${name}.${value}`)}
            </MenuItem>
          ))}
        </CustomTextField>
      )}
    />
  )

  const toggle = name => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />}
          label={t(`admin.events.field.${name}`)}
        />
      )}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t(event ? 'admin.events.editTitle' : 'admin.events.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              {text('titleAr', {}, { required: true })}
            </Grid>
            <Grid item xs={12} md={6}>
              {text('titleEn', {}, { required: true })}
            </Grid>
            <Grid item xs={12} md={4}>
              {select('type', TYPES)}
            </Grid>
            <Grid item xs={12} md={4}>
              {select('format', FORMATS)}
            </Grid>
            <Grid item xs={12} md={4}>
              {select('visibility', VISIBILITIES)}
            </Grid>
            {visibility === 'institutional' ? (
              <Grid item xs={12}>
                <Controller
                  name='tenant'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TenantPicker
                      value={field.value}
                      onChange={field.onChange}
                      label={t('admin.events.field.tenant')}
                      error={Boolean(errors.tenant)}
                    />
                  )}
                />
              </Grid>
            ) : null}
            <Grid item xs={12} md={6}>
              {text('startsAt', { type: 'datetime-local' }, { required: true })}
            </Grid>
            <Grid item xs={12} md={6}>
              {text('endsAt', { type: 'datetime-local' }, { required: true })}
            </Grid>
            {format !== 'online' ? (
              <Grid item xs={12}>
                {text('location', {}, { required: true })}
              </Grid>
            ) : null}
            {format !== 'onsite' ? (
              <>
                <Grid item xs={12} md={6}>
                  {text('streamUrl', { dir: 'ltr', placeholder: 'https://www.youtube.com/watch?v=...' })}
                </Grid>
                <Grid item xs={12} md={6}>
                  {text('recordingUrl', { dir: 'ltr' })}
                </Grid>
              </>
            ) : null}
            <Grid item xs={12} md={6}>
              {text('descriptionAr', { multiline: true, minRows: 3 })}
            </Grid>
            <Grid item xs={12} md={6}>
              {text('descriptionEn', { multiline: true, minRows: 3 })}
            </Grid>
            <Grid item xs={12} md={4}>
              {text('capacity', { type: 'number', inputProps: { min: 1 } })}
            </Grid>
            <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {toggle('registrationRequired')}
              {toggle('isSponsored')}
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

export default EventFormDialog
