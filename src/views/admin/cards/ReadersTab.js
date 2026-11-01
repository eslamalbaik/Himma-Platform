// Readers of one card: their dedication and signed-copy requests (marked done or cancelled by staff), and
// the emails subscribed to the card's news.

// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import { formatDate, pickLang } from 'src/views/admin/billing/format'

const STATUS_COLORS = { new: 'warning', done: 'success', cancelled: 'secondary' }

export const RequestsTab = ({ cardId, canUpdate, onChanged }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const list = useApiList(`/api/admin/cards/${cardId}/requests`)
  const [errorCode, setErrorCode] = useState(null)

  const setStatus = (row, status) => {
    setErrorCode(null)
    axios
      .post(`/api/admin/cards/${cardId}/requests/${row.id}/status`, { status })
      .then(() => {
        list.reload()
        onChanged?.()
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
  }

  const columns = [
    {
      key: 'kind',
      label: t('admin.cards.requests.kind'),
      render: row => (
        <Box>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {t(`cards.requestKinds.${row.kind}`)}
          </Typography>
          {row.bookTitle ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {row.bookTitle}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'reader',
      label: t('admin.cards.requests.reader'),
      render: row => (
        <Box>
          <Typography variant='body2'>{row.name}</Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }} dir='ltr'>
            {row.email}
            {row.phone ? ` · ${row.phone}` : ''}
          </Typography>
        </Box>
      )
    },
    {
      key: 'details',
      label: t('admin.cards.requests.details'),
      render: row => (
        <Box sx={{ maxWidth: 320 }}>
          {row.dedicateTo ? (
            <Typography variant='body2'>
              {t('admin.cards.requests.dedicateTo')}: {row.dedicateTo}
            </Typography>
          ) : null}
          {row.message ? (
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {row.message}
            </Typography>
          ) : null}
          {row.address ? (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
              {t('admin.cards.requests.address')}: {row.address}
            </Typography>
          ) : null}
        </Box>
      )
    },
    { key: 'createdAt', label: t('admin.cards.requests.date'), render: row => formatDate(row.createdAt, lang) },
    {
      key: 'status',
      label: t('admin.cards.status'),
      render: row => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            size='small'
            skin='light'
            color={STATUS_COLORS[row.status]}
            label={t(`admin.cards.requests.statuses.${row.status}`)}
          />
          {canUpdate && row.status === 'new' ? (
            <>
              <Button size='small' onClick={() => setStatus(row, 'done')}>
                {t('admin.cards.requests.markDone')}
              </Button>
              <Button size='small' color='secondary' onClick={() => setStatus(row, 'cancelled')}>
                {t('admin.cards.requests.cancel')}
              </Button>
            </>
          ) : null}
          {canUpdate && row.status !== 'new' ? (
            <Button size='small' color='secondary' onClick={() => setStatus(row, 'new')}>
              {t('admin.cards.requests.reopen')}
            </Button>
          ) : null}
        </Box>
      )
    }
  ]

  return (
    <>
      {errorCode ? (
        <Alert severity='error' sx={{ mb: 4 }}>
          {t(`errors.${errorCode}`)}
        </Alert>
      ) : null}
      <DataTable columns={columns} list={list} emptyKey='admin.cards.requests.empty' />
    </>
  )
}

export const SubscribersTab = ({ cardId }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const list = useApiList(`/api/admin/cards/${cardId}/subscribers`)

  const columns = [
    { key: 'email', label: t('admin.cards.subscribers.email'), render: row => <span dir='ltr'>{row.email}</span> },
    { key: 'language', label: t('admin.cards.subscribers.language'), render: row => t(`language.${row.language}`) },
    { key: 'createdAt', label: t('admin.cards.subscribers.date'), render: row => formatDate(row.createdAt, lang) }
  ]

  return (
    <DataTable
      columns={columns}
      list={{ ...list, rows: list.rows.map(row => ({ ...row, id: row.email })) }}
      emptyKey='admin.cards.subscribers.empty'
    />
  )
}
