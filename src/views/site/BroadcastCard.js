// One event or live broadcast of an organization (public profile and the organization's own list).

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

const COLORS = { live: 'error', scheduled: 'info', ended: 'secondary', draft: 'secondary', cancelled: 'secondary' }

export const formatDateTime = (iso, lang) =>
  iso
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE-u-nu-latn', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(iso))
    : ''

const BroadcastCard = ({ event, actions = null }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const title = lang === 'en' ? event.titleEn : event.titleAr
  const description = lang === 'en' ? event.descriptionEn : event.descriptionAr

  return (
    <Box sx={{ py: 5, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
        <Chip
          size='small'
          color={COLORS[event.status] || 'secondary'}
          variant={event.status === 'live' ? 'filled' : 'outlined'}
          label={t(`community.broadcast.status.${event.status}`)}
        />
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {t(`community.broadcast.types.${event.type}`)} · {t(`community.broadcast.formats.${event.format}`)}
        </Typography>
        {event.visibility === 'institutional' ? (
          <Chip size='small' variant='outlined' label={t('community.broadcast.membersOnly')} />
        ) : null}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 1 }}>{title}</Typography>
      <Typography variant='body2' sx={{ color: 'text.secondary', mb: description ? 2 : 0 }}>
        {formatDateTime(event.startsAt, lang)}
        {event.location ? ` · ${event.location}` : ''}
      </Typography>
      {description ? (
        <Typography variant='body2' sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
          {description}
        </Typography>
      ) : null}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3 }}>
        {event.status === 'live' && event.streamUrl ? (
          <Button
            component='a'
            href={event.streamUrl}
            target='_blank'
            rel='noopener noreferrer'
            variant='contained'
            color='error'
            size='small'
            startIcon={<Icon icon='tabler:broadcast' />}
            sx={{ borderRadius: 99 }}
          >
            {t('community.broadcast.watch')}
          </Button>
        ) : null}
        {event.status === 'ended' && event.recordingUrl ? (
          <Button
            component='a'
            href={event.recordingUrl}
            target='_blank'
            rel='noopener noreferrer'
            variant='outlined'
            size='small'
            startIcon={<Icon icon='tabler:player-play' />}
            sx={{ borderRadius: 99 }}
          >
            {t('community.broadcast.recording')}
          </Button>
        ) : null}
        {actions}
      </Box>
    </Box>
  )
}

export default BroadcastCard
