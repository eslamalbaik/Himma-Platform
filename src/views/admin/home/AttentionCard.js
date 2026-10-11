// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'

// What waits for someone on the team, each linking to the page where it is handled. The API only
// sends the counts this user's role may see.
const items = [
  { key: 'articlesInReview', href: '/admin/content/review', icon: 'tabler:article', color: 'primary' },
  { key: 'contentReportsOpen', href: '/admin/content/reports', icon: 'tabler:flag', color: 'error' },
  { key: 'commentsPending', href: '/admin/content/comments', icon: 'tabler:messages', color: 'info' },
  { key: 'messageReportsOpen', href: '/admin/messages', icon: 'tabler:shield-x', color: 'warning' },
  { key: 'invoicesOverdue', href: '/admin/billing/invoices', icon: 'tabler:clock-exclamation', color: 'error' }
]

const AttentionCard = ({ attention }) => {
  const { t } = useTranslation()
  const shown = items.filter(item => attention[item.key] !== undefined)
  const allClear = shown.every(item => attention[item.key] === 0)

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={t('admin.home.attentionTitle')} subheader={t('admin.home.attentionSubtitle')} />
      <CardContent>
        {allClear ? (
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, color: 'success.main' }}>
            <Icon icon='tabler:circle-check' />
            <Typography sx={{ color: 'success.main' }}>{t('admin.home.allClear')}</Typography>
          </Box>
        ) : null}
        {shown.map(item => (
          <Box
            key={item.key}
            component={Link}
            href={item.href}
            sx={{
              py: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              color: 'inherit',
              textDecoration: 'none',
              '&:hover .attention-label': { color: 'primary.main' }
            }}
          >
            <CustomAvatar skin='light' variant='rounded' color={item.color} sx={{ width: 34, height: 34 }}>
              <Icon fontSize='1.25rem' icon={item.icon} />
            </CustomAvatar>
            <Typography className='attention-label' sx={{ flexGrow: 1, fontWeight: 500 }}>
              {t(`admin.home.attention.${item.key}`)}
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
      </CardContent>
    </Card>
  )
}

export default AttentionCard
