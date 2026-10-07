// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Snackbar from '@mui/material/Snackbar'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import { AbilityContext } from 'src/layouts/components/acl/Can'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { localName, pickLang } from 'src/views/admin/billing/format'
import CustomTextField from 'src/@core/components/mui/text-field'
import ReasonDialog from 'src/views/admin/content/ReasonDialog'
import EventFormDialog from './EventFormDialog'

// Each action: the statuses it starts from and the permission it needs (routes/api.php).
export const EVENT_ACTIONS = [
  { key: 'edit', icon: 'tabler:edit', ability: 'update', when: ['draft', 'scheduled', 'live', 'ended'] },
  { key: 'schedule', icon: 'tabler:speakerphone', ability: 'manage', when: ['draft'], confirm: true },
  { key: 'start', icon: 'tabler:broadcast', ability: 'update', when: ['scheduled'], confirm: true, broadcast: true },
  { key: 'end', icon: 'tabler:player-stop', ability: 'update', when: ['live'] },
  {
    key: 'registrations',
    icon: 'tabler:users',
    ability: 'read',
    when: ['draft', 'scheduled', 'live', 'ended', 'cancelled']
  },
  { key: 'cancel', icon: 'tabler:calendar-x', ability: 'manage', when: ['draft', 'scheduled'], reason: true },
  { key: 'delete', icon: 'tabler:trash', ability: 'delete', when: ['draft'], confirm: true }
]

const DONE = { schedule: 'scheduled', start: 'started', end: 'ended', cancel: 'cancelled' }

// The dialogs behind the event actions, shared by the events list and the live page.
// `begin(key, event)` starts an action; `extra.onRegistrations(event)` opens the registrations view.
const useEventActions = ({ onDone, onRegistrations }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const can = action => Boolean(ability?.can(action, 'events'))

  const [form, setForm] = useState({ open: false, event: null })
  const [pending, setPending] = useState(null)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const available = event =>
    EVENT_ACTIONS.filter(
      action =>
        action.when.includes(event.status) &&
        can(action.ability) &&
        (!action.broadcast || ['online', 'hybrid'].includes(event.format))
    )

  const fail = err => setError(err.response?.data?.error?.code || 'network_error')

  const begin = (key, event = null) => {
    setError(null)
    if (key === 'add' || key === 'edit') return setForm({ open: true, event })
    if (key === 'registrations') return onRegistrations(event)
    setRecordingUrl(event.recordingUrl || '')
    setPending({ action: EVENT_ACTIONS.find(action => action.key === key), event })
  }

  const finish = toastKey => {
    setPending(null)
    setForm({ open: false, event: null })
    setToast(toastKey)
    onDone()
  }

  const save = data => {
    setSubmitting(true)
    setError(null)
    const request = form.event
      ? axios.put(`/api/admin/events/${form.event.id}`, data)
      : axios.post('/api/admin/events', data)
    request
      .then(() => finish('admin.common.saved'))
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const run = (body = {}) => {
    const { action, event } = pending
    setSubmitting(true)
    setError(null)
    const request =
      action.key === 'delete'
        ? axios.delete(`/api/admin/events/${event.id}`, { data: {} })
        : axios.post(`/api/admin/events/${event.id}/${action.key}`, body)
    request
      .then(() => finish(action.key === 'delete' ? 'admin.common.deleted' : `admin.events.done.${DONE[action.key]}`))
      .catch(fail)
      .finally(() => setSubmitting(false))
  }

  const title = localName(pending?.event, 'title', lang)

  const dialogs = (
    <>
      <EventFormDialog
        open={form.open}
        event={form.event}
        submitting={submitting}
        errorCode={form.open ? error : null}
        onSubmit={save}
        onClose={() => setForm({ open: false, event: null })}
      />
      <ConfirmDialog
        open={Boolean(pending?.action.confirm)}
        title={pending ? t(`admin.events.action.${pending.action.key}`) : ''}
        message={pending ? t(`admin.events.confirm.${pending.action.key}`, { title }) : ''}
        confirmLabel={pending ? t(`admin.events.action.${pending.action.key}`) : ''}
        color={pending?.action.key === 'delete' ? 'error' : 'primary'}
        submitting={submitting}
        errorCode={error}
        onConfirm={() => run()}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.action.key === 'end'}
        title={t('admin.events.end.title')}
        message={
          <>
            {t('admin.events.end.message', { title })}
            <CustomTextField
              fullWidth
              sx={{ mt: 4 }}
              label={t('admin.events.field.recordingUrl')}
              value={recordingUrl}
              onChange={e => setRecordingUrl(e.target.value)}
              inputProps={{ dir: 'ltr' }}
            />
          </>
        }
        confirmLabel={t('admin.events.action.end')}
        submitting={submitting}
        errorCode={error}
        onConfirm={() => run(recordingUrl.trim() ? { recordingUrl: recordingUrl.trim() } : {})}
        onClose={() => setPending(null)}
      />
      <ReasonDialog
        open={Boolean(pending?.action.reason)}
        title={t('admin.events.cancel.title')}
        message={pending ? `${title} — ${t('admin.events.cancel.message')}` : ''}
        confirmLabel={t('admin.events.action.cancel')}
        submitting={submitting}
        errorCode={error}
        onConfirm={reason => run({ reason })}
        onClose={() => setPending(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </>
  )

  return { begin, available, can, dialogs }
}

export default useEventActions
