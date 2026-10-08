// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import TenantPicker from 'src/views/admin/billing/TenantPicker'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'

// Same lists as App\Models\Writer.
export const STATUSES = ['pending', 'verified', 'suspended']
export const VERIFICATION_METHODS = ['id_document', 'organisation_letter', 'interview', 'known_contributor', 'other']

const statusColors = { pending: 'warning', verified: 'success', suspended: 'error' }

export const WriterStatusChip = ({ status }) => {
  const { t } = useTranslation()

  return (
    <Chip
      size='small'
      variant='tonal'
      color={statusColors[status] || 'default'}
      label={t(`admin.writers.status.${status}`)}
    />
  )
}

// Organisation line: the client, else the free-text affiliation.
export const organisationOf = (writer, lang) =>
  writer.tenantId ? localName(writer, 'tenantName', lang) : writer.affiliation || '-'

const emptyWriter = {
  nameAr: '',
  nameEn: '',
  email: '',
  phone: '',
  tenant: null,
  affiliation: '',
  titleAr: '',
  titleEn: '',
  bioAr: '',
  bioEn: ''
}

const toForm = writer => ({
  ...emptyWriter,
  ...Object.fromEntries(Object.keys(emptyWriter).map(key => [key, writer[key] ?? emptyWriter[key]])),
  tenant: writer.tenantId ? { id: writer.tenantId, nameAr: writer.tenantNameAr, nameEn: writer.tenantNameEn } : null
})

// Add or edit a writer's profile. `writer` is null when adding.
export const WriterFormDialog = ({ open, writer, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({ values: writer ? toForm(writer) : emptyWriter })

  const submit = ({ tenant, ...rest }) => onSubmit({ ...rest, tenantId: tenant?.id || null })

  const text = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      rules={props.required ? { required: true } : undefined}
      render={({ field }) => (
        <CustomTextField
          {...field}
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
              {text('nameAr', { required: true, inputProps: { dir: 'rtl' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('nameEn', { required: true, inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('titleAr', { inputProps: { dir: 'rtl' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('titleEn', { inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('email', { type: 'email', inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('phone', { inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name='tenant'
                control={control}
                render={({ field }) => (
                  <TenantPicker value={field.value} onChange={field.onChange} label={t('admin.writers.field.tenant')} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('affiliation', { helperText: t('admin.writers.affiliationHelp') })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('bioAr', { multiline: true, minRows: 3, inputProps: { dir: 'rtl' } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('bioEn', { multiline: true, minRows: 3, inputProps: { dir: 'ltr' } })}
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

// Records how the writer's identity and organisation were confirmed (PUB-02).
export const VerifyWriterDialog = ({ open, writer, submitting, errorCode, onConfirm, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [method, setMethod] = useState('id_document')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setMethod('id_document')
      setNote('')
    }
  }, [open])

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.writers.verifyTitle')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Typography sx={{ mb: 4, color: 'text.secondary' }}>
          {writer ? t('admin.writers.verifyMessage', { name: localName(writer, 'name', lang) }) : null}
        </Typography>
        <CustomTextField
          select
          fullWidth
          sx={{ mb: 4 }}
          label={t('admin.writers.verificationMethod')}
          value={method}
          onChange={e => setMethod(e.target.value)}
        >
          {VERIFICATION_METHODS.map(value => (
            <MenuItem key={value} value={value}>
              {t(`admin.writers.method.${value}`)}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label={t('admin.writers.verificationNote')}
          helperText={t(method === 'other' ? 'admin.writers.noteRequired' : 'admin.writers.noteHelp')}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' color='success' disabled={submitting} onClick={() => onConfirm({ method, note })}>
          {t('admin.writers.action.verify')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const Field = ({ label, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant='body2' sx={{ color: 'text.disabled' }}>
      {label}
    </Typography>
    <Typography component='div' sx={{ whiteSpace: 'pre-line' }}>
      {children || '-'}
    </Typography>
  </Box>
)

// Profile, verification record and latest articles (GET /api/admin/writers/{id}).
export const WriterDetailsDialog = ({ writerId, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [writer, setWriter] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!writerId) return
    setWriter(null)
    setError(null)
    axios
      .get(`/api/admin/writers/${writerId}`)
      .then(response => setWriter(response.data.data))
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
  }, [writerId])

  return (
    <Dialog open={Boolean(writerId)} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {writer ? localName(writer, 'name', lang) : t('admin.writers.detailsTitle')}
        {writer ? <WriterStatusChip status={writer.status} /> : null}
      </DialogTitle>
      <DialogContent>
        {error ? <Alert severity='error'>{t(`errors.${error}`)}</Alert> : null}
        {!writer && !error ? <CircularProgress size={28} /> : null}
        {writer ? (
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Field label={t('admin.writers.field.title')}>{lang === 'en' ? writer.titleEn : writer.titleAr}</Field>
              <Field label={t('admin.writers.organisation')}>{organisationOf(writer, lang)}</Field>
              <Field label={t('admin.writers.field.email')}>{writer.email}</Field>
              <Field label={t('admin.writers.field.phone')}>{writer.phone}</Field>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Field label={t('admin.writers.verification')}>
                {writer.verifiedAt
                  ? t('admin.writers.verifiedBy', {
                      method: t(`admin.writers.method.${writer.verificationMethod}`),
                      name: lang === 'en' ? writer.verifierNameEn : writer.verifierNameAr,
                      date: formatDate(writer.verifiedAt, lang)
                    })
                  : t('admin.writers.notVerified')}
              </Field>
              {writer.verificationNote ? (
                <Field label={t('admin.writers.verificationNote')}>{writer.verificationNote}</Field>
              ) : null}
              {writer.status === 'suspended' ? (
                <Field label={t('admin.writers.suspensionReason')}>{writer.suspensionReason}</Field>
              ) : null}
            </Grid>
            <Grid item xs={12}>
              <Field label={t('admin.writers.field.bio')}>{lang === 'en' ? writer.bioEn : writer.bioAr}</Field>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant='h6' sx={{ mb: 2 }}>
                {t('admin.writers.latestArticles', { count: writer.articlesCount, published: writer.publishedCount })}
              </Typography>
              {writer.articles.length === 0 ? (
                <Typography sx={{ color: 'text.disabled' }}>{t('admin.writers.noArticles')}</Typography>
              ) : (
                writer.articles.map(article => (
                  <Box key={article.id} sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography sx={{ flexGrow: 1 }} dir={article.language === 'en' ? 'ltr' : 'rtl'}>
                      {article.title}
                    </Typography>
                    <Chip size='small' variant='tonal' label={t(`admin.content.status.${article.status}`)} />
                  </Box>
                ))
              )}
            </Grid>
          </Grid>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {t('admin.common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
