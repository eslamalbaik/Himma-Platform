// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'

// ** Helpers
import { localName, pickLang } from 'src/views/admin/billing/format'

// Client movement this month.
export const ClientsCard = ({ clients }) => {
  const { t } = useTranslation()

  const figures = [
    { key: 'active', icon: 'tabler:building-community', color: 'success' },
    { key: 'trial', icon: 'tabler:clock', color: 'info' },
    { key: 'suspended', icon: 'tabler:ban', color: 'warning' },
    { key: 'newThisMonth', icon: 'tabler:plus', color: 'primary' },
    { key: 'churnedThisMonth', icon: 'tabler:calendar-x', color: 'error' }
  ]

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('admin.home.clientsTitle')} />
      <CardContent>
        <Grid container spacing={4}>
          {figures.map(item => (
            <Grid item xs={6} key={item.key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <CustomAvatar skin='light' variant='rounded' color={item.color} sx={{ width: 38, height: 38 }}>
                  <Icon fontSize='1.375rem' icon={item.icon} />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5'>{clients[item.key]}</Typography>
                  <Typography variant='body2'>{t(`admin.home.clients.${item.key}`)}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Button component={Link} href='/admin/tenants' size='small' sx={{ mt: 5 }}>
          {t('admin.home.viewClients')}
        </Button>
      </CardContent>
    </Card>
  )
}

// Events live now and the ones starting within 14 days.
export const EventsCard = ({ events }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const dateFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={t('admin.home.eventsTitle')}
        action={
          events.liveNow > 0 ? (
            <CustomChip
              rounded
              size='small'
              skin='light'
              color='error'
              icon={<Icon icon='tabler:broadcast' />}
              label={t('admin.home.liveNow', { count: events.liveNow })}
            />
          ) : null
        }
      />
      <CardContent>
        <Typography variant='h6' sx={{ mb: 2 }}>
          {t('admin.home.upcoming', { count: events.upcomingCount })}
        </Typography>
        {events.upcoming.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.home.upcomingEmpty')}
          </Typography>
        ) : (
          events.upcoming.map(event => (
            <Box key={event.id} sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <CustomAvatar skin='light' variant='rounded' color='primary' sx={{ width: 34, height: 34 }}>
                <Icon fontSize='1.25rem' icon='tabler:calendar-event' />
              </CustomAvatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500 }} noWrap>
                  {localName(event, 'title', lang)}
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  {dateFormatter.format(new Date(event.startsAt))} · {t(`admin.events.format.${event.format}`)}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        <Button component={Link} href='/admin/events' size='small' sx={{ mt: 3 }}>
          {t('admin.home.viewEvents')}
        </Button>
      </CardContent>
    </Card>
  )
}
