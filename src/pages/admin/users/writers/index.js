// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import ReasonDialog from 'src/views/admin/content/ReasonDialog'
import WriterFormDialog from 'src/views/admin/writers/WriterFormDialog'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'

const STATUSES = ['pending', 'verified', 'suspended']
const statusColors = { pending: 'warning', verified: 'success', suspended: 'error' }

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Users → Writers: the writers register and identity verification (PUB-02).
const WritersPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'content'))
  const canUpdate = Boolean(ability?.can('update', 'content'))
  const canDecide = Boolean(ability?.can('manage', 'content'))
  const canDelete = Boolean(ability?.can('delete', 'content'))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const list = useApiList('/api/admin/writers', { search, status })
  const byStatus = list.meta.byStatus || {}

  const [form, setForm] = useState({ open: false, writer: null })
  const [decision, setDecision] = useState(null) // { writer, action: 'verify' | 'suspend' }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)
  const [toast, setToast] = useState(null)

  const run = (request, after) => {
    setSubmitting(true)
    setErrorCode(null)
    request()
      .then(() => {
        after()
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const save = data =>
    run(
      () =>
        form.writer ? axios.put(`/api/admin/writers/${form.writer.id}`, data) : axios.post('/api/admin/writers', data),
      () => setForm({ open: false, writer: null })
    )

  const decide = reason =>
    run(
      () => axios.post(`/api/admin/writers/${decision.writer.id}/${decision.action}`, { reason }),
      () => setDecision(null)
    )

  const remove = () =>
    run(
      () => axios.delete(`/api/admin/writers/${deleteTarget.id}`, { data: {} }),
      () => setDeleteTarget(null)
    )

  const open = setter => value => {
    setErrorCode(null)
    setter(value)
  }

  const columns = [
    {
      key: 'name',
      label: t('admin.writers.table.writer'),
      render: writer => (
        <Box>
          <Typography sx={{ fontWeight: 500 }}>{localName(writer, 'name', lang)}</Typography>
          <Typography variant='body2' sx={{ color: 'text.disabled' }} dir='ltr'>
            {writer.email || '-'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'organization',
      label: t('admin.writers.table.organization'),
      render: writer => (writer.tenantId ? localName(writer, 'tenantName', lang) : writer.affiliation || '-')
    },
    {
      key: 'status',
      label: t('admin.writers.table.status'),
      render: writer => (
        <Tooltip title={writer.verificationNote || ''}>
          <span>
            <CustomChip
              rounded
              size='small'
              skin='light'
              color={statusColors[writer.status]}
              label={t(`admin.writers.status.${writer.status}`)}
            />
          </span>
        </Tooltip>
      )
    },
    {
      key: 'articles',
      label: t('admin.writers.table.articles'),
      align: 'right',
      render: writer =>
        t('admin.writers.articlesCount', { published: writer.publishedCount, total: writer.articlesCount })
    },
    {
      key: 'verifiedAt',
      label: t('admin.writers.table.verifiedAt'),
      render: writer => (writer.verifiedAt ? formatDate(writer.verifiedAt, lang) : '-')
    },
    ...(canUpdate || canDecide || canDelete
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: writer => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {canDecide && writer.status !== 'verified' ? (
                  <Tooltip title={t('admin.writers.verify')}>
                    <IconButton
                      size='small'
                      color='success'
                      onClick={() => open(setDecision)({ writer, action: 'verify' })}
                    >
                      <Icon icon='tabler:shield-check' fontSize='1.25rem' />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {canDecide && writer.status !== 'suspended' ? (
                  <Tooltip title={t('admin.writers.suspend')}>
                    <IconButton
                      size='small'
                      color='warning'
                      onClick={() => open(setDecision)({ writer, action: 'suspend' })}
                    >
                      <Icon icon='tabler:ban' fontSize='1.25rem' />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {canUpdate ? (
                  <Tooltip title={t('admin.common.edit')}>
                    <IconButton size='small' onClick={() => open(setForm)({ open: true, writer })}>
                      <Icon icon='tabler:edit' fontSize='1.25rem' />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {canDelete && !writer.articlesCount ? (
                  <Tooltip title={t('admin.common.delete')}>
                    <IconButton size='small' color='error' onClick={() => open(setDeleteTarget)(writer)}>
                      <Icon icon='tabler:trash' fontSize='1.25rem' />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
            )
          }
        ]
      : [])
  ]

  const total = STATUSES.reduce((sum, s) => sum + (byStatus[s] || 0), 0)

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.writers.title')}
            subheader={t('admin.writers.subtitle')}
            action={
              canCreate ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => open(setForm)({ open: true, writer: null })}
                >
                  {t('admin.writers.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Tabs value={status} onChange={(e, value) => setStatus(value)} sx={{ mb: 4 }} variant='scrollable'>
              <Tab value='' label={`${t('admin.writers.all')} (${total})`} />
              {STATUSES.map(s => (
                <Tab key={s} value={s} label={`${t(`admin.writers.status.${s}`)} (${byStatus[s] || 0})`} />
              ))}
            </Tabs>
            <CustomTextField
              sx={{ mb: 4, width: { xs: '100%', sm: 320 } }}
              placeholder={t('admin.writers.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <DataTable columns={columns} list={list} emptyKey='admin.writers.empty' />
          </CardContent>
        </Card>
      </Grid>

      <WriterFormDialog
        open={form.open}
        writer={form.writer}
        submitting={submitting}
        errorCode={errorCode}
        onSubmit={save}
        onClose={() => setForm({ open: false, writer: null })}
      />
      <ReasonDialog
        open={Boolean(decision)}
        title={decision ? t(`admin.writers.${decision.action}Title`) : ''}
        message={
          decision
            ? t(`admin.writers.${decision.action}Message`, { name: localName(decision.writer, 'name', lang) })
            : ''
        }
        label={decision ? t(`admin.writers.${decision.action}Label`) : ''}
        confirmLabel={decision ? t(`admin.writers.${decision.action}`) : ''}
        color={decision?.action === 'verify' ? 'success' : 'warning'}
        submitting={submitting}
        errorCode={errorCode}
        onConfirm={decide}
        onClose={() => setDecision(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.writers.deleteTitle')}
        message={t('admin.writers.deleteMessage', { name: localName(deleteTarget, 'name', lang) })}
        confirmLabel={t('admin.common.delete')}
        submitting={submitting}
        errorCode={errorCode}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
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

WritersPage.acl = { action: 'read', subject: 'users' }

export default WritersPage
