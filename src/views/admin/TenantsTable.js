// ** MUI Imports
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

const statusColor = {
  active: 'success',
  trial: 'info',
  suspended: 'warning',
  cancelled: 'error'
}

const TenantsTable = ({ tenants, loading, canUpdate, canDelete, onEdit, onDelete, onAccounts }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('admin.tenants.table.name')}</TableCell>
            <TableCell>{t('admin.tenants.table.type')}</TableCell>
            <TableCell>{t('admin.tenants.table.status')}</TableCell>
            <TableCell>{t('admin.tenants.table.users')}</TableCell>
            <TableCell>{t('admin.tenants.table.createdAt')}</TableCell>
            <TableCell align='right'>{t('admin.tenants.table.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                <CircularProgress size={28} />
              </TableCell>
            </TableRow>
          ) : tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                <Typography sx={{ color: 'text.secondary' }}>{t('admin.tenants.empty')}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            tenants.map(tenant => (
              <TableRow key={tenant.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 500 }}>{lang === 'en' ? tenant.nameEn : tenant.nameAr}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {lang === 'en' ? tenant.nameAr : tenant.nameEn}
                  </Typography>
                </TableCell>
                <TableCell>{t(`admin.tenantType.${tenant.type}`)}</TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={statusColor[tenant.status] || 'default'}
                    label={t(`admin.stats.status.${tenant.status}`)}
                  />
                </TableCell>
                <TableCell>{tenant.usersCount ?? 0}</TableCell>
                <TableCell>{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString(lang) : '-'}</TableCell>
                <TableCell align='right'>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <IconButton
                      size='small'
                      onClick={() => onAccounts(tenant)}
                      aria-label={t('admin.tenants.accounts.button')}
                    >
                      <Icon icon='tabler:users' fontSize='1.25rem' />
                    </IconButton>
                    {canUpdate ? (
                      <IconButton
                        size='small'
                        onClick={() => onEdit(tenant)}
                        aria-label={t('admin.tenants.editButton')}
                      >
                        <Icon icon='tabler:edit' fontSize='1.25rem' />
                      </IconButton>
                    ) : null}
                    {canDelete ? (
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => onDelete(tenant)}
                        aria-label={t('admin.tenants.deleteButton')}
                      >
                        <Icon icon='tabler:trash' fontSize='1.25rem' />
                      </IconButton>
                    ) : null}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default TenantsTable
