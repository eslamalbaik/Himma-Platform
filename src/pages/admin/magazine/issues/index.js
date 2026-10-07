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
import Snackbar from '@mui/material/Snackbar'
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
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import { KeyedStatusChip } from 'src/views/admin/content/chips'

const FIELDS = ['titleAr', 'titleEn', 'themeAr', 'themeEn']
const emptyIssue = { number: '', titleAr: '', titleEn: '', themeAr: '', themeEn: '' }

const IssueFormDialog = ({ open, issue, nextNumber, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    values: issue
      ? { ...emptyIssue, ...issue, themeAr: issue.themeAr || '', themeEn: issue.themeEn || '' }
      : { ...emptyIssue, number: nextNumber }
  })

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(issue ? 'admin.magazine.issues.editTitle' : 'admin.magazine.issues.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(data => onSubmit({ ...data, number: Number(data.number) }))} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Controller
                name='number'
                control={control}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    type='number'
                    label={t('admin.magazine.issues.field.number')}
                    error={Boolean(errors.number)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={8} />
            {FIELDS.map(name => (
              <Grid item xs={12} sm={6} key={name}>
                <Controller
                  name={name}
                  control={control}
                  rules={name.startsWith('title') ? { required: true } : undefined}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label={t(`admin.magazine.issues.field.${name}`)}
                      error={Boolean(errors[name])}
                    />
                  )}
                />
              </Grid>
            ))}
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

const IssuesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const can = action => Boolean(ability?.can(action, 'magazine'))

  const [search, setSearch] = useState('')
  const list = useApiList('/api/admin/magazine/issues', { search })

  const [form, setForm] = useState({ open: false, issue: null })
  const [confirm, setConfirm] = useState(null) // { kind: 'publish' | 'delete', issue }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const fail = err => setError(err.response?.data?.error?.code || 'network_error')
  const nextNumber = (list.rows.reduce((max, issue) => Math.max(max, issue.number), 0) || 0) + 1

  const save = data => {
    setSubmitting(true)
    setError(null)
    const request = form.issue
      ? axios.put(`/api/admin/magazine/issues/${form.issue.id}`, data)
      : axios.post('/api/admin/magazine/issues', data)
    request
      .then(() => {
        setForm({ open: false, issue: null })
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const confirmAction = () => {
    const { kind, issue } = confirm
    setSubmitting(true)
    setError(null)
    const request =
      kind === 'publish'
        ? axios.post(`/api/admin/magazine/issues/${issue.id}/publish`, {})
        : axios.delete(`/api/admin/magazine/issues/${issue.id}`, { data: {} })
    request
      .then(() => {
        setConfirm(null)
        setToast(kind === 'publish' ? 'admin.magazine.issues.published' : 'admin.common.deleted')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const columns = [
    {
      key: 'number',
      label: t('admin.magazine.issues.column.number'),
      render: issue => <strong>{issue.number}</strong>
    },
    {
      key: 'title',
      label: t('admin.magazine.issues.column.title'),
      render: issue => <Typography sx={{ fontWeight: 500 }}>{localName(issue, 'title', lang)}</Typography>
    },
    {
      key: 'theme',
      label: t('admin.magazine.issues.column.theme'),
      render: issue => (issue.themeAr || issue.themeEn ? localName(issue, 'theme', lang) : '-')
    },
    { key: 'articles', label: t('admin.magazine.issues.column.articles'), render: issue => issue.articlesCount ?? 0 },
    {
      key: 'status',
      label: t('admin.magazine.issues.column.status'),
      render: issue => (
        <Box>
          <KeyedStatusChip
            namespace='admin.magazine.issues.status'
            status={issue.status}
            colors={{ draft: 'warning', published: 'success' }}
          />
          {issue.publishedAt ? (
            <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary' }}>
              {formatDate(issue.publishedAt, lang)}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'actions',
      label: t('admin.common.actions'),
      align: 'right',
      render: issue => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {can('update') && issue.status === 'draft' ? (
            <Button
              size='small'
              variant='tonal'
              color='success'
              onClick={() => {
                setError(null)
                setConfirm({ kind: 'publish', issue })
              }}
            >
              {t('admin.magazine.issues.publish')}
            </Button>
          ) : null}
          {can('update') ? (
            <IconButton
              size='small'
              aria-label={t('admin.common.edit')}
              onClick={() => {
                setError(null)
                setForm({ open: true, issue })
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
                setConfirm({ kind: 'delete', issue })
              }}
            >
              <Icon icon='tabler:trash' fontSize='1.25rem' />
            </IconButton>
          ) : null}
        </Box>
      )
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.magazine.issues.title')}
            subheader={t('admin.magazine.issues.subtitle')}
            action={
              can('create') ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => {
                    setError(null)
                    setForm({ open: true, issue: null })
                  }}
                >
                  {t('admin.magazine.issues.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <CustomTextField
              sx={{ mb: 4, width: { xs: '100%', sm: 320 } }}
              placeholder={t('admin.common.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <DataTable columns={columns} list={list} emptyKey='admin.magazine.issues.empty' />
          </CardContent>
        </Card>
      </Grid>

      <IssueFormDialog
        open={form.open}
        issue={form.issue}
        nextNumber={nextNumber}
        submitting={submitting}
        errorCode={form.open ? error : null}
        onSubmit={save}
        onClose={() => setForm({ open: false, issue: null })}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={t(confirm?.kind === 'publish' ? 'admin.magazine.issues.publish' : 'admin.magazine.issues.deleteTitle')}
        message={t(
          confirm?.kind === 'publish' ? 'admin.magazine.issues.publishMessage' : 'admin.magazine.issues.deleteMessage',
          { number: confirm?.issue.number }
        )}
        confirmLabel={t(confirm?.kind === 'publish' ? 'admin.magazine.issues.publish' : 'admin.common.delete')}
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

IssuesPage.acl = { action: 'read', subject: 'magazine' }

export default IssuesPage
