// ** React Imports
import { useContext, useRef, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import useApiOptions from 'src/hooks/useApiOptions'
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import { KeyedStatusChip } from 'src/views/admin/content/chips'

// Same lists as App\Models\LibraryItem.
const LIBRARY_TYPES = ['book', 'research', 'guide', 'report', 'other']
const STATUSES = ['draft', 'published']

const emptyItem = {
  type: 'book',
  title: '',
  authorName: '',
  summary: '',
  publisher: '',
  year: '',
  isbn: '',
  externalUrl: '',
  sectionId: ''
}

const toForm = item => {
  const values = { ...emptyItem }
  Object.keys(emptyItem).forEach(key => {
    values[key] = item[key] ?? ''
  })

  return values
}

const LibraryFormDialog = ({ open, item, sections, submitting, errorCode, onSubmit, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({ values: item ? toForm(item) : emptyItem })

  const submit = data =>
    onSubmit({
      ...data,
      year: data.year ? Number(data.year) : null,
      sectionId: data.sectionId || null,
      externalUrl: data.externalUrl || null,
      isbn: data.isbn || null
    })

  const text = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      rules={props.required ? { required: true } : undefined}
      render={({ field }) => (
        <CustomTextField
          {...field}
          fullWidth
          label={t(`admin.library.field.${name}`)}
          error={Boolean(errors[name])}
          {...props}
          required={undefined}
        />
      )}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>{t(item ? 'admin.library.editTitle' : 'admin.library.addTitle')}</DialogTitle>
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
                name='type'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.library.field.type')}>
                    {LIBRARY_TYPES.map(value => (
                      <MenuItem key={value} value={value}>
                        {t(`library.type.${value}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              {text('authorName', { required: true })}
            </Grid>
            <Grid item xs={12} md={6}>
              {text('publisher')}
            </Grid>
            <Grid item xs={12} sm={4}>
              {text('year', { type: 'number' })}
            </Grid>
            <Grid item xs={12} sm={8}>
              {text('isbn', { inputProps: { dir: 'ltr' } })}
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name='sectionId'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.library.field.sectionId')}>
                    <MenuItem value=''>{t('admin.library.noSection')}</MenuItem>
                    {sections.map(section => (
                      <MenuItem key={section.id} value={section.id}>
                        {localName(section, 'name', lang)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              {text('externalUrl', { inputProps: { dir: 'ltr' }, placeholder: 'https://' })}
            </Grid>
            <Grid item xs={12}>
              {text('summary', { multiline: true, minRows: 3 })}
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

const formatSize = bytes => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '')

// Content → Library: books, research and guides of the community chosen in the switcher, each with a cover and
// a file (or a link). Readers find them at /library once published.
const LibraryPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const can = action => Boolean(ability?.can(action, 'content'))
  const canReadMagazine = Boolean(ability?.can('read', 'magazine'))

  const [filters, setFilters] = useState({ search: '', type: '', status: '' })
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const list = useApiList('/api/admin/content/library', filters)
  const sections = useApiOptions('/api/admin/magazine/sections', { enabled: canReadMagazine })

  const [form, setForm] = useState({ open: false, item: null })
  const [confirm, setConfirm] = useState(null) // { kind: 'publish' | 'unpublish' | 'delete', item }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const fileInput = useRef(null)
  const [uploadTarget, setUploadTarget] = useState(null) // { item, what: 'cover' | 'file' }

  const fail = err => setError(err.response?.data?.error?.code || 'network_error')

  const save = data => {
    setSubmitting(true)
    setError(null)
    const request = form.item
      ? axios.put(`/api/admin/content/library/${form.item.id}`, data)
      : axios.post('/api/admin/content/library', data)
    request
      .then(() => {
        setForm({ open: false, item: null })
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const confirmAction = () => {
    const { kind, item } = confirm
    setSubmitting(true)
    setError(null)
    const request =
      kind === 'delete'
        ? axios.delete(`/api/admin/content/library/${item.id}`, { data: {} })
        : axios.post(`/api/admin/content/library/${item.id}/${kind}`, {})
    request
      .then(() => {
        setConfirm(null)
        setToast(kind === 'delete' ? 'admin.common.deleted' : `admin.library.done.${kind}`)
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const pickFile = (item, what) => {
    setUploadTarget({ item, what })
    if (fileInput.current) {
      fileInput.current.accept = what === 'cover' ? 'image/png,image/jpeg,image/webp' : '.pdf,.epub'
      fileInput.current.value = ''
      fileInput.current.click()
    }
  }

  const upload = file => {
    if (!file || !uploadTarget) return
    const body = new FormData()
    body.append('file', file)
    setSubmitting(true)
    axios
      .post(`/api/admin/content/library/${uploadTarget.item.id}/${uploadTarget.what}`, body)
      .then(() => {
        setToast('admin.library.done.uploaded')
        list.reload()
      })
      .catch(err => setToast(`errors.${err.response?.data?.error?.code || 'network_error'}`))
      .finally(() => setSubmitting(false))
  }

  const columns = [
    {
      key: 'title',
      label: t('admin.library.column.item'),
      render: item => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 56,
              flexShrink: 0,
              borderRadius: 1,
              bgcolor: 'action.hover',
              backgroundImage: item.coverUrl ? `url(${item.coverUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <Box>
            <Typography sx={{ fontWeight: 500 }} dir='auto'>
              {item.title}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {item.authorName}
              {item.year ? ` · ${item.year}` : ''}
              {item.sectionId ? ` · ${localName(item, 'sectionName', lang)}` : ''}
            </Typography>
          </Box>
        </Box>
      )
    },
    { key: 'type', label: t('admin.library.column.type'), render: item => t(`library.type.${item.type}`) },
    {
      key: 'file',
      label: t('admin.library.column.file'),
      render: item =>
        item.fileUrl ? (
          <Box component='a' href={item.fileUrl} target='_blank' rel='noopener noreferrer' dir='auto'>
            {item.fileName} {formatSize(item.fileSize)}
          </Box>
        ) : item.externalUrl ? (
          t('admin.library.linkOnly')
        ) : (
          <Typography variant='body2' sx={{ color: 'warning.main' }}>
            {t('admin.library.noFile')}
          </Typography>
        )
    },
    { key: 'views', label: t('admin.library.column.views'), render: item => item.views ?? 0 },
    {
      key: 'status',
      label: t('admin.library.column.status'),
      render: item => (
        <Box>
          <KeyedStatusChip
            namespace='admin.library.status'
            status={item.status}
            colors={{ draft: 'warning', published: 'success' }}
          />
          {item.status === 'published' && item.publishedAt ? (
            <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary' }}>
              {formatDate(item.publishedAt, lang)}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'actions',
      label: t('admin.common.actions'),
      align: 'right',
      render: item => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {can('manage') ? (
            <Button
              size='small'
              variant='tonal'
              color={item.status === 'published' ? 'secondary' : 'success'}
              onClick={() => {
                setError(null)
                setConfirm({ kind: item.status === 'published' ? 'unpublish' : 'publish', item })
              }}
            >
              {t(item.status === 'published' ? 'admin.library.unpublish' : 'admin.library.publish')}
            </Button>
          ) : null}
          {can('update') ? (
            <>
              <Tooltip title={t('admin.library.uploadCover')}>
                <IconButton size='small' disabled={submitting} onClick={() => pickFile(item, 'cover')}>
                  <Icon icon='tabler:photo' fontSize='1.25rem' />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('admin.library.uploadFile')}>
                <IconButton size='small' disabled={submitting} onClick={() => pickFile(item, 'file')}>
                  <Icon icon='tabler:file-upload' fontSize='1.25rem' />
                </IconButton>
              </Tooltip>
              <IconButton
                size='small'
                aria-label={t('admin.common.edit')}
                onClick={() => {
                  setError(null)
                  setForm({ open: true, item })
                }}
              >
                <Icon icon='tabler:edit' fontSize='1.25rem' />
              </IconButton>
            </>
          ) : null}
          {can('delete') ? (
            <IconButton
              size='small'
              color='error'
              aria-label={t('admin.common.delete')}
              onClick={() => {
                setError(null)
                setConfirm({ kind: 'delete', item })
              }}
            >
              <Icon icon='tabler:trash' fontSize='1.25rem' />
            </IconButton>
          ) : null}
        </Box>
      )
    }
  ]

  const filterSelect = (key, options, labelFn) => (
    <CustomTextField
      select
      sx={{ minWidth: 170 }}
      label={t(`admin.library.filter.${key}`)}
      value={filters[key]}
      onChange={e => setFilter(key, e.target.value)}
    >
      <MenuItem value=''>{t('admin.common.all')}</MenuItem>
      {options.map(value => (
        <MenuItem key={value} value={value}>
          {labelFn(value)}
        </MenuItem>
      ))}
    </CustomTextField>
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.library.title')}
            subheader={t('admin.library.subtitle')}
            action={
              can('create') ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => {
                    setError(null)
                    setForm({ open: true, item: null })
                  }}
                >
                  {t('admin.library.add')}
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
                onChange={e => setFilter('search', e.target.value)}
              />
              {filterSelect('type', LIBRARY_TYPES, value => t(`library.type.${value}`))}
              {filterSelect('status', STATUSES, value => t(`admin.library.status.${value}`))}
            </Box>
            <DataTable columns={columns} list={list} emptyKey='admin.library.empty' />
          </CardContent>
        </Card>
      </Grid>

      <input ref={fileInput} type='file' hidden onChange={e => upload(e.target.files?.[0])} />
      <LibraryFormDialog
        open={form.open}
        item={form.item}
        sections={sections}
        submitting={submitting}
        errorCode={form.open ? error : null}
        onSubmit={save}
        onClose={() => setForm({ open: false, item: null })}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={t(confirm ? `admin.library.confirm.${confirm.kind}.title` : 'admin.common.delete')}
        message={t(confirm ? `admin.library.confirm.${confirm.kind}.message` : 'admin.common.delete', {
          title: confirm?.item.title
        })}
        confirmLabel={t(
          confirm?.kind === 'delete'
            ? 'admin.common.delete'
            : confirm?.kind === 'unpublish'
            ? 'admin.library.unpublish'
            : 'admin.library.publish'
        )}
        color={confirm?.kind === 'publish' ? 'success' : 'error'}
        submitting={submitting}
        errorCode={confirm ? error : null}
        onConfirm={confirmAction}
        onClose={() => setConfirm(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Grid>
  )
}

LibraryPage.acl = { action: 'read', subject: 'content' }

export default LibraryPage
