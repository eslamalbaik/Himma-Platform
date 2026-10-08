// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import { localName, pickLang } from 'src/views/admin/billing/format'

export const REPORT_REASONS = ['harassment', 'spam', 'offensive', 'privacy', 'other']

export const errorOf = err => err.response?.data?.error?.code || 'network_error'

// "Name — Client" for a person returned by the messages API.
export const personLabel = (person, lang) => {
  if (!person) return '-'
  const name = localName(person, 'name', lang)
  const client = person.tenantNameAr || person.tenantNameEn ? localName(person, 'tenantName', lang) : null

  return client ? `${name} — ${client}` : name
}

// Pick someone (staff or client user) and write the first message.
export const NewMessageDialog = ({ open, onClose, onStarted }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [person, setPerson] = useState(null)
  const [input, setInput] = useState('')
  const [options, setOptions] = useState([])
  const [body, setBody] = useState('')
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPerson(null)
    setBody('')
    setErrorCode(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()

    const timer = setTimeout(() => {
      axios
        .get('/api/admin/messages/recipients', { signal: controller.signal, params: { search: input || undefined } })
        .then(response => setOptions(response.data.data))
        .catch(() => {})
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [input, open])

  const submit = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .post('/api/admin/messages/conversations', { userId: person?.id, body })
      .then(response => onStarted(response.data.data.conversation))
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.messages.newTitle')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <Autocomplete
              value={person}
              onChange={(e, value) => setPerson(value)}
              onInputChange={(e, value) => setInput(value)}
              options={options}
              filterOptions={x => x}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              getOptionLabel={option => personLabel(option, lang)}
              noOptionsText={t('admin.messages.noRecipients')}
              renderInput={params => <CustomTextField {...params} fullWidth label={t('admin.messages.to')} />}
            />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={4}
              label={t('admin.messages.message')}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' onClick={submit} disabled={submitting || !person || !body.trim()}>
          {t('admin.messages.send')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Report one message received from the other person (MSG-04).
export const ReportMessageDialog = ({ message, onClose, onReported }) => {
  const { t } = useTranslation()
  const [reason, setReason] = useState('offensive')
  const [details, setDetails] = useState('')
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!message) return
    setReason('offensive')
    setDetails('')
    setErrorCode(null)
  }, [message])

  const submit = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .post(`/api/admin/messages/${message.id}/report`, { reason, details: details || null })
      .then(() => onReported())
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={Boolean(message)} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('admin.messages.reportTitle')}</DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <CustomTextField
              select
              fullWidth
              label={t('admin.messages.reportReason')}
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              {REPORT_REASONS.map(r => (
                <MenuItem key={r} value={r}>
                  {t(`admin.messages.reason.${r}`)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label={t('admin.messages.reportDetails')}
              value={details}
              onChange={e => setDetails(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' color='error' onClick={submit} disabled={submitting}>
          {t('admin.messages.report')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
