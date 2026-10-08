// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Imports
import Link from 'next/link'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import CustomTextField from 'src/@core/components/mui/text-field'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { formatDate, localName } from 'src/views/admin/billing/format'
import { formatDateTime } from 'src/views/admin/events/helpers'
import { STATES, STATE_LOOK, roleIcon } from './RoleMatrix'

const TypeChip = ({ type }) => {
  const { t } = useTranslation()

  return (
    <Chip
      size='small'
      variant='tonal'
      color={type === 'system' ? 'info' : 'secondary'}
      label={t(`admin.roleTemplates.type.${type}`)}
    />
  )
}

// Description, users, last change and the permissions the role has (ROL-06).
export const RoleDetails = ({ role }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  if (!role) return null

  const allowed = Object.entries(role.permissions).filter(([, state]) => state === 'allowed')
  const restricted = Object.entries(role.permissions).filter(([, state]) => state === 'restricted')

  return (
    <Card>
      <CardHeader title={t('admin.roleTemplates.detailsTitle')} />
      <CardContent>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
          <CustomAvatar skin='light' variant='rounded' color='primary' sx={{ width: 44, height: 44 }}>
            <Icon icon={roleIcon(role)} fontSize='1.5rem' />
          </CustomAvatar>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <Typography variant='h6'>{localName(role, 'name', lang)}</Typography>
              <TypeChip type={role.type} />
            </Box>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {(lang === 'en' ? role.descriptionEn : role.descriptionAr) || '-'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', gap: 4 }}>
          <div>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {t('admin.roleTemplates.usersCount')}
            </Typography>
            <Typography variant='h6'>{role.usersCount ?? '—'}</Typography>
          </div>
          <div>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              {t('admin.roleTemplates.lastUpdated')}
            </Typography>
            <Typography sx={{ fontWeight: 500 }}>{formatDate(role.updatedAt, lang)}</Typography>
          </div>
        </Box>
        <Typography variant='body2' sx={{ mb: 2, fontWeight: 600 }}>
          {t('admin.roleTemplates.mainPermissions')}
        </Typography>
        {allowed.length === 0 && restricted.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.roleTemplates.noPermissions')}
          </Typography>
        ) : (
          [...allowed, ...restricted].map(([permission, state]) => (
            <Box key={permission} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box component='span' sx={{ display: 'flex', color: STATE_LOOK[state].color }}>
                <Icon icon={STATE_LOOK[state].icon} fontSize='1.125rem' />
              </Box>
              <Typography variant='body2'>{t(`admin.roleTemplates.permission.${permission}`)}</Typography>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// Count of allowed, restricted and denied cells across the matrix (ROL-07).
export const PermissionStats = ({ roles }) => {
  const { t } = useTranslation()
  const theme = useTheme()

  const counts = Object.fromEntries(STATES.map(state => [state, 0]))
  roles.forEach(role => Object.values(role.permissions).forEach(state => (counts[state] += 1)))
  const total = STATES.reduce((sum, state) => sum + counts[state], 0)
  const colors = [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main]

  return (
    <Card>
      <CardHeader title={t('admin.roleTemplates.statsTitle')} />
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          {STATES.map((state, i) => (
            <Box key={state} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: colors[i] }} />
              <Typography variant='body2' sx={{ flexGrow: 1 }}>
                {t(`admin.roleTemplates.state.${state}`)}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {counts[state]}
              </Typography>
            </Box>
          ))}
          <Box sx={{ pt: 2, display: 'flex', borderTop: theme => `1px solid ${theme.palette.divider}` }}>
            <Typography variant='body2' sx={{ flexGrow: 1, fontWeight: 600 }}>
              {t('admin.roleTemplates.total')}
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {total}
            </Typography>
          </Box>
        </Box>
        <ReactApexcharts
          type='donut'
          width={120}
          height={120}
          series={STATES.map(state => counts[state])}
          options={{
            labels: STATES.map(state => t(`admin.roleTemplates.state.${state}`)),
            colors,
            legend: { show: false },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            plotOptions: { pie: { donut: { size: '68%' } } }
          }}
        />
      </CardContent>
    </Card>
  )
}

// Latest role changes from the audit log (ROL-08). `events` is null when the user may not read the log.
export const RecentRoleEvents = ({ events, roles }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  if (!events) return null

  const describe = event => {
    const role = lang === 'en' ? event.metadata?.nameEn : event.metadata?.nameAr
    if (event.action === 'role_template.permission_changed') {
      return t('admin.roleTemplates.event.permission_changed', {
        role,
        permission: t(`admin.roleTemplates.permission.${event.metadata.permission}`),
        to: t(`admin.roleTemplates.state.${event.metadata.to}`)
      })
    }

    return t(`admin.roleTemplates.event.${event.action.split('.')[1]}`, { role })
  }

  return (
    <Card>
      <CardHeader title={t('admin.roleTemplates.recentTitle')} />
      <CardContent>
        {events.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.roleTemplates.noEvents')}
          </Typography>
        ) : (
          events.map(event => (
            <Box key={event.id} sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Box sx={{ color: 'text.secondary', pt: 0.5 }}>
                <Icon icon='tabler:history' fontSize='1.125rem' />
              </Box>
              <div>
                <Typography variant='body2'>{describe(event)}</Typography>
                <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                  {(lang === 'en' ? event.actorNameEn : event.actorNameAr) || event.actorEmail} ·{' '}
                  {formatDateTime(event.createdAt, lang)}
                </Typography>
              </div>
            </Box>
          ))
        )}
        <Button
          component={Link}
          href='/admin/audit'
          size='small'
          endIcon={<Icon icon={lang === 'en' ? 'tabler:arrow-narrow-right' : 'tabler:arrow-narrow-left'} />}
        >
          {t('admin.roleTemplates.viewAudit')}
        </Button>
      </CardContent>
    </Card>
  )
}

// Roles with their type and number of users (ROL-05).
export const RolesList = ({ roles, selectedId, canUpdate, canDelete, onSelect, onEdit, onDelete }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>{t('admin.roleTemplates.roleName')}</TableCell>
          <TableCell>{t('admin.roleTemplates.typeLabel')}</TableCell>
          <TableCell align='right'>{t('admin.roleTemplates.usersCount')}</TableCell>
          {canUpdate || canDelete ? <TableCell align='right'>{t('admin.common.actions')}</TableCell> : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {roles.map(role => (
          <TableRow
            key={role.id}
            hover
            selected={role.id === selectedId}
            onClick={() => onSelect(role.id)}
            sx={{ cursor: 'pointer' }}
          >
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Icon icon={roleIcon(role)} fontSize='1.125rem' />
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  {localName(role, 'name', lang)}
                </Typography>
              </Box>
            </TableCell>
            <TableCell>
              <TypeChip type={role.type} />
            </TableCell>
            <TableCell align='right'>{role.usersCount ?? '—'}</TableCell>
            {canUpdate || canDelete ? (
              <TableCell align='right' onClick={e => e.stopPropagation()}>
                {canUpdate ? (
                  <Tooltip title={t('admin.common.edit')}>
                    <IconButton size='small' onClick={() => onEdit(role)}>
                      <Icon icon='tabler:edit' fontSize='1.125rem' />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {canDelete && role.type === 'custom' && !role.usersCount ? (
                  <Tooltip title={t('admin.common.delete')}>
                    <IconButton size='small' color='error' onClick={() => onDelete(role)}>
                      <Icon icon='tabler:trash' fontSize='1.125rem' />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const emptyForm = { nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', copyFrom: '' }

// Add a role (name, description, copy permissions from an existing role — ROL-04) or edit one.
export const RoleForm = ({ role, roles, submitting, errorCode, onSubmit, onCancel }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const [values, setValues] = useState(emptyForm)

  useEffect(() => {
    setValues(
      role
        ? {
            ...emptyForm,
            nameAr: role.nameAr,
            nameEn: role.nameEn,
            descriptionAr: role.descriptionAr || '',
            descriptionEn: role.descriptionEn || ''
          }
        : emptyForm
    )
  }, [role])

  const field = (name, props = {}) => (
    <CustomTextField
      fullWidth
      sx={{ mb: 4 }}
      label={t(`admin.roleTemplates.field.${name}`)}
      value={values[name]}
      onChange={e => setValues({ ...values, [name]: e.target.value })}
      {...props}
    />
  )

  return (
    <Card>
      <CardHeader
        title={t(role ? 'admin.roleTemplates.editTitle' : 'admin.roleTemplates.addTitle')}
        avatar={<Icon icon='tabler:user-plus' />}
      />
      <CardContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {field('nameAr', { inputProps: { dir: 'rtl' } })}
        {field('nameEn', { inputProps: { dir: 'ltr' } })}
        {field('descriptionAr', { multiline: true, minRows: 2, inputProps: { dir: 'rtl' } })}
        {field('descriptionEn', { multiline: true, minRows: 2, inputProps: { dir: 'ltr' } })}
        {role ? null : (
          <CustomTextField
            select
            fullWidth
            sx={{ mb: 4 }}
            label={t('admin.roleTemplates.field.copyFrom')}
            value={values.copyFrom}
            onChange={e => setValues({ ...values, copyFrom: e.target.value })}
            SelectProps={{ displayEmpty: true }}
            helperText={t('admin.roleTemplates.copyFromHelp')}
          >
            <MenuItem value=''>{t('admin.roleTemplates.startDenied')}</MenuItem>
            {roles.map(option => (
              <MenuItem key={option.id} value={option.id}>
                {localName(option, 'name', lang)}
              </MenuItem>
            ))}
          </CustomTextField>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='contained'
            disabled={submitting}
            onClick={() => onSubmit({ ...values, copyFrom: values.copyFrom || null })}
          >
            {t('admin.roleTemplates.saveRole')}
          </Button>
          {role ? (
            <Button variant='tonal' color='secondary' disabled={submitting} onClick={onCancel}>
              {t('admin.common.cancel')}
            </Button>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  )
}
