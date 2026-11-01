// "Keep me posted": a reader leaves an email for the card's news and upcoming events.

// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import CustomTextField from 'src/@core/components/mui/text-field'

const SubscribeBox = ({ slug, color }) => {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ submitting: false, done: false, errorCode: null })

  const submit = event => {
    event.preventDefault()
    setState({ submitting: true, done: false, errorCode: null })
    axios
      .post(`/api/public/cards/${slug}/subscribe`, { email, language: i18n.language === 'en' ? 'en' : 'ar' })
      .then(() => setState({ submitting: false, done: true, errorCode: null }))
      .catch(err =>
        setState({ submitting: false, done: false, errorCode: err.response?.data?.error?.code || 'network_error' })
      )
  }

  return (
    <Box sx={{ p: 5, borderRadius: 4, backgroundColor: '#fff', border: `1px solid ${color}33` }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{t('cards.subscribe.title')}</Typography>
      <Typography variant='body2' sx={{ mb: 4, color: 'text.secondary' }}>
        {t('cards.subscribe.subtitle')}
      </Typography>
      {state.done ? (
        <Alert severity='success'>{t('cards.subscribe.done')}</Alert>
      ) : (
        <Box component='form' onSubmit={submit} sx={{ display: 'flex', gap: 2 }}>
          <CustomTextField
            fullWidth
            type='email'
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('cards.subscribe.placeholder')}
            inputProps={{ 'aria-label': t('cards.subscribe.placeholder') }}
          />
          <Button
            type='submit'
            variant='contained'
            disabled={state.submitting}
            sx={{ flexShrink: 0, backgroundColor: color, '&:hover': { backgroundColor: color } }}
          >
            {t('cards.subscribe.button')}
          </Button>
        </Box>
      )}
      {state.errorCode ? (
        <Alert severity='error' sx={{ mt: 3 }}>
          {t(`errors.${state.errorCode}`)}
        </Alert>
      ) : null}
    </Box>
  )
}

export default SubscribeBox
