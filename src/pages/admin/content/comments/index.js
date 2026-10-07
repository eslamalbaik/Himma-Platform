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

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { formatDate, pickLang } from 'src/views/admin/billing/format'
import { KeyedStatusChip } from 'src/views/admin/content/chips'

const STATUSES = ['pending', 'approved', 'hidden']
const statusColors = { pending: 'warning', approved: 'success', hidden: 'secondary' }

const CommentsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canModerate = Boolean(ability?.can('update', 'content'))
  const canDelete = Boolean(ability?.can('delete', 'content'))

  const [filters, setFilters] = useState({ search: '', status: '' })
  const list = useApiList('/api/admin/content/comments', filters)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const moderate = (comment, status) => {
    axios
      .post(`/api/admin/content/comments/${comment.id}/moderate`, { status })
      .then(() => {
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(err => setToast(`errors.${err.response?.data?.error?.code || 'network_error'}`))
  }

  const remove = () => {
    setSubmitting(true)
    setError(null)
    axios
      .delete(`/api/admin/content/comments/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setToast('admin.common.deleted')
        list.reload()
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const columns = [
    {
      key: 'comment',
      label: t('admin.content.comments.column.comment'),
      render: comment => (
        <Box sx={{ maxWidth: 420 }}>
          <Typography variant='body2' sx={{ fontWeight: 500 }}>
            {comment.authorName}
            {comment.authorEmail ? (
              <Typography component='span' variant='caption' sx={{ color: 'text.secondary', mx: 1 }}>
                {comment.authorEmail}
              </Typography>
            ) : null}
          </Typography>
          <Typography variant='body2' dir='auto'>
            {comment.body}
          </Typography>
        </Box>
      )
    },
    {
      key: 'article',
      label: t('admin.content.comments.column.article'),
      render: comment => (
        <Typography variant='body2' dir='auto'>
          {comment.articleTitle}
        </Typography>
      )
    },
    {
      key: 'status',
      label: t('admin.content.comments.column.status'),
      render: comment => (
        <KeyedStatusChip namespace='admin.content.comments.status' status={comment.status} colors={statusColors} />
      )
    },
    {
      key: 'date',
      label: t('admin.content.comments.column.date'),
      render: comment => formatDate(comment.createdAt, lang)
    },
    ...(canModerate || canDelete
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: comment => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                {canModerate && comment.status !== 'approved' ? (
                  <Button size='small' variant='tonal' color='success' onClick={() => moderate(comment, 'approved')}>
                    {t('admin.content.comments.approve')}
                  </Button>
                ) : null}
                {canModerate && comment.status !== 'hidden' ? (
                  <Button size='small' variant='tonal' color='secondary' onClick={() => moderate(comment, 'hidden')}>
                    {t('admin.content.comments.hide')}
                  </Button>
                ) : null}
                {canDelete ? (
                  <IconButton
                    size='small'
                    color='error'
                    aria-label={t('admin.common.delete')}
                    onClick={() => {
                      setError(null)
                      setDeleteTarget(comment)
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
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {t('admin.content.comments.title')}
                {list.meta.pendingCount ? (
                  <Chip
                    size='small'
                    color='warning'
                    label={t('admin.content.comments.pendingCount', { count: list.meta.pendingCount })}
                  />
                ) : null}
              </Box>
            }
            subheader={t('admin.content.comments.subtitle')}
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
                label={t('admin.content.comments.column.status')}
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value=''>{t('admin.common.all')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.content.comments.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>
            <DataTable columns={columns} list={list} emptyKey='admin.content.comments.empty' />
          </CardContent>
        </Card>
      </Grid>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.content.comments.deleteTitle')}
        message={t('admin.content.comments.deleteMessage', { name: deleteTarget?.authorName })}
        confirmLabel={t('admin.common.delete')}
        submitting={submitting}
        errorCode={error}
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

CommentsPage.acl = { action: 'read', subject: 'content' }

export default CommentsPage
