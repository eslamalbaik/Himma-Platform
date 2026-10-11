// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import CustomChip from 'src/@core/components/mui/chip'
import StatusChip from 'src/views/admin/billing/StatusChip'

// ** Helpers
import { formatDate, localName, pickLang, statusColors } from 'src/views/admin/billing/format'

const statuses = ['trial', 'active', 'past_due', 'cancelled']

// Subscriptions by status, and the ones that end within 30 days (renewals to follow up).
const SubscriptionsCard = ({ subscriptions }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('admin.home.subscriptionsTitle')} />
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 5 }}>
          {statuses.map(status => (
            <CustomChip
              key={status}
              rounded
              skin='light'
              color={statusColors[status]}
              label={`${t(`admin.billing.status.${status}`)}: ${subscriptions.byStatus[status] || 0}`}
            />
          ))}
        </Box>

        <Typography variant='h6' sx={{ mb: 2 }}>
          {t('admin.home.endingSoon', { count: subscriptions.endingSoonCount })}
        </Typography>
        {subscriptions.endingSoon.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.home.endingSoonEmpty')}
          </Typography>
        ) : (
          subscriptions.endingSoon.map(row => (
            <Box key={row.id} sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 500 }} noWrap>
                  {localName(row, 'tenantName', lang)}
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }} noWrap>
                  {localName(row, 'planName', lang)} · {t('admin.home.endsOn', { date: formatDate(row.endsAt, lang) })}
                </Typography>
              </Box>
              <StatusChip status={row.status} />
            </Box>
          ))
        )}
        <Button component={Link} href='/admin/billing/subscriptions' size='small' sx={{ mt: 3 }}>
          {t('admin.home.viewSubscriptions')}
        </Button>
      </CardContent>
    </Card>
  )
}

export default SubscriptionsCard
