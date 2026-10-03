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

// ** Configs
import { roleLabel } from 'src/configs/roles'

const UsersTable = ({ users, loading, canUpdate, canDelete, onEdit, onDelete }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('admin.users.table.name')}</TableCell>
            <TableCell>{t('admin.users.table.email')}</TableCell>
            <TableCell>{t('admin.users.table.role')}</TableCell>
            <TableCell>{t('admin.users.table.status')}</TableCell>
            <TableCell>{t('admin.users.table.lastLogin')}</TableCell>
            {canUpdate || canDelete ? <TableCell align='right'>{t('admin.users.table.actions')}</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                <CircularProgress size={28} />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                <Typography sx={{ color: 'text.secondary' }}>{t('admin.users.empty')}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            users.map(u => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 500 }}>{lang === 'en' ? u.nameEn : u.nameAr}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {lang === 'en' ? u.nameAr : u.nameEn}
                  </Typography>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{roleLabel(u.role, lang)}</TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={u.status === 'active' ? 'success' : 'warning'}
                    label={t(`admin.users.status.${u.status}`)}
                  />
                </TableCell>
                <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString(lang) : '-'}</TableCell>
                {canUpdate || canDelete ? (
                  <TableCell align='right'>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {canUpdate ? (
                        <IconButton size='small' onClick={() => onEdit(u)} aria-label={t('admin.users.editButton')}>
                          <Icon icon='tabler:edit' fontSize='1.25rem' />
                        </IconButton>
                      ) : null}
                      {canDelete ? (
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => onDelete(u)}
                          aria-label={t('admin.users.deleteButton')}
                        >
                          <Icon icon='tabler:trash' fontSize='1.25rem' />
                        </IconButton>
                      ) : null}
                    </Box>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default UsersTable
