// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import useApiOptions from 'src/hooks/useApiOptions'
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'

// ** Views
import { ArticleStatusChip, ComplianceChip } from './chips'
import ArticleFormDialog, { CLASSIFICATIONS } from './ArticleFormDialog'
import ArticleDetailsDialog from './ArticleDetailsDialog'
import ComplianceDialog from './ComplianceDialog'
import ReasonDialog from './ReasonDialog'

const STATUSES = ['draft', 'in_review', 'approved', 'published', 'rejected', 'withdrawn']
const AXES = ['knowledge', 'people', 'data', 'identity']

// Which workflow actions each status offers, and the permission each needs
// (same rules as App\Models\Article::TRANSITIONS and routes/api.php).
const ACTIONS = [
  { key: 'edit', icon: 'tabler:edit', ability: 'update', when: ['draft', 'in_review', 'approved', 'rejected'] },
  { key: 'submit', icon: 'tabler:send', ability: 'update', when: ['draft', 'rejected'], confirm: true },
  {
    key: 'compliance',
    icon: 'tabler:shield-check',
    ability: 'update',
    when: ['draft', 'in_review', 'approved', 'rejected']
  },
  { key: 'approve', icon: 'tabler:circle-check', ability: 'manage', when: ['in_review'], confirm: true },
  { key: 'reject', icon: 'tabler:circle-x', ability: 'manage', when: ['in_review'], reason: true },
  { key: 'publish', icon: 'tabler:world-upload', ability: 'manage', when: ['approved'], confirm: true },
  { key: 'withdraw', icon: 'tabler:eye-off', ability: 'manage', when: ['published'], reason: true },
  { key: 'restore', icon: 'tabler:arrow-back-up', ability: 'manage', when: ['withdrawn'], confirm: true },
  { key: 'delete', icon: 'tabler:trash', ability: 'delete', when: ['draft', 'rejected'], confirm: true }
]

const DONE = {
  submit: 'submitted',
  approve: 'approved',
  reject: 'rejected',
  publish: 'published',
  withdraw: 'withdrawn',
  restore: 'restored'
}

