// ** Next Imports
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'

// Each counter the API may return, with the page that resolves it. The API leaves out counters the
// user may not read, so only the matching rows show.
const ITEMS = [
  { key: 'articlesInReview', icon: 'tabler:file-search', color: 'info', href: '/admin/content/review' },
  { key: 'contentReportsOpen', icon: 'tabler:flag', color: 'error', href: '/admin/content/reports' },
  { key: 'commentsPending', icon: 'tabler:message-circle', color: 'warning', href: '/admin/content/comments' },
  { key: 'messageReportsOpen', icon: 'tabler:message-report', color: 'error', href: '/admin/messages' },
  { key: 'invoicesOverdue', icon: 'tabler:file-alert', color: 'warning', href: '/admin/billing/invoices' }
]

const AttentionCard = ({ attention }) => {
  const { t } = useTranslation()
  const items = ITEMS.filter(item => attention[item.key] !== undefined)
  const total = items.reduce((sum, item) => sum + attention[item.key], 0)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={t('admin.stats.business.attentionTitle')}
        subheader={total === 0 ? t('admin.stats.business.attentionClear') : null}
      />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => (
            <Box
              key={item.key}
              component={Link}
              href={item.href}
              sx={{ display: 'flex', alignItems: 'center', gap: 3, color: 'inherit', textDecoration: 'none' }}
            >
              <CustomAvatar skin='light' variant='rounded' color={item.color} sx={{ width: 34, height: 34 }}>
                <Icon icon={item.icon} fontSize='1.25rem' />
              </CustomAvatar>
              <Typography sx={{ flexGrow: 1, color: 'text.secondary' }}>
                {t(`admin.stats.business.attention.${item.key}`)}
              </Typography>
              <CustomChip
                rounded
                size='small'
                skin='light'
                color={attention[item.key] > 0 ? item.color : 'secondary'}
                label={attention[item.key]}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default AttentionCard
