// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Hooks & Context
import useApiList from 'src/hooks/useApiList'
import { useAuth } from 'src/hooks/useAuth'
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { ArticleStatusChip } from 'src/views/admin/content/chips'
import ArticleFormDialog from 'src/views/client/ArticleFormDialog'
import { formatDate, pickLang } from 'src/views/admin/billing/format'

const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected', 'withdrawn']

// Client dashboard → Articles: the organisation writes articles and sends them to the platform's editorial
// review. Approval and publication are done by the platform's editors.
const ClientArticlesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const { user } = useAuth()
  const ability = useContext(AbilityContext)
  const readOnly = ['suspended', 'cancelled'].includes(user?.tenant?.status)
  const seesAll = Boolean(ability?.can('publish:allowed', 'client'))

  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [mine, setMine] = useState(false)
  const list = useApiList('/api/client/articles', { search, status, mine: mine ? 'true' : '' })

  const [sections, setSections] = useState([])
  const [form, setForm] = useState({ open: false, article: null })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [confirmError, setConfirmError] = useState(null)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    axios
      .get('/api/client/sections')
      .then(response => setSections(response.data.data))
      .catch(() => setSections([]))
  }, [])

  const openForm = row => {
    setFormError(null)
    if (!row) {
      setForm({ open: true, article: null })

      return
    }

    // The list has no body; load the full article before editing.
    axios
      .get(`/api/client/articles/${row.id}`)
      .then(response => setForm({ open: true, article: response.data.data }))
      .catch(err => setToast(`errors.${err.response?.data?.error?.code || 'network_error'}`))
  }

  const save = values => {
    setSaving(true)
    setFormError(null)
    const payload = { ...values, sectionId: values.sectionId || null }
    const request = form.article
      ? axios.put(`/api/client/articles/${form.article.id}`, payload)
      : axios.post('/api/client/articles', payload)
    request
      .then(() => {
        setForm({ open: false, article: null })
        setToast(form.article ? 'client.articles.saved' : 'client.articles.created')
        list.reload()
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSaving(false))
  }

  const runConfirm = () => {
    const { kind, article } = confirm
    setWorking(true)
    setConfirmError(null)
    const request =
      kind === 'submit'
        ? axios.post(`/api/client/articles/${article.id}/submit`, {})
        : axios.delete(`/api/client/articles/${article.id}`, { data: {} })
    request
      .then(() => {
        setConfirm(null)
        setToast(kind === 'submit' ? 'client.articles.submitted' : 'client.articles.deleted')
        list.reload()
      })
      .catch(err => setConfirmError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setWorking(false))
  }

  const columns = [
    {
      key: 'title',
      label: t('client.articles.table.title'),
      render: row => (
        <Box>
          <Typography sx={{ fontWeight: 500 }} dir={row.language === 'en' ? 'ltr' : 'rtl'}>
            {row.title}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {(lang === 'en' ? row.sectionNameEn : row.sectionNameAr) || t('client.articles.form.noSection')}
            {' · '}
            {t(`site.languageName.${row.language}`)}
          </Typography>
          {row.status === 'rejected' && row.reviewNote ? (
            <Typography variant='body2' sx={{ color: 'error.main' }}>
              {t('client.articles.reviewNote', { note: row.reviewNote })}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'author',
      label: t('client.articles.table.author'),
      render: row => (row.mine ? t('client.members.you') : row.authorName)
    },
    {
      key: 'classification',
      label: t('client.articles.table.classification'),
      render: row => t(`admin.content.classification.${row.classification}`)
    },
    {
      key: 'status',
      label: t('client.articles.table.status'),
      render: row => <ArticleStatusChip status={row.status} />
    },
    { key: 'updatedAt', label: t('client.articles.table.updated'), render: row => formatDate(row.updatedAt, lang) },
    {
      key: 'actions',
      label: t('client.articles.table.actions'),
      align: 'right',
      render: row =>
        readOnly ? null : (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
            {row.canEdit ? (
              <Tooltip title={t('client.articles.edit')}>
                <IconButton size='small' onClick={() => openForm(row)} aria-label={t('client.articles.edit')}>
                  <Icon icon='tabler:edit' fontSize='1.25rem' />
                </IconButton>
              </Tooltip>
            ) : null}
            {row.canEdit ? (
              <Tooltip title={t('client.articles.delete')}>
                <IconButton
                  size='small'
                  color='error'
                  onClick={() => setConfirm({ kind: 'delete', article: row })}
                  aria-label={t('client.articles.delete')}
                >
                  <Icon icon='tabler:trash' fontSize='1.25rem' />
                </IconButton>
              </Tooltip>
            ) : null}
            {row.canSubmit ? (
              <Button
                size='small'
                variant='contained'
                startIcon={<Icon icon='tabler:send' fontSize='1rem' />}
                onClick={() => {
                  setConfirmError(null)
                  setConfirm({ kind: 'submit', article: row })
                }}
              >
                {t('client.articles.submit')}
              </Button>
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
            title={t('client.articles.title')}
            subheader={t('client.articles.subtitle')}
            action={
              readOnly ? null : (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => openForm(null)}>
                  {t('client.articles.add')}
                </Button>
              )
            }
          />
          <CardContent>
            {readOnly ? (
              <Alert severity='warning' sx={{ mb: 4 }}>
                {t(`client.home.readOnly.${user.tenant.status}`)}
              </Alert>
            ) : null}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('client.articles.search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <Icon icon='tabler:search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <CustomTextField
                select
                SelectProps={{ displayEmpty: true }}
                sx={{ minWidth: 180 }}
                value={status}
                onChange={e => setStatus(e.target.value)}
                aria-label={t('client.articles.table.status')}
              >
                <MenuItem value=''>{t('client.articles.allStatuses')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.content.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
              {seesAll ? (
                <FormControlLabel
                  control={<Switch checked={mine} onChange={e => setMine(e.target.checked)} />}
                  label={t('client.articles.onlyMine')}
                />
              ) : null}
            </Box>
            <DataTable columns={columns} list={list} emptyKey='client.articles.empty' />
          </CardContent>
        </Card>
      </Grid>

      <ArticleFormDialog
        open={form.open}
        article={form.article}
        sections={sections}
        submitting={saving}
        errorCode={formError}
        onSubmit={save}
        onClose={() => setForm({ open: false, article: null })}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? t(`client.articles.confirm.${confirm.kind}.title`) : ''}
        message={confirm ? t(`client.articles.confirm.${confirm.kind}.message`, { title: confirm.article.title }) : ''}
        confirmLabel={confirm ? t(`client.articles.confirm.${confirm.kind}.button`) : ''}
        color={confirm?.kind === 'delete' ? 'error' : 'primary'}
        submitting={working}
        errorCode={confirmError}
        onConfirm={runConfirm}
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

ClientArticlesPage.acl = {
  action: 'publish',
  subject: 'client'
}

export default ClientArticlesPage
