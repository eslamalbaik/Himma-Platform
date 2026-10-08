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
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import TenantPicker from 'src/views/admin/billing/TenantPicker'
import { localName, pickLang } from 'src/views/admin/billing/format'

// Same lists as App\Models\Article.
export const CLASSIFICATIONS = ['public', 'members', 'academic', 'institutional', 'government', 'confidential']
export const TENANT_CLASSIFICATIONS = ['institutional', 'government']
export const AUDIENCES = ['teachers', 'researchers', 'school_leaders', 'students', 'parents', 'decision_makers']

const emptyArticle = {
  title: '',
  summary: '',
  body: '',
  language: 'ar',
  sectionId: '',
  issueId: '',
  classification: 'public',
  tenant: null,
  authorName: '',
  audiences: [],
  tagIds: [],
  isSponsored: false,
  source: '',
  rightsNote: ''
}

const toForm = article => ({
  ...emptyArticle,
  title: article.title,
  summary: article.summary || '',
  body: article.body || '',
  language: article.language,
  sectionId: article.sectionId || '',
  issueId: article.issueId || '',
  classification: article.classification,
  tenant: article.tenantId
    ? { id: article.tenantId, nameAr: article.tenantNameAr, nameEn: article.tenantNameEn }
    : null,
  authorName: article.authorName,
  audiences: article.audiences || [],
  tagIds: (article.tags || []).map(tag => tag.id),
  isSponsored: Boolean(article.isSponsored),
  source: article.source || '',
  rightsNote: article.rightsNote || ''
})

// Create or edit an article. `article` (with its body) is null when adding. `rules` are the publishing
// settings (GET /api/admin/settings/publishing): defaults for a new article and the fields review needs.
const ArticleFormDialog = ({
  open,
  article,
  sections,
  issues,
  tags,
  rules,
  submitting,
  errorCode,
  onSubmit,
  onClose
}) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const newArticle = {
    ...emptyArticle,
    classification: rules?.defaultClassification || emptyArticle.classification,
    language: rules?.defaultLanguage || emptyArticle.language
  }

  // Shown under the fields the publishing settings require before submitting for review.
  const reviewHint = field =>
    rules?.requiredOnSubmit?.includes(field) ? t('admin.content.requiredForReview') : undefined

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ values: article ? toForm(article) : newArticle })

  const classification = watch('classification')
  const needsTenant = TENANT_CLASSIFICATIONS.includes(classification)

  const submit = data => {
    const { tenant, ...rest } = data
    onSubmit({
      ...rest,
      sectionId: rest.sectionId || null,
      issueId: rest.issueId || null,
      tenantId: needsTenant ? tenant?.id || null : null
    })
  }

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
      <DialogTitle>{t(article ? 'admin.content.editTitle' : 'admin.content.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              {text('title', { required: true })}
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
            <Grid item xs={12} md={6}>
              {text('authorName', { required: true })}
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name='sectionId'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    label={t('admin.content.field.section')}
                    helperText={reviewHint('section')}
                  >
                    <MenuItem value=''>{t('admin.content.none')}</MenuItem>
                    {sections.map(section => (
                      <MenuItem key={section.id} value={section.id}>
                        {localName(section, 'name', lang)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Controller
                name='issueId'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.content.field.issue')}>
                    <MenuItem value=''>{t('admin.content.none')}</MenuItem>
                    {issues.map(issue => (
                      <MenuItem key={issue.id} value={issue.id}>
                        {issue.number} · {localName(issue, 'title', lang)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>

            <Grid item xs={12} md={needsTenant ? 6 : 12}>
              <Controller
                name='classification'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    select
                    fullWidth
                    label={t('admin.content.field.classification')}
                    helperText={t('admin.content.classificationHint')}
                  >
                    {CLASSIFICATIONS.map(value => (
                      <MenuItem key={value} value={value}>
                        {t(`admin.content.classification.${value}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            {needsTenant ? (
              <Grid item xs={12} md={6}>
                <Controller
                  name='tenant'
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TenantPicker
                      value={field.value}
                      onChange={field.onChange}
                      label={t('admin.content.field.tenant')}
                      error={Boolean(errors.tenant)}
                    />
                  )}
                />
              </Grid>
            ) : null}

            <Grid item xs={12} md={6}>
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
                      <CustomTextField
                        {...params}
                        fullWidth
                        label={t('admin.content.field.audiences')}
                        helperText={reviewHint('audiences')}
                      />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name='tagIds'
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    value={tags.filter(tag => field.value.includes(tag.id))}
                    onChange={(e, value) => field.onChange(value.map(tag => tag.id))}
                    options={tags}
                    isOptionEqualToValue={(option, selected) => option.id === selected.id}
                    getOptionLabel={tag => localName(tag, 'name', lang)}
                    renderInput={params => (
                      <CustomTextField {...params} fullWidth label={t('admin.content.field.tags')} />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              {text('summary', { multiline: true, minRows: 2, helperText: reviewHint('summary') })}
            </Grid>
            <Grid item xs={12}>
              {text('body', { required: true, multiline: true, minRows: 10 })}
            </Grid>

            <Grid item xs={12} md={6}>
              {text('source', { helperText: reviewHint('source') })}
            </Grid>
            <Grid item xs={12} md={6}>
              {text('rightsNote', { helperText: reviewHint('rightsNote') })}
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='isSponsored'
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />}
                    label={<Typography>{t('admin.content.field.isSponsored')}</Typography>}
                  />
                )}
              />
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

export default ArticleFormDialog
