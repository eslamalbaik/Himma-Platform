// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import { localName, pickLang } from 'src/views/admin/billing/format'
import { KeyedStatusChip } from 'src/views/admin/content/chips'
import { formatDateTime } from './helpers'

const statusColors = { registered: 'info', attended: 'success', cancelled: 'secondary' }

// The registration list of one event: add someone, mark attendance, cancel or reinstate a seat.
const RegistrationsList = ({ event, canUpdate, onChanged }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [search, setSearch] = useState('')
  const list = useApiList(`/api/admin/events/${event.id}/registrations`, { search }, { perPage: 10 })
  const [form, setForm] = useState({ name: '', email: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const open = event.registrationRequired && ['scheduled', 'live'].includes(event.status)

  const done = () => {
    list.reload()
    onChanged()
  }
  const fail = err => setError(err.response?.data?.error?.code || 'network_error')

  const add = e => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    axios
      .post(`/api/admin/events/${event.id}/registrations`, form)
      .then(() => {
        setForm({ name: '', email: '' })
        done()
      })
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const setStatus = (registration, status) => {
    setError(null)
    axios
      .post(`/api/admin/events/${event.id}/registrations/${registration.id}/status`, { status })
      .then(done)
      .catch(fail)
  }

  const columns = [
    {
      key: 'name',
      label: t('admin.events.registrations.name'),
      render: row => (
        <Box>
          <Typography variant='body2' sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {row.email}
            {row.tenantNameAr || row.tenantNameEn ? ` · ${localName(row, 'tenantName', lang)}` : ''}
          </Typography>
        </Box>
      )
    },
    {
      key: 'status',
      label: t('admin.events.column.status'),
      render: row => (
        <KeyedStatusChip namespace='admin.events.registrations.status' status={row.status} colors={statusColors} />
      )
    },
    { key: 'date', label: t('admin.content.reports.column.date'), render: row => formatDateTime(row.createdAt, lang) },
    ...(canUpdate
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: row => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                {row.status === 'registered' ? (
                  <Button size='small' variant='tonal' color='success' onClick={() => setStatus(row, 'attended')}>
                    {t('admin.events.registrations.markAttended')}
                  </Button>
                ) : null}
                {row.status !== 'cancelled' ? (
                  <Button size='small' variant='tonal' color='secondary' onClick={() => setStatus(row, 'cancelled')}>
                    {t('admin.events.registrations.cancel')}
                  </Button>
                ) : (
                  <Button size='small' variant='tonal' onClick={() => setStatus(row, 'registered')}>
                    {t('admin.events.registrations.reinstate')}
                  </Button>
                )}
              </Box>
            )
          }
        ]
      : [])
  ]

  return (
    <>
      <Typography sx={{ mb: 4, fontWeight: 500 }}>
        {list.meta.capacity
          ? t('admin.events.registrations.seats', { active: list.meta.activeCount ?? 0, capacity: list.meta.capacity })
          : t('admin.events.registrations.seatsUnlimited', { active: list.meta.activeCount ?? 0 })}
      </Typography>
      {error ? (
        <Alert severity='error' sx={{ mb: 4 }}>
          {t(`errors.${error}`)}
        </Alert>
      ) : null}
      {canUpdate && open ? (
        <Box
          component='form'
          onSubmit={add}
          sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4, alignItems: 'flex-end' }}
        >
          <CustomTextField
            sx={{ flex: '1 1 180px' }}
            label={t('admin.events.registrations.name')}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <CustomTextField
            sx={{ flex: '1 1 220px' }}
            type='email'
            label={t('admin.events.registrations.email')}
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            inputProps={{ dir: 'ltr' }}
          />
          <Button type='submit' variant='contained' disabled={submitting || !form.name.trim() || !form.email.trim()}>
            {t('admin.events.registrations.add')}
          </Button>
        </Box>
      ) : !open ? (
        <Alert severity='info' sx={{ mb: 4 }}>
          {t('admin.events.registrations.closed')}
        </Alert>
      ) : null}
      <CustomTextField
        sx={{ mb: 4, width: { xs: '100%', sm: 280 } }}
        placeholder={t('admin.common.search')}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <DataTable columns={columns} list={list} emptyKey='admin.events.registrations.empty' />
    </>
  )
}

const RegistrationsDialog = ({ event, canUpdate, onChanged, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  return (
    <Dialog open={Boolean(event)} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {event ? t('admin.events.registrations.title', { title: localName(event, 'title', lang) }) : ''}
      </DialogTitle>
      <DialogContent>
        {event ? <RegistrationsList event={event} canUpdate={canUpdate} onChanged={onChanged} /> : null}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {t('admin.common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RegistrationsDialog
