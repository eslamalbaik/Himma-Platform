// Live broadcasts on the home page (`GET /api/public/broadcasts`): what is live now, what is announced next and
// the latest recordings, of the page's community. Nothing is drawn while the three lists are empty.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Components
import Icon from 'src/@core/components/icon'
import { formatDateTime } from 'src/views/site/BroadcastCard'

// ** Utils
import { initialOf, ink } from 'src/views/site/storyText'

const BroadcastTile = ({ event }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const title = lang === 'en' ? event.titleEn : event.titleAr
  const org = event.organization
  const orgName = org ? (lang === 'en' ? org.nameEn : org.nameAr) : t('site.broadcasts.platform')
  const live = event.status === 'live'

  return (
    <Box
      sx={{
        p: 5,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        border: theme => `1px solid ${live ? theme.palette.error.main : theme.palette.divider}`,
        backgroundColor: theme => (live ? alpha(theme.palette.error.main, 0.05) : theme.palette.background.paper)
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Chip
          size='small'
          color={live ? 'error' : event.status === 'scheduled' ? 'info' : 'secondary'}
          variant={live ? 'filled' : 'outlined'}
          icon={live ? <Icon icon='tabler:broadcast' fontSize='1rem' /> : undefined}
          label={t(`community.broadcast.status.${event.status}`)}
        />
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {t(`community.broadcast.types.${event.type}`)}
        </Typography>
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: ink, lineHeight: 1.4 }}>{title}</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          src={org?.logoUrl || undefined}
          sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: 'primary.main' }}
        >
          {initialOf(orgName)}
        </Avatar>
        {org ? (
          <Typography
            variant='body2'
            component={Link}
            href={`/org/${org.slug}`}
            sx={{ color: ink, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {orgName}
          </Typography>
        ) : (
          <Typography variant='body2' sx={{ color: ink }}>
            {orgName}
          </Typography>
        )}
      </Box>

      <Typography variant='body2' sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Icon icon='tabler:calendar-event' fontSize='1rem' />
        {formatDateTime(event.startsAt, lang)}
      </Typography>

      <Box sx={{ mt: 'auto', pt: 1 }}>
        {live && event.streamUrl ? (
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
      </Box>
    </Box>
  )
}

const HomeBroadcasts = () => {
  const { t } = useTranslation()
  const [data, setData] = useState(null)

  useEffect(() => {
    axios
      .get('/api/public/broadcasts')
      .then(({ data }) => setData(data.data))
      .catch(() => setData(null))
  }, [])

  // Live first, then announced, then recordings; six tiles at most.
  const events = data ? [...data.live, ...data.upcoming, ...data.recordings].slice(0, 6) : []
  if (!events.length) return null
  const liveCount = data.live.length

  return (
    <Box component='section' sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ mx: 'auto', maxWidth: 1336, px: { xs: 4, md: 6 }, py: { xs: 8, md: 10 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 6, flexWrap: 'wrap' }}>
          <Icon icon='tabler:broadcast' fontSize='1.5rem' />
          <Typography component='h2' sx={{ fontWeight: 700, fontSize: '1.35rem', color: ink }}>
            {t('site.broadcasts.title')}
          </Typography>
          {liveCount ? (
            <Chip size='small' color='error' label={t('site.broadcasts.liveNow', { count: liveCount })} />
          ) : null}
        </Box>
        <Box
          sx={{
            display: 'grid',
            gap: 5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }
          }}
        >
          {events.map(event => (
            <BroadcastTile key={event.id} event={event} />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default HomeBroadcasts
