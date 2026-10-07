// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import TablePagination from '@mui/material/TablePagination'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Component Imports
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import TenantRequestsTable from 'src/views/admin/TenantRequestsTable'
import TenantRequestFormDialog from 'src/views/admin/TenantRequestFormDialog'
import TenantRequestRejectDialog from 'src/views/admin/TenantRequestRejectDialog'

const STATUSES = ['pending', 'approved', 'rejected']

const TenantRequestsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const ability = useContext(AbilityContext)

  const canAdd = Boolean(ability?.can('create', 'tenants'))
  const canReview = Boolean(ability?.can('update', 'tenants'))

  const [requests, setRequests] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(25)

  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [reviewing, setReviewing] = useState(false)

  const [toast, setToast] = useState(null)

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const fetchRequests = (signal) => {
    setLoading(true)
    setLoadError(null)
    axios
      .get('/api/admin/tenant-requests', {
        signal,
        params: {
          search: search || undefined,
          status: status || undefined,
          page: page + 1,
          perPage
        }
      })
      .then(response => {
        setRequests(response.data.data)
        setTotal(response.data.meta.total)
      })
      .catch(err => {
        if (axios.isCancel(err)) return
        setLoadError('loadError')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchRequests(controller.signal)

    return () => controller.abort()
  }, [search, status, page, perPage])

  const handleFormSubmit = data => {
    setSubmitting(true)
    setFormError(null)
    axios
      .post('/api/admin/tenant-requests', data)
      .then(() => {
        setFormOpen(false)
        setToast('createSuccess')
        fetchRequests()
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const handleApproveConfirm = () => {
    if (!approveTarget) return
    setReviewing(true)
    axios
      .post(`/api/admin/tenant-requests/${approveTarget.id}/approve`, {})
      .then(() => {
        setApproveTarget(null)
        setToast('approveSuccess')
        fetchRequests()
      })
      .catch(() => setToast(null))
      .finally(() => setReviewing(false))
  }

  const handleRejectConfirm = reason => {
    if (!rejectTarget) return
    setReviewing(true)
    axios
      .post(`/api/admin/tenant-requests/${rejectTarget.id}/reject`, { reason })
      .then(() => {
        setRejectTarget(null)
        setToast('rejectSuccess')
        fetchRequests()
      })
      .catch(() => setToast(null))
      .finally(() => setReviewing(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.tenants.requests.title')}
            subheader={t('admin.tenants.requests.subtitle')}
            action={
              canAdd ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => setFormOpen(true)}>
                  {t('admin.tenants.requests.addButton')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.tenants.requests.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <Icon icon='tabler:search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <CustomTextField
                select
                sx={{ minWidth: 180 }}
                label={t('admin.tenants.requests.filterStatus')}
                value={status}
                onChange={e => {
                  setPage(0)
                  setStatus(e.target.value)
                }}
              >
                <MenuItem value=''>{t('admin.tenants.requests.allStatuses')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.tenants.requests.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {loadError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`admin.tenants.requests.${loadError}`)}
              </Alert>
            ) : null}

            <TenantRequestsTable
              requests={requests}
              loading={loading}
              canReview={canReview}
              onApprove={setApproveTarget}
              onReject={setRejectTarget}
            />

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
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </CardContent>
        </Card>
      </Grid>

      <TenantRequestFormDialog
        open={formOpen}
        submitting={submitting}
        errorCode={formError}
        onSubmit={handleFormSubmit}
        onClose={() => setFormOpen(false)}
      />

      <Dialog open={Boolean(approveTarget)} onClose={() => setApproveTarget(null)} maxWidth='xs' fullWidth>
        <DialogTitle>{t('admin.tenants.requests.approveConfirm.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.tenants.requests.approveConfirm.message', {
              name: approveTarget ? (lang === 'en' ? approveTarget.nameEn : approveTarget.nameAr) : ''
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={() => setApproveTarget(null)} disabled={reviewing}>
            {t('admin.tenants.requests.approveConfirm.cancel')}
          </Button>
          <Button variant='contained' color='success' onClick={handleApproveConfirm} disabled={reviewing}>
            {t('admin.tenants.requests.approveConfirm.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <TenantRequestRejectDialog
        open={Boolean(rejectTarget)}
        submitting={reviewing}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectTarget(null)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(`admin.tenants.requests.${toast}`) : ''}
      />
    </Grid>
  )
}

TenantRequestsPage.acl = {
  action: 'read',
  subject: 'tenants'
}

export default TenantRequestsPage
