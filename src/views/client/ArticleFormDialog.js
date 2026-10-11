// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

const AUDIENCES = ['teachers', 'researchers', 'school_leaders', 'students', 'parents', 'decision_makers']

// Who a client's article may be for; mirrors ClientAccess::classifications on the server.
export const clientClassifications = user => [
  'public',
  'members',
  'academic',
  user?.tenant?.type === 'government' ? 'government' : 'institutional'
]

const emptyValues = {
  title: '',
  summary: '',
  body: '',
  language: 'ar',
  classification: 'public',
  sectionId: '',
  audiences: [],
  source: '',
  rightsNote: ''
}

const valuesOf = article =>
  article
    ? {
        title: article.title || '',
        summary: article.summary || '',
        body: article.body || '',
        language: article.language,
        classification: article.classification,
        sectionId: article.sectionId || '',
        audiences: article.audiences || [],
        source: article.source || '',
        rightsNote: article.rightsNote || ''
      }
    : emptyValues

// Write or edit one of the organisation's articles. The byline is the signed-in user; editorial fields (issue,
// writer, tags, compliance) are set by the platform's editors after submission.
const ArticleFormDialog = ({ open, article, sections, submitting, errorCode, onSubmit, onClose }) => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ defaultValues: emptyValues, values: valuesOf(article) })

  const textDir = watch('language') === 'en' ? 'ltr' : 'rtl'

  const text = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      rules={props.required ? { required: true } : undefined}
      render={({ field }) => (
        <CustomTextField
          {...field}
          fullWidth
          label={t(`admin.content.field.${name}`)}
          error={Boolean(errors[name])}
          {...props}
          required={undefined}
        />
      )}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t(article ? 'client.articles.form.editTitle' : 'client.articles.form.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          {article?.status === 'rejected' && article.reviewNote ? (
            <Alert severity='warning' sx={{ mb: 4 }}>
              {t('client.articles.reviewNote', { note: article.reviewNote })}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              {text('title', { required: true, inputProps: { dir: textDir } })}
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name='language'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.content.field.language')}>
                    {['ar', 'en'].map(value => (
                      <MenuItem key={value} value={value}>
                        {t(`language.${value}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              {text('summary', { multiline: true, minRows: 2, inputProps: { dir: textDir } })}
            </Grid>
            <Grid item xs={12}>
              {text('body', { required: true, multiline: true, minRows: 8, inputProps: { dir: textDir } })}
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name='classification'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    label={t('admin.content.field.classification')}
                    helperText={t('client.articles.form.classificationHint')}
                  >
                    {clientClassifications(user).map(value => (
                      <MenuItem key={value} value={value}>
                        {t(`admin.content.classification.${value}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name='sectionId'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    SelectProps={{ displayEmpty: true }}
                    label={t('admin.content.field.section')}
                  >
                    <MenuItem value=''>{t('client.articles.form.noSection')}</MenuItem>
                    {sections.map(section => (
                      <MenuItem key={section.id} value={section.id}>
                        {lang === 'en' ? section.nameEn : section.nameAr}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='audiences'
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    value={field.value}
                    onChange={(e, value) => field.onChange(value)}
                    options={AUDIENCES}
                    getOptionLabel={value => t(`admin.content.audience.${value}`)}
                    renderInput={params => (
                      <CustomTextField {...params} fullWidth label={t('admin.content.field.audiences')} />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              {text('source', { helperText: t('client.articles.form.sourceHint') })}
            </Grid>
            <Grid item xs={12} md={6}>
              {text('rightsNote', { helperText: t('client.articles.form.rightsHint') })}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
            {t('client.articles.form.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('client.articles.form.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ArticleFormDialog
