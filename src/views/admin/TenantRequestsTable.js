// ** MUI Imports
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

const statusColor = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
}

const TenantRequestsTable = ({ requests, loading, canReview, onApprove, onReject }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('admin.tenants.requests.table.name')}</TableCell>
            <TableCell>{t('admin.tenants.requests.table.type')}</TableCell>
            <TableCell>{t('admin.tenants.requests.table.contact')}</TableCell>
            <TableCell>{t('admin.tenants.requests.table.status')}</TableCell>
            <TableCell>{t('admin.tenants.requests.table.createdAt')}</TableCell>
            {canReview ? <TableCell align='right'>{t('admin.tenants.requests.table.actions')}</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                <CircularProgress size={28} />
              </TableCell>
            </TableRow>
          ) : requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                <Typography sx={{ color: 'text.secondary' }}>{t('admin.tenants.requests.empty')}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            requests.map(req => (
              <TableRow key={req.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 500 }}>{lang === 'en' ? req.nameEn : req.nameAr}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {lang === 'en' ? req.nameAr : req.nameEn}
                  </Typography>
                </TableCell>
                <TableCell>{t(`admin.tenantType.${req.type}`)}</TableCell>
                <TableCell>
                  <Typography variant='body2'>{req.contactName}</Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {req.contactEmail}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={statusColor[req.status] || 'default'}
                    label={t(`admin.tenants.requests.status.${req.status}`)}
                  />
                  {req.status === 'rejected' && req.rejectionReason ? (
                    <Typography variant='body2' sx={{ color: 'text.secondary', mt: 1 }}>
                      {req.rejectionReason}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString(lang) : '-'}</TableCell>
                {canReview ? (
                  <TableCell align='right'>
                    {req.status === 'pending' ? (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button size='small' variant='tonal' color='success' onClick={() => onApprove(req)}>
                          {t('admin.tenants.requests.approveButton')}
                        </Button>
                        <Button size='small' variant='tonal' color='error' onClick={() => onReject(req)}>
                          {t('admin.tenants.requests.rejectButton')}
                        </Button>
                      </Box>
                    ) : null}
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

export default TenantRequestsTable
