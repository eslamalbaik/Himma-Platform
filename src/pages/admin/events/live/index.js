// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import useApiList from 'src/hooks/useApiList'
import { localName, pickLang } from 'src/views/admin/billing/format'
import { formatDateTime, youtubeEmbedUrl } from 'src/views/admin/events/helpers'
import useEventActions from 'src/views/admin/events/useEventActions'
import RegistrationsDialog from 'src/views/admin/events/RegistrationsDialog'

// Re-renders every minute so "started N minutes ago" stays current.
const useNow = () => {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)

    return () => clearInterval(timer)
  }, [])

  return now
}

const LiveCard = ({ event, actions, onRegistrations, now, youtube }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const embed = event.streamUrl ? youtubeEmbedUrl(event.streamUrl, youtube?.privacyEnhanced) : null
  const minutes = event.liveStartedAt ? Math.max(0, Math.round((now - new Date(event.liveStartedAt)) / 60000)) : 0

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            size='small'
            color='error'
            icon={<Icon icon='tabler:broadcast' />}
            label={t('admin.events.status.live')}
          />
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {t('admin.events.live.startedAgo', { minutes })}
          </Typography>
        </Box>
        <Typography variant='h6' sx={{ mb: 1 }}>
          {localName(event, 'title', lang)}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4 }}>
          {t(`admin.events.type.${event.type}`)} · {t(`admin.events.format.${event.format}`)}
          {event.registrationRequired
            ? ` · ${event.registrationsCount ?? 0} ${t('admin.events.column.registrations')}`
            : ''}
        </Typography>
        {embed ? (
          <Box
            sx={{
              position: 'relative',
              pt: '56.25%',
              borderRadius: 1,
              overflow: 'hidden',
              mb: 4,
              bgcolor: 'action.hover'
            }}
          >
            <Box
              component='iframe'
              src={embed}
              title={t('admin.events.live.preview')}
              allow='autoplay; encrypted-media; picture-in-picture'
              allowFullScreen
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </Box>
        ) : null}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {event.streamUrl ? (
            <Button
              variant='tonal'
              component='a'
              href={event.streamUrl}
              target='_blank'
              rel='noopener noreferrer'
              startIcon={<Icon icon='tabler:external-link' />}
            >
              {t('admin.events.action.watch')}
            </Button>
          ) : null}
          {event.organiserChannelUrl ? (
            <Button
              variant='tonal'
              color='error'
              component='a'
              href={event.organiserChannelUrl}
              target='_blank'
              rel='noopener noreferrer'
              startIcon={<Icon icon='tabler:brand-youtube' />}
            >
              {t('admin.events.live.organiserChannel', { name: localName(event, 'tenantName', lang) })}
            </Button>
          ) : null}
          {event.registrationRequired ? (
            <Button
              variant='tonal'
              color='secondary'
              onClick={() => onRegistrations(event)}
              startIcon={<Icon icon='tabler:users' />}
            >
              {t('admin.events.action.registrations')}
            </Button>
          ) : null}
          {actions.can('update') ? (
            <Button
              variant='contained'
              color='error'
              onClick={() => actions.begin('end', event)}
              startIcon={<Icon icon='tabler:player-stop' />}
            >
              {t('admin.events.action.end')}
            </Button>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  )
}

const LivePage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const now = useNow()

  const live = useApiList('/api/admin/events', { status: 'live' }, { perPage: 50 })
  const upcoming = useApiList(
    '/api/admin/events',
    { status: 'scheduled', format: '', when: 'upcoming' },
    { perPage: 50 }
  )
  const [registrationsFor, setRegistrationsFor] = useState(null)

  // Settings → YouTube: privacy-enhanced embedding and the platform's channel link.
  const [youtube, setYoutube] = useState(null)
  useEffect(() => {
    axios
      .get('/api/admin/settings/youtube')
      .then(response => setYoutube(response.data.data))
      .catch(() => setYoutube(null))
  }, [])

  const reload = () => {
    live.reload()
    upcoming.reload()
  }
  const actions = useEventActions({ onDone: reload, onRegistrations: setRegistrationsFor })

  const weekAhead = now + 7 * 24 * 60 * 60 * 1000
  const soon = upcoming.rows.filter(
    event => ['online', 'hybrid'].includes(event.format) && new Date(event.startsAt).getTime() <= weekAhead
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant='h5'>{t('admin.events.live.title')}</Typography>
          <Typography sx={{ color: 'text.secondary' }}>{t('admin.events.live.subtitle')}</Typography>
        </Box>
        {youtube?.channelUrl ? (
          <Button
            variant='tonal'
            color='error'
            component='a'
            href={youtube.channelUrl}
            target='_blank'
            rel='noopener noreferrer'
            startIcon={<Icon icon='tabler:brand-youtube' />}
          >
            {localName(youtube, 'channelName', lang)}
          </Button>
        ) : null}
      </Grid>

      {live.loading ? (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Grid>
      ) : live.rows.length === 0 ? (
        <Grid item xs={12}>
          <Alert severity='info' icon={<Icon icon='tabler:broadcast-off' />}>
            {t('admin.events.live.none')}
          </Alert>
        </Grid>
      ) : (
        live.rows.map(event => (
          <Grid item xs={12} md={6} key={event.id}>
            <LiveCard
              event={event}
              actions={actions}
              onRegistrations={setRegistrationsFor}
              now={now}
              youtube={youtube}
            />
          </Grid>
        ))
      )}

      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('admin.events.live.upcoming')} />
          <CardContent>
            {!upcoming.loading && soon.length === 0 ? (
              <Typography sx={{ color: 'text.secondary' }}>{t('admin.events.live.noUpcoming')}</Typography>
            ) : null}
            {soon.map(event => (
              <Box
                key={event.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 3,
                  py: 3,
                  flexWrap: 'wrap',
                  borderBottom: theme => `1px solid ${theme.palette.divider}`
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 500 }}>{localName(event, 'title', lang)}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {formatDateTime(event.startsAt, lang)} · {t(`admin.events.format.${event.format}`)}
                  </Typography>
                  {!event.streamUrl ? (
                    <Typography variant='caption' sx={{ color: 'warning.main' }}>
                      {t('admin.events.live.noStream')}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {actions.can('update') ? (
                    <Button size='small' variant='tonal' onClick={() => actions.begin('edit', event)}>
                      {t('admin.events.action.edit')}
                    </Button>
                  ) : null}
                  {actions.can('update') && event.streamUrl ? (
                    <Button
                      size='small'
                      variant='contained'
                      color='error'
                      startIcon={<Icon icon='tabler:broadcast' />}
                      onClick={() => actions.begin('start', event)}
                    >
                      {t('admin.events.action.start')}
                    </Button>
                  ) : null}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {actions.dialogs}
      <RegistrationsDialog
        event={registrationsFor}
        canUpdate={actions.can('update')}
        onChanged={reload}
        onClose={() => setRegistrationsFor(null)}
      />
    </Grid>
  )
}

LivePage.acl = { action: 'read', subject: 'events' }

export default LivePage
