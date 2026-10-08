// ** Next Imports
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

// ** Helpers
import { formatDateTime } from 'src/views/admin/events/helpers'

// Live events and those starting in the next 14 days (GET /api/admin/stats/business → events).
const UpcomingEventsCard = ({ events }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={t('admin.stats.business.eventsTitle')}
        subheader={t('admin.stats.business.upcoming', { count: events.upcomingCount })}
        action={
          events.liveNow > 0 ? (
            <Button
              component={Link}
              href='/admin/events/live'
              size='small'
              color='error'
              variant='tonal'
              startIcon={<Icon icon='tabler:broadcast' fontSize='1.125rem' />}
            >
              {t('admin.stats.business.liveNow', { count: events.liveNow })}
            </Button>
          ) : null
        }
      />
      <CardContent>
        {events.upcoming.length === 0 ? (
          <Typography sx={{ color: 'text.disabled' }}>{t('admin.stats.business.noUpcoming')}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {events.upcoming.map(e => (
              <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 500 }}>
                    {(lang === 'en' ? e.titleEn : e.titleAr) || e.titleAr || e.titleEn}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                    {formatDateTime(e.startsAt, lang)}
                  </Typography>
                </Box>
                <CustomChip rounded size='small' skin='light' label={t(`admin.events.format.${e.format}`)} />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingEventsCard
