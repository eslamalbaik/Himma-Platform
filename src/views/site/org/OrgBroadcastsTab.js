// An organization admin's own events and live broadcasts (`/api/me/organization/broadcasts`):
// draft → announce → go live (needs a stream link) → end (with an optional recording link), or cancel.

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import BroadcastCard from 'src/views/site/BroadcastCard'
import { pillSx } from 'src/views/site/SiteHeader'

const TYPES = ['webinar', 'conference', 'workshop', 'course', 'meeting']
const FORMATS = ['online', 'onsite', 'hybrid']

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = iso => {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = n => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

const blank = () => {
  const start = new Date(Date.now() + 24 * 3600 * 1000)
  start.setMinutes(0, 0, 0)

  return {
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    type: 'webinar',
    format: 'online',
    visibility: 'public',
    location: '',
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(new Date(start.getTime() + 3600 * 1000).toISOString()),
    streamUrl: '',
    recordingUrl: ''
  }
}

const OrgBroadcastsTab = () => {
  const { t } = useTranslation()
  const [events, setEvents] = useState(null)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(null) // null | { id?, form }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ending, setEnding] = useState(null)
  const [recording, setRecording] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [reason, setReason] = useState('')

  const load = useCallback(() => {
    setFailed(false)
    axios
      .get('/api/me/organization/broadcasts', { params: { perPage: 100 } })
      .then(({ data }) => setEvents(data.data))
      .catch(() => setFailed(true))
  }, [])

  useEffect(load, [load])

  const replace = event => setEvents(prev => prev.map(other => (other.id === event.id ? event : other)))
  const fail = err => toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`))

  const act = (event, action, body) =>
    axios
      .post(`/api/me/organization/broadcasts/${event.id}/${action}`, body)
      .then(({ data }) => {
        replace(data.data)
        toast.success(t(`community.broadcast.done.${action}`))
      })
      .catch(fail)

  const edit = event =>
    setEditing({
      id: event.id,
      form: {
        titleAr: event.titleAr,
        titleEn: event.titleEn,
        descriptionAr: event.descriptionAr || '',
        descriptionEn: event.descriptionEn || '',
        type: event.type,
        format: event.format,
        visibility: event.visibility === 'institutional' ? 'institutional' : 'public',
        location: event.location || '',
        startsAt: toLocalInput(event.startsAt),
        endsAt: toLocalInput(event.endsAt),
        streamUrl: event.streamUrl || '',
        recordingUrl: event.recordingUrl || ''
      }
    })

  const save = () => {
    setBusy(true)
    setError(null)
    const form = editing.form
    const payload = {
      ...form,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : '',
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : ''
    }
    const request = editing.id
      ? axios.put(`/api/me/organization/broadcasts/${editing.id}`, payload)
      : axios.post('/api/me/organization/broadcasts', payload)

    request
      .then(({ data }) => {
        setEvents(prev =>
          editing.id ? prev.map(other => (other.id === data.data.id ? data.data : other)) : [data.data, ...prev]
        )
        setEditing(null)
        toast.success(t('community.broadcast.saved'))
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setBusy(false))
  }

  const remove = event =>
    axios
      .delete(`/api/me/organization/broadcasts/${event.id}`)
      .then(() => setEvents(prev => prev.filter(other => other.id !== event.id)))
      .catch(fail)

  const field = key => ({
    value: editing?.form[key] ?? '',
    onChange: e => setEditing(prev => ({ ...prev, form: { ...prev.form, [key]: e.target.value } }))
  })

  const actionsFor = event => (
    <>
      {event.status === 'draft' ? (
        <>
          <Button size='small' variant='contained' onClick={() => act(event, 'schedule')} sx={{ borderRadius: 99 }}>
            {t('community.broadcast.schedule')}
          </Button>
          <Button size='small' color='error' onClick={() => remove(event)}>
            {t('community.broadcast.delete')}
          </Button>
        </>
      ) : null}
      {event.status === 'scheduled' ? (
        <Button
          size='small'
          variant='contained'
          color='error'
          onClick={() => act(event, 'start')}
          sx={{ borderRadius: 99 }}
        >
          {t('community.broadcast.goLive')}
        </Button>
      ) : null}
      {event.status === 'live' ? (
        <Button
          size='small'
          variant='contained'
          color='secondary'
          onClick={() => {
            setEnding(event)
            setRecording(event.recordingUrl || '')
          }}
          sx={{ borderRadius: 99 }}
        >
          {t('community.broadcast.end')}
        </Button>
      ) : null}
      {['draft', 'scheduled'].includes(event.status) ? (
        <Button
          size='small'
          color='secondary'
          onClick={() => {
            setCancelling(event)
            setReason('')
          }}
        >
          {t('community.broadcast.cancel')}
        </Button>
      ) : null}
      {event.status !== 'cancelled' ? (
        <Button size='small' color='secondary' onClick={() => edit(event)}>
          {t('community.broadcast.edit')}
        </Button>
      ) : null}
    </>
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, mb: 3 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {t('community.broadcast.help')}
        </Typography>
        <Button variant='contained' size='small' sx={pillSx} onClick={() => setEditing({ form: blank() })}>
          {t('community.broadcast.new')}
        </Button>
      </Box>

      {failed ? (
        <Alert severity='error' action={<Button onClick={load}>{t('site.retry')}</Button>}>
          {t('site.feed.failed')}
        </Alert>
      ) : null}
      {!events && !failed ? <Skeleton height={140} /> : null}
      {events?.length === 0 ? (
        <Typography sx={{ color: 'text.secondary', py: 10, textAlign: 'center' }}>
          {t('community.broadcast.empty')}
        </Typography>
      ) : null}
      {events?.map(event => (
        <BroadcastCard
          key={event.id}
          event={{ ...event, streamUrl: event.status === 'live' ? event.streamUrl : null }}
          actions={actionsFor(event)}
        />
      ))}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth='sm' fullWidth>
        <DialogTitle>{t(editing?.id ? 'community.broadcast.edit' : 'community.broadcast.new')}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 4, pt: '8px !important' }}>
          {error ? <Alert severity='error'>{t(`errors.${error}`)}</Alert> : null}
          {editing ? (
            <>
              <TextField label={t('community.broadcast.titleAr')} {...field('titleAr')} />
              <TextField label={t('community.broadcast.titleEn')} inputProps={{ dir: 'ltr' }} {...field('titleEn')} />
              <TextField
                multiline
                minRows={2}
                label={t('community.broadcast.descriptionAr')}
                {...field('descriptionAr')}
              />
              <TextField
                multiline
                minRows={2}
                label={t('community.broadcast.descriptionEn')}
                inputProps={{ dir: 'ltr' }}
                {...field('descriptionEn')}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr 1fr' }, gap: 4 }}>
                <TextField select label={t('community.broadcast.type')} {...field('type')}>
                  {TYPES.map(value => (
                    <MenuItem key={value} value={value}>
                      {t(`community.broadcast.types.${value}`)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label={t('community.broadcast.format')} {...field('format')}>
                  {FORMATS.map(value => (
                    <MenuItem key={value} value={value}>
                      {t(`community.broadcast.formats.${value}`)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label={t('community.broadcast.visibility')} {...field('visibility')}>
                  <MenuItem value='public'>{t('community.broadcast.visibilities.public')}</MenuItem>
                  <MenuItem value='institutional'>{t('community.broadcast.visibilities.institutional')}</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 4 }}>
                <TextField
                  type='datetime-local'
                  label={t('community.broadcast.startsAt')}
                  InputLabelProps={{ shrink: true }}
                  {...field('startsAt')}
                />
                <TextField
                  type='datetime-local'
                  label={t('community.broadcast.endsAt')}
                  InputLabelProps={{ shrink: true }}
                  {...field('endsAt')}
                />
              </Box>
              {editing.form.format !== 'online' ? (
                <TextField label={t('community.broadcast.location')} {...field('location')} />
              ) : null}
              {editing.form.format !== 'onsite' ? (
                <TextField
                  label={t('community.broadcast.streamUrl')}
                  helperText={t('community.broadcast.streamHelp')}
                  placeholder='https://'
                  inputProps={{ dir: 'ltr' }}
                  {...field('streamUrl')}
                />
              ) : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setEditing(null)}>
            {t('site.cancel')}
          </Button>
          <Button variant='contained' disabled={busy} onClick={save}>
            {t('community.broadcast.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(ending)} onClose={() => setEnding(null)} maxWidth='xs' fullWidth>
        <DialogTitle>{t('community.broadcast.end')}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            fullWidth
            label={t('community.broadcast.recordingUrl')}
            placeholder='https://'
            value={recording}
            onChange={e => setRecording(e.target.value)}
            inputProps={{ dir: 'ltr' }}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setEnding(null)}>
            {t('site.cancel')}
          </Button>
          <Button
            variant='contained'
            onClick={() =>
              act(ending, 'end', recording ? { recordingUrl: recording } : {}).finally(() => setEnding(null))
            }
          >
            {t('community.broadcast.end')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(cancelling)} onClose={() => setCancelling(null)} maxWidth='xs' fullWidth>
        <DialogTitle>{t('community.broadcast.cancel')}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t('community.broadcast.reason')}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setCancelling(null)}>
            {t('site.cancel')}
          </Button>
          <Button
            color='error'
            variant='contained'
            disabled={!reason.trim()}
            onClick={() => act(cancelling, 'cancel', { reason }).finally(() => setCancelling(null))}
          >
            {t('community.broadcast.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default OrgBroadcastsTab
