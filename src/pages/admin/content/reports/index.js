// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import { ArticleStatusChip, KeyedStatusChip } from 'src/views/admin/content/chips'
import ReasonDialog from 'src/views/admin/content/ReasonDialog'

// Same lists as App\Models\ContentReport.
const REASONS = ['misinformation', 'copyright', 'offensive', 'privacy', 'advertising', 'other']
const STATUSES = ['open', 'resolved', 'dismissed']
const statusColors = { open: 'warning', resolved: 'success', dismissed: 'secondary' }

// Search-as-you-type article picker.
const ArticlePicker = ({ value, onChange, error }) => {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [options, setOptions] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      axios
        .get('/api/admin/content/articles', {
          signal: controller.signal,
          params: { search: input || undefined, perPage: 20 }
        })
        .then(response => setOptions(response.data.data))
        .catch(() => {})
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [input])

  return (
    <Autocomplete
      value={value}
      onChange={(e, newValue) => onChange(newValue)}
      onInputChange={(e, newInput) => setInput(newInput)}
      options={options}
      filterOptions={x => x}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      getOptionLabel={option => option.title}
      noOptionsText={t('admin.content.reports.noArticles')}
      renderInput={params => (
        <CustomTextField
          {...params}
          fullWidth
          label={t('admin.content.reports.field.article')}
          placeholder={t('admin.content.reports.searchArticle')}
          error={error}
        />
      )}
    />
  )
}

