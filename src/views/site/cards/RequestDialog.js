// A reader asks the author for a digital dedication or a signed printed copy (POST /api/public/cards/{slug}/requests).

// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import CustomTextField from 'src/@core/components/mui/text-field'
import { pick } from 'src/views/site/cards/helpers'

const empty = { name: '', email: '', phone: '', dedicateTo: '', message: '', address: '', bookTitle: '' }

const RequestDialog = ({ open, card, kind, bookTitle, eventId, color, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [form, setForm] = useState(empty)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...empty, bookTitle: bookTitle || '' })
      setErrorCode(null)
      setSent(false)
    }
  }, [open, bookTitle])

  const field = (name, extra = {}) => (
    <CustomTextField
      fullWidth
      label={t(`cards.request.${name}`)}
      value={form[name]}
      onChange={e => setForm({ ...form, [name]: e.target.value })}
      {...extra}
    />
  )

  const submit = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .post(`/api/public/cards/${card.slug}/requests`, { ...form, kind, eventId: eventId || null })
      .then(() => setSent(true))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{t(`cards.requestKinds.${kind}`)}</DialogTitle>
      <DialogContent>
        {sent ? (
          <Alert severity='success'>{t('cards.request.sent')}</Alert>
        ) : (
          <>
            <Typography variant='body2' sx={{ mb: 4, color: 'text.secondary' }}>
              {t(`cards.request.intro.${kind}`)}
            </Typography>
            {errorCode ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`errors.${errorCode}`)}
              </Alert>
            ) : null}
            <Grid container spacing={4}>
              {card.books?.length ? (
                <Grid item xs={12}>
                  {field('bookTitle', {
                    select: true,
                    children: card.books.map(book => (
                      <MenuItem key={book.id} value={book.titleEn}>
                        {pick(book, 'title', lang)}
                      </MenuItem>
                    ))
                  })}
                </Grid>
              ) : null}
              <Grid item xs={12}>
                {field('name', { required: true, autoComplete: 'name' })}
              </Grid>
              <Grid item xs={12}>
                {field('email', { required: true, type: 'email', autoComplete: 'email' })}
              </Grid>
              <Grid item xs={12}>
                {field('phone', { type: 'tel', autoComplete: 'tel' })}
              </Grid>
              <Grid item xs={12}>
                {field('dedicateTo')}
              </Grid>
              <Grid item xs={12}>
                {field('message', { multiline: true, minRows: 2 })}
              </Grid>
              {kind === 'signed_copy' ? (
                <Grid item xs={12}>
                  {field('address', { required: true, multiline: true, minRows: 2, autoComplete: 'street-address' })}
                </Grid>
              ) : null}
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t(sent ? 'cards.public.close' : 'admin.common.cancel')}
        </Button>
        {sent ? null : (
          <Button
            variant='contained'
            disabled={submitting}
            onClick={submit}
            sx={{ backgroundColor: color, '&:hover': { backgroundColor: color } }}
          >
            {t('cards.request.send')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default RequestDialog
