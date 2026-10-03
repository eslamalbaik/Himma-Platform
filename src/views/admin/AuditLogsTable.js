// ** MUI Imports
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

const AuditLogsTable = ({ logs, loading }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('admin.audit.table.time')}</TableCell>
            <TableCell>{t('admin.audit.table.action')}</TableCell>
            <TableCell>{t('admin.audit.table.actor')}</TableCell>
            <TableCell>{t('admin.audit.table.entity')}</TableCell>
            <TableCell>{t('admin.audit.table.ip')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} align='center' sx={{ py: 10 }}>
                <CircularProgress size={28} />
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align='center' sx={{ py: 10 }}>
                <Typography sx={{ color: 'text.secondary' }}>{t('admin.audit.empty')}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            logs.map(log => (
              <TableRow key={log.id} hover>
                <TableCell>{log.createdAt ? new Date(log.createdAt).toLocaleString(lang) : '-'}</TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {log.action}
                  </Typography>
                </TableCell>
                <TableCell>{(lang === 'en' ? log.actorNameEn : log.actorNameAr) || log.actorEmail || '-'}</TableCell>
                <TableCell>
                  {log.entityType ? (
                    <Typography variant='body2'>
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId}` : ''}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{log.ip || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default AuditLogsTable
