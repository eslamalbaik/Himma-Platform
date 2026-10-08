// ** React Imports
import { Fragment, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import { localName } from 'src/views/admin/billing/format'

// The three states of a permission (ROL-02), in the order a click cycles through them.
export const STATES = ['allowed', 'restricted', 'denied']

export const STATE_LOOK = {
  allowed: { icon: 'tabler:circle-check', color: 'success.main' },
  restricted: { icon: 'tabler:circle-minus', color: 'warning.main' },
  denied: { icon: 'tabler:circle-x', color: 'error.main' }
}

const ROLE_ICONS = {
  visitor: 'tabler:user',
  member: 'tabler:id-badge',
  writer: 'tabler:pencil',
  editor: 'tabler:writing',
  institution: 'tabler:school',
  government: 'tabler:building-bank',
  association_supervisor: 'tabler:user-star',
  system_admin: 'tabler:shield-lock'
}

export const roleIcon = role => ROLE_ICONS[role.key] || 'tabler:user-cog'

export const nextState = state => STATES[(STATES.indexOf(state) + 1) % STATES.length]

// Roles × permissions matrix (ROL-01) with search and a filter by group. Clicking a cell moves it to the
// next state when the user may edit; clicking a role's header selects it for the details panel.
const RoleMatrix = ({ roles, groups, selectedId, canUpdate, busyCell, onSelect, onToggle }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('')

  const label = permission => t(`admin.roleTemplates.permission.${permission}`)
  const term = search.trim().toLowerCase()

  const visibleGroups = Object.entries(groups)
    .filter(([key]) => !group || key === group)
    .map(([key, permissions]) => [key, permissions.filter(p => !term || label(p).toLowerCase().includes(term))])
    .filter(([, permissions]) => permissions.length > 0)

  return (
    <Card>
      <CardHeader
        title={t('admin.roleTemplates.matrixTitle')}
        subheader={t(canUpdate ? 'admin.roleTemplates.matrixHint' : 'admin.roleTemplates.matrixReadOnly')}
      />
      <Box sx={{ px: 6, pb: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
        <CustomTextField
          size='small'
          sx={{ width: { xs: '100%', sm: 240 } }}
          placeholder={t('admin.roleTemplates.searchPermission')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <CustomTextField
          select
          size='small'
          sx={{ width: { xs: '100%', sm: 200 } }}
          value={group}
          onChange={e => setGroup(e.target.value)}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value=''>{t('admin.roleTemplates.allGroups')}</MenuItem>
          {Object.keys(groups).map(key => (
            <MenuItem key={key} value={key}>
              {t(`admin.roleTemplates.group.${key}`)}
            </MenuItem>
          ))}
        </CustomTextField>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginInlineStart: 'auto' }}>
          {STATES.map(state => (
            <Box key={state} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component='span' sx={{ display: 'flex', color: STATE_LOOK[state].color }}>
                <Icon icon={STATE_LOOK[state].icon} fontSize='1.125rem' />
              </Box>
              <Typography variant='body2'>{t(`admin.roleTemplates.state.${state}`)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <TableContainer>
        <Table size='small' sx={{ '& td, & th': { px: 2 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 180, textTransform: 'none' }}>
                {t('admin.roleTemplates.permissionColumn')}
              </TableCell>
              {roles.map(role => (
                <TableCell
                  key={role.id}
                  align='center'
                  onClick={() => onSelect(role.id)}
                  sx={{
                    cursor: 'pointer',
                    minWidth: 76,
                    textTransform: 'none',
                    bgcolor: role.id === selectedId ? 'action.selected' : undefined
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Icon icon={roleIcon(role)} fontSize='1.25rem' />
                    <Typography variant='caption' sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                      {localName(role, 'name', lang)}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleGroups.map(([key, permissions]) => (
              <Fragment key={key}>
                <TableRow>
                  <TableCell colSpan={roles.length + 1} sx={{ bgcolor: 'action.hover' }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {t(`admin.roleTemplates.group.${key}`)}
                    </Typography>
                  </TableCell>
                </TableRow>
                {permissions.map(permission => (
                  <TableRow key={permission} hover>
                    <TableCell>
                      <Typography variant='body2'>{label(permission)}</Typography>
                    </TableCell>
                    {roles.map(role => {
                      const state = role.permissions[permission]
                      const look = STATE_LOOK[state]
                      const busy = busyCell === `${role.id}:${permission}`

                      return (
                        <TableCell
                          key={role.id}
                          align='center'
                          sx={{ bgcolor: role.id === selectedId ? 'action.selected' : undefined }}
                        >
                          <Tooltip title={t(`admin.roleTemplates.state.${state}`)}>
                            <span>
                              <IconButton
                                size='small'
                                disabled={!canUpdate || busy}
                                onClick={() => onToggle(role, permission)}
                                aria-label={`${localName(role, 'name', lang)} · ${label(permission)} · ${t(
                                  `admin.roleTemplates.state.${state}`
                                )}`}
                                sx={{
                                  color: look.color,
                                  '&.Mui-disabled': { color: look.color, opacity: busy ? 0.4 : 1 }
                                }}
                              >
                                <Icon icon={look.icon} fontSize='1.25rem' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant='body2' sx={{ px: 6, py: 4, color: 'text.secondary' }}>
        {t('admin.roleTemplates.itemLevelNote')}
      </Typography>
    </Card>
  )
}

export default RoleMatrix
