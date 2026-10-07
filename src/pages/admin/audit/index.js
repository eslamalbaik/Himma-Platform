// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import TablePagination from '@mui/material/TablePagination'
import Box from '@mui/material/Box'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Component Imports
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

// ** Views
import AuditLogsTable from 'src/views/admin/AuditLogsTable'

const AuditLogPage = () => {
  const { t } = useTranslation()

  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(25)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setLoadError(null)
    axios
      .get('/api/admin/audit-logs', {
        signal: controller.signal,
        params: {
          search: search || undefined,
          action: action || undefined,
          page: page + 1,
          perPage
        }
      })
      .then(response => {
        setLogs(response.data.data)
        setTotal(response.data.meta.total)
        setActions(response.data.actions)
      })
      .catch(err => {
        if (axios.isCancel(err)) return
        setLoadError('loadError')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [search, action, page, perPage])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('admin.audit.title')} subheader={t('admin.audit.subtitle')} />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.audit.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <Icon icon='tabler:search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <CustomTextField
                select
                sx={{ minWidth: 220 }}
                label={t('admin.audit.filterAction')}
                value={action}
                onChange={e => {
                  setPage(0)
                  setAction(e.target.value)
                }}
              >
                <MenuItem value=''>{t('admin.audit.allActions')}</MenuItem>
                {actions.map(value => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {loadError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`admin.audit.${loadError}`)}
              </Alert>
            ) : null}

            <AuditLogsTable logs={logs} loading={loading} />

            <TablePagination
              component='div'
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={perPage}
              onRowsPerPageChange={e => {
                setPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

AuditLogPage.acl = {
  action: 'read',
  subject: 'audit'
}

export default AuditLogPage
