// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

const POLL_MS = 60 * 1000

// Icon, colour and the page that answers each alert (kinds: App\Billing\BillingNotifier::STAFF_KINDS).
const KIND_META = {
  payment_failed: {
    icon: 'tabler:credit-card-off',
    color: 'error',
    href: vars => `/admin/billing/invoices/?search=${vars.number || ''}`
  },
  invoice_overdue: {
    icon: 'tabler:clock-exclamation',
    color: 'warning',
    href: vars => `/admin/billing/invoices/?search=${vars.number || ''}`
  },
  tenant_suspended: { icon: 'tabler:building-off', color: 'error', href: () => '/admin/tenants/' }
}

const DEFAULT_META = { icon: 'tabler:bell', color: 'primary', href: () => null }

// The bell in the top bar: the signed-in user's own alerts (GET /api/admin/notifications).
const NotificationsDropdown = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const theme = useTheme()
  const end = theme.direction === 'rtl' ? 'left' : 'right' // the menu opens toward the page
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const [anchorEl, setAnchorEl] = useState(null)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(
    () =>
      axios
        .get('/api/admin/notifications')
        .then(response => {
          setItems(response.data.data)
          setUnread(response.data.meta.unread)
          setLoadError(false)
        })
        .catch(() => setLoadError(true)),
    []
  )

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)

    return () => clearInterval(timer)
  }, [load])

  const markRead = id => axios.post('/api/admin/notifications/read', id ? { id } : {}).then(load)

  const open = item => {
    const meta = KIND_META[item.kind] || DEFAULT_META
    const href = meta.href(item.vars || {})
    if (!item.read) markRead(item.id)
    setAnchorEl(null)
    if (href) router.push(href)
  }

  const text = item =>
    t(`notifications.${item.group}.${item.kind}`, {
      ...item.vars,
      client: (lang === 'en' ? item.vars?.clientEn : item.vars?.clientAr) || ''
    })

  const when = iso =>
    new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    )

  return (
    <>
      <IconButton color='inherit' aria-label={t('notifications.title')} onClick={e => setAnchorEl(e.currentTarget)}>
        <Badge color='error' badgeContent={unread} invisible={!unread} max={99}>
          <Icon fontSize='1.625rem' icon='tabler:bell' />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: end }}
        transformOrigin={{ vertical: 'top', horizontal: end }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: '100%', mt: 2 } } }}
      >
        <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant='h6' sx={{ flex: 1 }}>
            {t('notifications.title')}
          </Typography>
          {unread ? (
            <Typography variant='body2' sx={{ color: 'primary.main' }}>
              {t('notifications.unread', { count: unread })}
            </Typography>
          ) : null}
        </Box>
        {loadError ? (
          <Typography sx={{ px: 4, py: 3, color: 'error.main' }}>{t('notifications.loadError')}</Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ px: 4, py: 3, color: 'text.secondary' }}>{t('notifications.empty')}</Typography>
        ) : (
          <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.map(item => {
              const meta = KIND_META[item.kind] || DEFAULT_META

              return (
                <MenuItem
                  key={item.id}
                  onClick={() => open(item)}
                  sx={{ alignItems: 'flex-start', gap: 3, whiteSpace: 'normal', py: 3, opacity: item.read ? 0.7 : 1 }}
                >
                  <CustomAvatar skin='light' color={meta.color} sx={{ width: 34, height: 34 }}>
                    <Icon icon={meta.icon} fontSize='1.25rem' />
                  </CustomAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant='body2' sx={{ fontWeight: item.read ? 400 : 600, color: 'text.primary' }}>
                      {text(item)}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                      {when(item.createdAt)}
                    </Typography>
                  </Box>
                </MenuItem>
              )
            })}
          </Box>
        )}
        {unread ? (
          <Box sx={{ px: 4, py: 3 }}>
            <Button fullWidth variant='contained' onClick={() => markRead(null)}>
              {t('notifications.markAllRead')}
            </Button>
          </Box>
        ) : null}
      </Menu>
    </>
  )
}

export default NotificationsDropdown