const ReportFormDialog = ({ open, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const empty = { article: null, reporterName: '', reporterEmail: '', reason: 'misinformation', details: '' }
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues: empty })

  useEffect(() => {
    if (open) reset(empty)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = ({ article, ...rest }) =>
    onSubmit({ ...rest, articleId: article?.id, reporterEmail: rest.reporterEmail || null })

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.content.reports.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Controller
                name='article'
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <ArticlePicker value={field.value} onChange={field.onChange} error={Boolean(errors.article)} />
                )}
              />
            </Grid>
            {['reporterName', 'reporterEmail'].map(name => (
              <Grid item xs={12} sm={6} key={name}>
                <Controller
                  name={name}
                  control={control}
                  rules={name === 'reporterName' ? { required: true } : undefined}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label={t(`admin.content.reports.field.${name}`)}
                      error={Boolean(errors[name])}
                    />
                  )}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Controller
                name='reason'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.content.reports.field.reason')}>
                    {REASONS.map(value => (
                      <MenuItem key={value} value={value}>
                        {t(`admin.content.reports.reason.${value}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name='details'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={3}
                    label={t('admin.content.reports.field.details')}
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

const ContentReportsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'content'))
  const canDecide = Boolean(ability?.can('update', 'content'))

  const [filters, setFilters] = useState({ search: '', status: '', reason: '' })
  const list = useApiList('/api/admin/content/reports', filters)

  const [formOpen, setFormOpen] = useState(false)
  const [deciding, setDeciding] = useState(null)
  const [decision, setDecision] = useState('resolved')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const fail = err => setError(err.response?.data?.error?.code || 'network_error')

  const create = data => {
    setSubmitting(true)
    setError(null)
    axios
      .post('/api/admin/content/reports', data)
      .then(() => {
        setFormOpen(false)
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const decide = note => {
    setSubmitting(true)
    setError(null)
    axios
      .post(`/api/admin/content/reports/${deciding.id}/decide`, { status: decision, note })
      .then(() => {
        setDeciding(null)
        setToast('admin.content.reports.decided')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const columns = [
    {
      key: 'article',
      label: t('admin.content.reports.column.article'),
      render: report => (
        <Box>
          <Typography sx={{ fontWeight: 500 }} dir='auto'>
            {report.articleTitle}
          </Typography>
          {report.articleStatus ? <ArticleStatusChip status={report.articleStatus} /> : null}
        </Box>
      )
    },
    {
      key: 'reporter',
      label: t('admin.content.reports.column.reporter'),
      render: report => (
        <Box>
          <Typography variant='body2'>{report.reporterName}</Typography>
          {report.reporterEmail ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {report.reporterEmail}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'reason',
      label: t('admin.content.reports.column.reason'),
      render: report => (
        <Box sx={{ maxWidth: 320 }}>
          <Typography variant='body2' sx={{ fontWeight: 500 }}>
            {t(`admin.content.reports.reason.${report.reason}`)}
          </Typography>
          {report.details ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }} dir='auto'>
              {report.details}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'status',
      label: t('admin.content.reports.column.status'),
      render: report => (
        <Box sx={{ maxWidth: 260 }}>
          <KeyedStatusChip namespace='admin.content.reports.status' status={report.status} colors={statusColors} />
          {report.resolutionNote ? (
            <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary', mt: 1 }} dir='auto'>
              {report.resolutionNote}
              {report.resolverNameAr || report.resolverNameEn
                ? ` (${t('admin.content.reports.resolvedBy', { name: localName(report, 'resolverName', lang) })})`
                : ''}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'date',
      label: t('admin.content.reports.column.date'),
      render: report => formatDate(report.createdAt, lang)
    },
    ...(canDecide
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: report =>
              report.status === 'open' ? (
                <Button
                  size='small'
                  variant='tonal'
                  onClick={() => {
                    setError(null)
                    setDecision('resolved')
                    setDeciding(report)
                  }}
                >
                  {t('admin.content.reports.decide')}
                </Button>
              ) : null
          }
        ]
      : [])
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {t('admin.content.reports.title')}
                {list.meta.openCount ? (
                  <Chip
                    size='small'
                    color='warning'
                    label={t('admin.content.reports.openCount', { count: list.meta.openCount })}
                  />
                ) : null}
              </Box>
            }
            subheader={t('admin.content.reports.subtitle')}
            action={
              canCreate ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => {
                    setError(null)
                    setFormOpen(true)
                  }}
                >
                  {t('admin.content.reports.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 220px' }}
                placeholder={t('admin.common.search')}
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
              <CustomTextField
                select
                sx={{ minWidth: 170 }}
                label={t('admin.content.reports.column.status')}
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value=''>{t('admin.common.all')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.content.reports.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                sx={{ minWidth: 170 }}
                label={t('admin.content.reports.column.reason')}
                value={filters.reason}
                onChange={e => setFilters(f => ({ ...f, reason: e.target.value }))}
              >
                <MenuItem value=''>{t('admin.common.all')}</MenuItem>
                {REASONS.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.content.reports.reason.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>
            <DataTable columns={columns} list={list} emptyKey='admin.content.reports.empty' />
          </CardContent>
        </Card>
      </Grid>

      <ReportFormDialog
        open={formOpen}
        submitting={submitting}
        errorCode={formOpen ? error : null}
        onSubmit={create}
        onClose={() => setFormOpen(false)}
      />
      <ReasonDialog
        open={Boolean(deciding)}
        title={t('admin.content.reports.decideTitle')}
        message={deciding?.articleTitle}
        label={t('admin.content.reports.noteLabel')}
        color='primary'
        submitting={submitting}
        errorCode={deciding ? error : null}
        onConfirm={decide}
        onClose={() => setDeciding(null)}
      >
        <ToggleButtonGroup
          exclusive
          size='small'
          value={decision}
          onChange={(e, value) => value && setDecision(value)}
          sx={{ mb: 4 }}
        >
          <ToggleButton value='resolved' color='success'>
            {t('admin.content.reports.resolve')}
          </ToggleButton>
          <ToggleButton value='dismissed' color='secondary'>
            {t('admin.content.reports.dismiss')}
          </ToggleButton>
        </ToggleButtonGroup>
      </ReasonDialog>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Grid>
  )
}

ContentReportsPage.acl = { action: 'read', subject: 'content' }

export default ContentReportsPage
