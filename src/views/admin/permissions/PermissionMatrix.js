// ** React Imports
import { Fragment } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import Tooltip from '@mui/material/Tooltip'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import TableContainer from '@mui/material/TableContainer'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'

// ** Helpers
import { localName, pickLang } from 'src/views/admin/billing/format'

// The three states are statuses, so they use the status colours, always with an icon and a label (tooltip).
export const STATE_STYLE = {
  allowed: { icon: 'tabler:circle-check', color: 'success.main' },
  restricted: { icon: 'tabler:circle-minus', color: 'warning.main' },
  denied: { icon: 'tabler:circle-x', color: 'error.main' }
}

const NEXT = { allowed: 'restricted', restricted: 'denied', denied: 'allowed' }

export const StateIcon = ({ state, size = '1.375rem' }) => (
  <Box component='span' sx={{ display: 'inline-flex', color: STATE_STYLE[state].color }}>
    <Icon icon={STATE_STYLE[state].icon} fontSize={size} />
  </Box>
)

// Roles × permissions (ROL-01, ROL-02). `pending` holds unsaved cells as {roleId: {permission: state}}.
const PermissionMatrix = ({ groups, roles, pending, onCycle, editable, selectedId, onSelectRole }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)

  const stateOf = (role, permission) => pending[role.id]?.[permission] ?? role.permissions[permission]

  return (
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 200 }}>{t('admin.tenantRoles.permission')}</TableCell>
            {roles.map(role => (
              <TableCell
                key={role.id}
                align='center'
                onClick={() => onSelectRole(role.id)}
                sx={{
                  cursor: 'pointer',
                  minWidth: 88,
                  textTransform: 'none',
                  color: role.id === selectedId ? 'primary.main' : undefined,
                  borderBottom: theme =>
                    role.id === selectedId ? `2px solid ${theme.palette.primary.main}` : undefined
                }}
              >
                {localName(role, 'name', lang)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(groups).map(([group, permissions]) => (
            <Fragment key={group}>
              <TableRow>
                <TableCell colSpan={roles.length + 1} sx={{ backgroundColor: 'action.hover', py: 1.5 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {t(`tenantPermissions.group.${group}`)}
                  </Typography>
                </TableCell>
              </TableRow>
              {permissions.map(permission => (
                <TableRow key={permission} hover>
                  <TableCell>{t(`tenantPermissions.${permission}`)}</TableCell>
                  {roles.map(role => {
                    const state = stateOf(role, permission)
                    const changed = pending[role.id]?.[permission] !== undefined
                    const label = `${localName(role, 'name', lang)} · ${t(`tenantPermissions.${permission}`)}: ${t(
                      `admin.tenantRoles.state.${state}`
                    )}`

                    return (
                      <TableCell
                        key={role.id}
                        align='center'
                        sx={changed ? { backgroundColor: 'action.selected' } : undefined}
                      >
                        <Tooltip title={label}>
                          <span>
                            <IconButton
                              size='small'
                              aria-label={label}
                              disabled={!editable}
                              onClick={() => onCycle(role, permission, NEXT[state])}
                              sx={{ '&.Mui-disabled': { opacity: 1 } }}
                            >
                              <StateIcon state={state} />
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
  )
}

export default PermissionMatrix
