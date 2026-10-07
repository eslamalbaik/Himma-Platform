// ** React Imports
import { useContext, useState } from 'react'

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
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

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
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { localName, pickLang } from 'src/views/admin/billing/format'

const AXES = ['knowledge', 'people', 'data', 'identity']
const axisColors = { knowledge: 'primary', people: 'info', data: 'success', identity: 'warning' }

// Form for a section (kind 'sections') or a tag (kind 'tags'). Field labels come from admin.magazine.<kind>.field.*
const TaxonomyFormDialog = ({ kind, open, record, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const isSection = kind === 'sections'
  const empty = isSection
    ? { nameAr: '', nameEn: '', axis: 'knowledge', descriptionAr: '', descriptionEn: '', sortOrder: 0, isActive: true }
    : { nameAr: '', nameEn: '' }
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    values: record ? Object.fromEntries(Object.keys(empty).map(key => [key, record[key] ?? empty[key]])) : empty
  })

  const text = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      rules={name.startsWith('name') ? { required: true } : undefined}
      render={({ field }) => (
        <CustomTextField
          {...field}
          fullWidth
          label={t(`admin.magazine.${kind}.field.${name}`)}
          error={Boolean(errors[name])}
          {...props}
        />
      )}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(`admin.magazine.${kind}.${record ? 'editTitle' : 'addTitle'}`)}</DialogTitle>
      <form
        onSubmit={handleSubmit(data =>
          onSubmit(isSection ? { ...data, sortOrder: Number(data.sortOrder) || 0 } : data)
        )}
        noValidate
      >
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              {text('nameAr')}
            </Grid>
            <Grid item xs={12} sm={6}>
              {text('nameEn')}
            </Grid>
            {isSection ? (
              <>
                <Grid item xs={12} sm={8}>
                  <Controller
                    name='axis'
                    control={control}
                    render={({ field }) => (
                      <CustomTextField {...field} select fullWidth label={t('admin.magazine.sections.field.axis')}>
                        {AXES.map(value => (
                          <MenuItem key={value} value={value}>
                            {t(`admin.magazine.axis.${value}`)}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  {text('sortOrder', { type: 'number' })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {text('descriptionAr', { multiline: true, minRows: 2 })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {text('descriptionEn', { multiline: true, minRows: 2 })}
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name='isActive'
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />
                        }
                        label={t('admin.magazine.sections.field.isActive')}
                      />
                    )}
                  />
                </Grid>
              </>
            ) : null}
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

const TaxonomyTab = ({ kind }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const can = action => Boolean(ability?.can(action, 'magazine'))
  const isSection = kind === 'sections'

  const [filters, setFilters] = useState({ search: '', axis: '' })
  const list = useApiList(`/api/admin/magazine/${kind}`, isSection ? filters : { search: filters.search }, {
    perPage: isSection ? 50 : 25
  })

  const [form, setForm] = useState({ open: false, record: null })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const fail = err => setError(err.response?.data?.error?.code || 'network_error')

  const save = data => {
    setSubmitting(true)
    setError(null)
    const request = form.record
      ? axios.put(`/api/admin/magazine/${kind}/${form.record.id}`, data)
      : axios.post(`/api/admin/magazine/${kind}`, data)
    request
      .then(() => {
        setForm({ open: false, record: null })
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const remove = () => {
    setSubmitting(true)
    setError(null)
    axios
      .delete(`/api/admin/magazine/${kind}/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setToast('admin.common.deleted')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const columns = [
    ...(isSection
      ? [{ key: 'order', label: t('admin.magazine.sections.column.order'), render: row => row.sortOrder }]
      : []),
    {
      key: 'name',
      label: t(`admin.magazine.${kind}.column.name`),
      render: row => (
        <Box>
          <Typography sx={{ fontWeight: 500 }}>{localName(row, 'name', lang)}</Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {lang === 'en' ? row.nameAr : row.nameEn}
          </Typography>
        </Box>
      )
    },
    ...(isSection
      ? [
          {
            key: 'axis',
            label: t('admin.magazine.sections.column.axis'),
            render: row => (
              <Chip
                size='small'
                variant='tonal'
                color={axisColors[row.axis]}
                label={t(`admin.magazine.axis.${row.axis}`)}
              />
            )
          }
        ]
      : []),
    { key: 'articles', label: t(`admin.magazine.${kind}.column.articles`), render: row => row.articlesCount ?? 0 },
    ...(isSection
      ? [
          {
            key: 'state',
            label: t('admin.magazine.sections.column.state'),
            render: row => (
              <Chip
                size='small'
                variant='tonal'
                color={row.isActive ? 'success' : 'secondary'}
                label={t(row.isActive ? 'admin.magazine.sections.active' : 'admin.magazine.sections.inactive')}
              />
            )
          }
        ]
      : []),
    ...(can('update') || can('delete')
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: row => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {can('update') ? (
                  <IconButton
                    size='small'
                    aria-label={t('admin.common.edit')}
                    onClick={() => {
                      setError(null)
                      setForm({ open: true, record: row })
                    }}
                  >
                    <Icon icon='tabler:edit' fontSize='1.25rem' />
                  </IconButton>
                ) : null}
                {can('delete') ? (
                  <IconButton
                    size='small'
                    color='error'
                    aria-label={t('admin.common.delete')}
                    onClick={() => {
                      setError(null)
                      setDeleteTarget(row)
                    }}
                  >
                    <Icon icon='tabler:trash' fontSize='1.25rem' />
                  </IconButton>
                ) : null}
              </Box>
            )
          }
        ]
      : [])
  ]

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4, alignItems: 'flex-end' }}>
        <CustomTextField
          sx={{ flex: '1 1 220px' }}
          placeholder={t('admin.common.search')}
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        {isSection ? (
          <CustomTextField
            select
            sx={{ minWidth: 180 }}
            label={t('admin.magazine.sections.column.axis')}
            value={filters.axis}
            onChange={e => setFilters(f => ({ ...f, axis: e.target.value }))}
          >
            <MenuItem value=''>{t('admin.common.all')}</MenuItem>
            {AXES.map(value => (
              <MenuItem key={value} value={value}>
                {t(`admin.magazine.axis.${value}`)}
              </MenuItem>
            ))}
          </CustomTextField>
        ) : null}
        {can('create') ? (
          <Button
            variant='contained'
            startIcon={<Icon icon='tabler:plus' />}
            onClick={() => {
              setError(null)
              setForm({ open: true, record: null })
            }}
          >
            {t(`admin.magazine.${kind}.add`)}
          </Button>
        ) : null}
      </Box>
      <DataTable columns={columns} list={list} emptyKey={`admin.magazine.${kind}.empty`} />

      <TaxonomyFormDialog
        kind={kind}
        open={form.open}
        record={form.record}
        submitting={submitting}
        errorCode={form.open ? error : null}
        onSubmit={save}
        onClose={() => setForm({ open: false, record: null })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t(`admin.magazine.${kind}.deleteTitle`)}
        message={t(`admin.magazine.${kind}.deleteMessage`, { name: localName(deleteTarget, 'name', lang) })}
        confirmLabel={t('admin.common.delete')}
        submitting={submitting}
        errorCode={deleteTarget ? error : null}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </>
  )
}

const TaxonomyPage = () => {
  const { t } = useTranslation()
  const [tab, setTab] = useState('sections')

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('admin.magazine.taxonomy.title')} subheader={t('admin.magazine.taxonomy.subtitle')} />
          <Tabs value={tab} onChange={(e, value) => setTab(value)} sx={{ px: 5 }}>
            <Tab value='sections' label={t('admin.magazine.taxonomy.tabSections')} />
            <Tab value='tags' label={t('admin.magazine.taxonomy.tabTags')} />
          </Tabs>
          <CardContent>
            <TaxonomyTab key={tab} kind={tab} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

TaxonomyPage.acl = { action: 'read', subject: 'magazine' }

export default TaxonomyPage