const ArticlesList = ({ titleKey, subtitleKey, fixedStatus = null }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const can = action => Boolean(ability?.can(action, 'content'))
  const canReadMagazine = Boolean(ability?.can('read', 'magazine'))

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    classification: '',
    axis: '',
    sectionId: '',
    language: ''
  })
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const list = useApiList('/api/admin/content/articles', { ...filters, status: fixedStatus || filters.status })

  const sections = useApiOptions('/api/admin/magazine/sections', { enabled: canReadMagazine })
  const issues = useApiOptions('/api/admin/magazine/issues', { enabled: canReadMagazine })
  const tags = useApiOptions('/api/admin/magazine/tags', { enabled: canReadMagazine })

  // Writers who can be given articles (suspended ones cannot, PUB-02).
  const writers = useApiOptions('/api/admin/writers', {
    enabled: Boolean(ability?.can('read', 'writers')),
    params: { status: 'pending,verified' }
  })

  // Publishing rules from Settings → Publishing, for the article form.
  const [rules, setRules] = useState(null)
  useEffect(() => {
    axios
      .get('/api/admin/settings/publishing')
      .then(response => setRules(response.data.data))
      .catch(() => setRules(null))
  }, [])

  const [menu, setMenu] = useState({ anchor: null, article: null })
  const [form, setForm] = useState({ open: false, article: null })
  const [details, setDetails] = useState({ open: false, article: null, loading: false })
  const [pending, setPending] = useState(null) // { action, article } waiting for confirmation, reason or checks
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const fail = err => setError(err.response?.data?.error?.code || 'network_error')

  const loadFull = article =>
    axios.get(`/api/admin/content/articles/${article.id}`).then(response => response.data.data)

  const openDetails = article => {
    setDetails({ open: true, article: null, loading: true })
    loadFull(article)
      .then(full => setDetails({ open: true, article: full, loading: false }))
      .catch(() => setDetails({ open: false, article: null, loading: false }))
  }

  const startAction = (action, article) => {
    setMenu({ anchor: null, article: null })
    setError(null)
    if (action.key === 'edit') {
      loadFull(article).then(full => setForm({ open: true, article: full }))
    } else {
      setPending({ action, article })
    }
  }

  const finish = toastKey => {
    setPending(null)
    setToast(toastKey)
    list.reload()
  }

  const save = data => {
    setSubmitting(true)
    setError(null)
    const request = form.article
      ? axios.put(`/api/admin/content/articles/${form.article.id}`, data)
      : axios.post('/api/admin/content/articles', data)
    request
      .then(() => {
        setForm({ open: false, article: null })
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const run = (body = {}) => {
    const { action, article } = pending
    setSubmitting(true)
    setError(null)
    let request
    if (action.key === 'delete') request = axios.delete(`/api/admin/content/articles/${article.id}`, { data: {} })
    else request = axios.post(`/api/admin/content/articles/${article.id}/${action.key}`, body)
    request
      .then(() =>
        finish(
          action.key === 'delete'
            ? 'admin.common.deleted'
            : action.key === 'compliance'
            ? 'admin.content.done.compliance'
            : `admin.content.done.${DONE[action.key]}`
        )
      )
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const available = article => ACTIONS.filter(action => action.when.includes(article.status) && can(action.ability))

  const columns = [
    {
      key: 'title',
      label: t('admin.content.column.article'),
      render: article => (
        <Box>
          <Typography sx={{ fontWeight: 500 }} dir='auto'>
            {article.title}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {article.authorName}
            {article.sectionId ? ` · ${localName(article, 'sectionName', lang)}` : ''}
            {article.issueNumber ? ` · ${t('admin.content.field.issue')} ${article.issueNumber}` : ''}
          </Typography>
          {article.isSponsored ? (
            <Chip size='small' color='warning' variant='tonal' label={t('admin.content.sponsored')} sx={{ mt: 1 }} />
          ) : null}
        </Box>
      )
    },
    {
      key: 'classification',
      label: t('admin.content.column.classification'),
      render: article => (
        <Box>
          <Typography variant='body2'>{t(`admin.content.classification.${article.classification}`)}</Typography>
          {article.tenantId ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {localName(article, 'tenantName', lang)}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'status',
      label: t('admin.content.column.status'),
      render: article => <ArticleStatusChip status={article.status} />
    },
    {
      key: 'compliance',
      label: t('admin.content.column.compliance'),
      render: article => <ComplianceChip result={article.complianceResult} />
    },
    {
      key: 'reports',
      label: t('admin.content.column.reports'),
      render: article =>
        article.openReportsCount ? <Chip size='small' color='error' label={article.openReportsCount} /> : '-'
    },
    {
      key: 'updated',
      label: t('admin.content.column.updated'),
      render: article => formatDate(article.updatedAt, lang)
    },
    {
      key: 'actions',
      label: t('admin.common.actions'),
      align: 'right',
      render: article => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton size='small' aria-label={t('admin.content.action.view')} onClick={() => openDetails(article)}>
            <Icon icon='tabler:eye' fontSize='1.25rem' />
          </IconButton>
          {available(article).length ? (
            <IconButton
              size='small'
              aria-label={t('admin.content.action.more')}
              onClick={e => setMenu({ anchor: e.currentTarget, article })}
            >
              <Icon icon='tabler:dots-vertical' fontSize='1.25rem' />
            </IconButton>
          ) : null}
        </Box>
      )
    }
  ]

  const filterSelect = (key, options, labelFn, extraProps = {}) => (
    <CustomTextField
      select
      sx={{ minWidth: 170 }}
      label={t(`admin.content.filter.${key}`)}
      value={filters[key]}
      onChange={e => setFilter(key, e.target.value)}
      {...extraProps}
    >
      <MenuItem value=''>{t('admin.common.all')}</MenuItem>
      {options.map(option => (
        <MenuItem key={option.value} value={option.value}>
          {labelFn(option)}
        </MenuItem>
      ))}
    </CustomTextField>
  )

  const pendingTitle = pending?.article?.title || ''

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t(titleKey)}
            subheader={t(subtitleKey)}
            action={
              !fixedStatus && can('create') ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => {
                    setError(null)
                    setForm({ open: true, article: null })
                  }}
                >
                  {t('admin.content.add')}
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
              {!fixedStatus
                ? filterSelect(
                    'status',
                    STATUSES.map(value => ({ value })),
                    o => t(`admin.content.status.${o.value}`)
                  )
                : null}
              {filterSelect(
                'classification',
                CLASSIFICATIONS.map(value => ({ value })),
                o => t(`admin.content.classification.${o.value}`)
              )}
              {filterSelect(
                'axis',
                AXES.map(value => ({ value })),
                o => t(`admin.magazine.axis.${o.value}`)
              )}
              {canReadMagazine
                ? filterSelect(
                    'sectionId',
                    sections
                      .filter(section => !filters.axis || section.axis === filters.axis)
                      .map(section => ({ value: section.id, section })),
                    o => localName(o.section, 'name', lang),
                    { label: t('admin.content.filter.section') }
                  )
                : null}
              {filterSelect(
                'language',
                ['ar', 'en'].map(value => ({ value })),
                o => t(`language.${o.value}`)
              )}
            </Box>
            <DataTable columns={columns} list={list} emptyKey='admin.content.empty' />
          </CardContent>
        </Card>
      </Grid>

      <Menu anchorEl={menu.anchor} open={Boolean(menu.anchor)} onClose={() => setMenu({ anchor: null, article: null })}>
        {menu.article
          ? available(menu.article).map(action => (
              <MenuItem key={action.key} onClick={() => startAction(action, menu.article)}>
                <ListItemIcon>
                  <Icon icon={action.icon} fontSize='1.25rem' />
                </ListItemIcon>
                <ListItemText>{t(`admin.content.action.${action.key}`)}</ListItemText>
              </MenuItem>
            ))
          : null}
      </Menu>

      <ArticleFormDialog
        open={form.open}
        article={form.article}
        sections={sections}
        issues={issues}
        tags={tags}
        writers={writers}
        rules={rules}
        submitting={submitting}
        errorCode={form.open ? error : null}
        onSubmit={save}
        onClose={() => setForm({ open: false, article: null })}
      />
      <ArticleDetailsDialog
        open={details.open}
        article={details.article}
        loading={details.loading}
        onClose={() => setDetails({ open: false, article: null, loading: false })}
      />
      <ComplianceDialog
        open={pending?.action.key === 'compliance'}
        article={pending?.article}
        submitting={submitting}
        errorCode={error}
        onSubmit={checks => run({ checks })}
        onClose={() => setPending(null)}
      />
      <ReasonDialog
        open={Boolean(pending?.action.reason)}
        title={pending ? t(`admin.content.${pending.action.key}.title`) : ''}
        message={pending ? t(`admin.content.${pending.action.key}.message`) : ''}
        confirmLabel={pending ? t(`admin.content.action.${pending.action.key}`) : ''}
        submitting={submitting}
        errorCode={error}
        onConfirm={reason => run({ reason })}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={Boolean(pending?.action.confirm)}
        title={pending ? t(`admin.content.action.${pending.action.key}`) : ''}
        message={pending ? t(`admin.content.confirm.${pending.action.key}`, { title: pendingTitle }) : ''}
        confirmLabel={pending ? t(`admin.content.action.${pending.action.key}`) : ''}
        color={pending?.action.key === 'delete' ? 'error' : 'primary'}
        submitting={submitting}
        errorCode={error}
        onConfirm={() => run()}
        onClose={() => setPending(null)}
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

export default ArticlesList
