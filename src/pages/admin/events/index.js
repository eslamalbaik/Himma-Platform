// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import { localName, pickLang } from 'src/views/admin/billing/format'
import { KeyedStatusChip } from 'src/views/admin/content/chips'
import { FORMATS, STATUSES, TYPES, formatDateTime, statusColors } from 'src/views/admin/events/helpers'
import useEventActions from 'src/views/admin/events/useEventActions'
import RegistrationsDialog from 'src/views/admin/events/RegistrationsDialog'

const EventsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const [filters, setFilters] = useState({ search: '', when: 'upcoming', status: '', type: '', format: '' })
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const list = useApiList('/api/admin/events', filters)

  const [menu, setMenu] = useState({ anchor: null, event: null })
  const [registrationsFor, setRegistrationsFor] = useState(null)
  const actions = useEventActions({ onDone: list.reload, onRegistrations: setRegistrationsFor })

  const columns = [
    {
      key: 'event',
      label: t('admin.events.column.event'),
      render: event => (
        <Box>
          <Typography sx={{ fontWeight: 500 }}>{localName(event, 'title', lang)}</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {t(`admin.events.type.${event.type}`)}
            {' · '}
            {event.tenantId ? localName(event, 'tenantName', lang) : t('admin.events.platform')}
            {event.visibility !== 'public' ? ` · ${t(`admin.events.visibility.${event.visibility}`)}` : ''}
          </Typography>
          {event.isSponsored ? (
            <Chip size='small' color='warning' variant='tonal' label={t('admin.events.sponsored')} sx={{ mt: 1 }} />
          ) : null}
        </Box>
      )
    },
    {
      key: 'when',
      label: t('admin.events.column.when'),
      render: event => (
        <Box>
          <Typography variant='body2'>{formatDateTime(event.startsAt, lang)}</Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {formatDateTime(event.endsAt, lang)}
          </Typography>
        </Box>
      )
    },
    {
      key: 'format',
      label: t('admin.events.column.format'),
      render: event => (
        <Box>
          <Typography variant='body2'>{t(`admin.events.format.${event.format}`)}</Typography>
          {event.location ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {event.location}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'registrations',
      label: t('admin.events.column.registrations'),
      render: event =>
        event.registrationRequired
          ? `${event.registrationsCount ?? 0} / ${event.capacity ?? t('admin.events.unlimited')}`
          : '-'
    },
    {
      key: 'status',
      label: t('admin.events.column.status'),
      render: event => (
        <Box>
          <KeyedStatusChip namespace='admin.events.status' status={event.status} colors={statusColors} />
          {event.cancelReason ? (
            <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary', mt: 1, maxWidth: 220 }}>
              {event.cancelReason}
            </Typography>
          ) : null}
        </Box>
      )
    },
    {
      key: 'actions',
      label: t('admin.common.actions'),
      align: 'right',
      render: event => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {event.streamUrl && event.status === 'live' ? (
            <Tooltip title={t('admin.events.action.watch')}>
              <IconButton
                size='small'
                color='error'
                component='a'
                href={event.streamUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                <Icon icon='tabler:broadcast' fontSize='1.25rem' />
              </IconButton>
            </Tooltip>
          ) : null}
          {event.recordingUrl ? (
            <Tooltip title={t('admin.events.action.recording')}>
              <IconButton
                size='small'
                component='a'
                href={event.recordingUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                <Icon icon='tabler:player-play' fontSize='1.25rem' />
              </IconButton>
            </Tooltip>
          ) : null}
          {actions.available(event).length ? (
            <IconButton
              size='small'
              aria-label={t('admin.events.action.more')}
              onClick={e => setMenu({ anchor: e.currentTarget, event })}
            >
              <Icon icon='tabler:dots-vertical' fontSize='1.25rem' />
            </IconButton>
          ) : null}
        </Box>
      )
    }
  ]

  const filterSelect = (key, options, labelFn, allLabel = t('admin.common.all')) => (
    <CustomTextField
      select
      sx={{ minWidth: 160 }}
      label={t(`admin.events.filter.${key}`)}
      value={filters[key]}
      onChange={e => setFilter(key, e.target.value)}
    >
      <MenuItem value=''>{allLabel}</MenuItem>
      {options.map(value => (
        <MenuItem key={value} value={value}>
          {labelFn(value)}
        </MenuItem>
      ))}
    </CustomTextField>
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {t('admin.events.title')}
                {list.meta.liveCount ? (
                  <Chip
                    size='small'
                    color='error'
                    label={t('admin.events.liveCount', { count: list.meta.liveCount })}
                  />
                ) : null}
              </Box>
            }
            subheader={t('admin.events.subtitle')}
            action={
              actions.can('create') ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => actions.begin('add')}
                >
                  {t('admin.events.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 220px' }}
                placeholder={t('admin.common.search')}
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
              />
              {filterSelect('when', ['upcoming', 'past'], value => t(`admin.events.filter.${value}`))}
              {filterSelect('status', STATUSES, value => t(`admin.events.status.${value}`))}
              {filterSelect('type', TYPES, value => t(`admin.events.type.${value}`))}
              {filterSelect('format', FORMATS, value => t(`admin.events.format.${value}`))}
            </Box>
            <DataTable columns={columns} list={list} emptyKey='admin.events.empty' />
          </CardContent>
        </Card>
      </Grid>

      <Menu anchorEl={menu.anchor} open={Boolean(menu.anchor)} onClose={() => setMenu({ anchor: null, event: null })}>
        {menu.event
          ? actions.available(menu.event).map(action => (
              <MenuItem
                key={action.key}
                onClick={() => {
                  const event = menu.event
                  setMenu({ anchor: null, event: null })
                  actions.begin(action.key, event)
                }}
              >
                <ListItemIcon>
                  <Icon icon={action.icon} fontSize='1.25rem' />
                </ListItemIcon>
                <ListItemText>{t(`admin.events.action.${action.key}`)}</ListItemText>
              </MenuItem>
            ))
          : null}
      </Menu>

      {actions.dialogs}
      <RegistrationsDialog
        event={registrationsFor}
        canUpdate={actions.can('update')}
        onChanged={list.reload}
        onClose={() => setRegistrationsFor(null)}
      />
    </Grid>
  )
}

EventsPage.acl = { action: 'read', subject: 'events' }

export default EventsPage
