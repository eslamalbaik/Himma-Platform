// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import CustomChip from 'src/@core/components/mui/chip'
import StatusChip from 'src/views/admin/billing/StatusChip'

// ** Helpers
import { formatDate, localName } from 'src/views/admin/billing/format'

// Subscriptions by status, the ones ending in the next 30 days, and client movement this month
// (GET /api/admin/stats/business → subscriptions, clients).
const SubscriptionsEndingCard = ({ subscriptions, clients }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={t('admin.stats.business.subscriptionsTitle')}
        subheader={t('admin.stats.business.endingSoon', { count: subscriptions.endingSoonCount })}
      />
      <CardContent>
        <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(subscriptions.byStatus).map(([status, count]) => (
            <CustomChip
              key={status}
              rounded
              size='small'
              skin='light'
              label={`${t(`admin.billing.status.${status}`, status)}: ${count}`}
            />
          ))}
        </Box>

        {clients ? (
          <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <CustomChip
              rounded
              size='small'
              skin='light'
              color='success'
              label={t('admin.stats.business.newClients', { count: clients.newThisMonth })}
            />
            <CustomChip
              rounded
              size='small'
              skin='light'
              color='error'
              label={t('admin.stats.business.churned', { count: clients.churnedThisMonth })}
            />
          </Box>
        ) : null}

        <Divider sx={{ mb: 4 }} />

        {subscriptions.endingSoon.length === 0 ? (
          <Typography sx={{ color: 'text.disabled' }}>{t('admin.stats.business.noneEndingSoon')}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {subscriptions.endingSoon.map(s => (
              <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 500 }}>
                    {localName(s, 'tenantName', lang)}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                    {localName(s, 'planName', lang)} ·{' '}
                    {t('admin.stats.business.endsOn', { date: formatDate(s.endsAt, lang) })}
                  </Typography>
                </Box>
                <StatusChip status={s.status} />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default SubscriptionsEndingCard
