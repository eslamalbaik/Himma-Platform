// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Hooks
import useApiList from 'src/hooks/useApiList'

// ** Views
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import ReasonDialog from 'src/views/admin/content/ReasonDialog'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import {
  STATUSES,
  VerifyWriterDialog,
  WriterDetailsDialog,
  WriterFormDialog,
  WriterStatusChip,
  organisationOf
} from 'src/views/admin/writers/dialogs'

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Users → Writers: the writers registry (PUB-02). Editors register writers, verify their identity and
// organisation, and suspend them; articles are linked to their writer.
const WritersPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'writers'))
  const canUpdate = Boolean(ability?.can('update', 'writers'))
  const canDelete = Boolean(ability?.can('delete', 'writers'))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const list = useApiList('/api/admin/writers', { search, status })
  const counts = list.meta.statusCounts || {}

  // action: 'form' | 'verify' | 'suspend' | 'delete'
  const [pending, setPending] = useState(null) // { action, writer }
  const [details, setDetails] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const open = (action, writer = null) => {
    setError(null)
    setPending({ action, writer })
  }

  const run = (request, message) => {
    setSubmitting(true)
    setError(null)
    request
      .then(() => {
        setPending(null)
        setToast(message)
        list.reload()
      })
      .catch(err => setError(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const target = pending?.writer
  const save = data =>
    run(
      target ? axios.put(`/api/admin/writers/${target.id}`, data) : axios.post('/api/admin/writers', data),
      'admin.common.saved'
    )

  const action = (name, icon, color, onClick, show = true) =>
    show ? (
      <Tooltip title={t(`admin.writers.action.${name}`)}>
        <IconButton size='small' color={color} aria-label={t(`admin.writers.action.${name}`)} onClick={onClick}>
          <Icon icon={icon} fontSize='1.25rem' />
        </IconButton>
      </Tooltip>
    ) : null

  const columns = [
    {
      key: 'name',
      label: t('admin.writers.name'),
      render: writer => (
        <Box>
          <Typography sx={{ fontWeight: 500 }}>{localName(writer, 'name', lang)}</Typography>
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {(lang === 'en' ? writer.titleEn : writer.titleAr) || writer.email || ''}
          </Typography>
        </Box>
      )
    },
    { key: 'organisation', label: t('admin.writers.organisation'), render: writer => organisationOf(writer, lang) },
    {
      key: 'status',
      label: t('admin.writers.statusLabel'),
      render: writer => <WriterStatusChip status={writer.status} />
    },
    {
      key: 'articles',
      label: t('admin.writers.articles'),
      render: writer =>
        t('admin.writers.articlesCell', { published: writer.publishedCount, total: writer.articlesCount })
    },
    {
      key: 'verifiedAt',
      label: t('admin.writers.verifiedAt'),
      render: writer => formatDate(writer.verifiedAt, lang)
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: writer => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }} onClick={e => e.stopPropagation()}>
                {action(
                  'verify',
                  'tabler:user-check',
                  'success',
                  () => open('verify', writer),
                  canUpdate && writer.status !== 'verified'
                )}
                {action(
                  'suspend',
                  'tabler:user-off',
                  'warning',
                  () => open('suspend', writer),
                  canUpdate && writer.status !== 'suspended'
                )}
                {action('edit', 'tabler:edit', 'default', () => open('form', writer), canUpdate)}
                {action(
                  'delete',
                  'tabler:trash',
                  'error',
                  () => open('delete', writer),
                  canDelete && writer.articlesCount === 0
                )}
              </Box>
            )
          }
        ]
      : [])
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.writers.title')}
            subheader={t('admin.writers.subtitle')}
            action={
              canCreate ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => open('form')}>
                  {t('admin.writers.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <CustomTextField
                sx={{ width: { xs: '100%', sm: 320 } }}
                placeholder={t('admin.writers.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['', ...STATUSES].map(value => (
                  <Button
                    key={value || 'all'}
                    size='small'
                    variant={status === value ? 'contained' : 'tonal'}
                    color={status === value ? 'primary' : 'secondary'}
                    onClick={() => setStatus(value)}
                  >
                    {value ? `${t(`admin.writers.status.${value}`)} (${counts[value] ?? 0})` : t('admin.common.all')}
                  </Button>
                ))}
              </Box>
            </Box>
            <DataTable
              columns={columns}
              list={list}
              emptyKey='admin.writers.empty'
              onRowClick={writer => setDetails(writer.id)}
            />
          </CardContent>
        </Card>
      </Grid>

      <WriterFormDialog
        open={pending?.action === 'form'}
        writer={target}
        submitting={submitting}
        errorCode={pending?.action === 'form' ? error : null}
        onSubmit={save}
        onClose={() => setPending(null)}
      />
      <VerifyWriterDialog
        open={pending?.action === 'verify'}
        writer={target}
        submitting={submitting}
        errorCode={pending?.action === 'verify' ? error : null}
        onConfirm={data => run(axios.post(`/api/admin/writers/${target.id}/verify`, data), 'admin.writers.verified')}
        onClose={() => setPending(null)}
      />
      <ReasonDialog
        open={pending?.action === 'suspend'}
        title={t('admin.writers.suspendTitle')}
        message={target ? t('admin.writers.suspendMessage', { name: localName(target, 'name', lang) }) : ''}
        label={t('admin.writers.suspensionReason')}
        confirmLabel={t('admin.writers.action.suspend')}
        color='warning'
        submitting={submitting}
        errorCode={pending?.action === 'suspend' ? error : null}
        onConfirm={reason =>
          run(axios.post(`/api/admin/writers/${target.id}/suspend`, { reason }), 'admin.writers.suspended')
        }
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.action === 'delete'}
        title={t('admin.writers.deleteTitle')}
        message={target ? t('admin.writers.deleteMessage', { name: localName(target, 'name', lang) }) : ''}
        confirmLabel={t('admin.common.delete')}
        submitting={submitting}
        errorCode={pending?.action === 'delete' ? error : null}
        onConfirm={() => run(axios.delete(`/api/admin/writers/${target.id}`, { data: {} }), 'admin.common.deleted')}
        onClose={() => setPending(null)}
      />
      <WriterDetailsDialog writerId={details} onClose={() => setDetails(null)} />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Grid>
  )
}

WritersPage.acl = { action: 'read', subject: 'writers' }

export default WritersPage
