// ** MUI Imports
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// A list table for the billing pages. `columns`: [{ key, label, render(row), align }].
// Pass `list` (from useApiList) to get loading, empty, error and pagination handled.
const DataTable = ({ columns, list, emptyKey, onRowClick }) => {
  const { t } = useTranslation()
  const { rows, meta, loading, error, page, setPage, perPage, setPerPage } = list

  return (
    <>
      {error ? (
        <Alert severity='error' sx={{ mb: 4 }}>
          {t(`errors.${error}`)}
        </Alert>
      ) : null}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.key} align={column.align || 'inherit'}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align='center' sx={{ py: 10 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align='center' sx={{ py: 10 }}>
                  <Typography sx={{ color: 'text.secondary' }}>{t(emptyKey)}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map(column => (
                    <TableCell key={column.key} align={column.align || 'inherit'}>
                      {column.render ? column.render(row) : row[column.key] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component='div'
        count={meta.total || 0}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={perPage}
        onRowsPerPageChange={e => {
          setPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage={t('admin.common.rowsPerPage')}
      />
    </>
  )
}

export default DataTable
