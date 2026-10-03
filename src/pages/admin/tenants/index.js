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

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Component Imports
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

// ** Context
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import TenantsTable from 'src/views/admin/TenantsTable'
import TenantFormDialog from 'src/views/admin/TenantFormDialog'
import TenantDeleteDialog from 'src/views/admin/TenantDeleteDialog'

const TYPES = ['association', 'school', 'institution', 'government']
const STATUSES = ['trial', 'active', 'suspended', 'cancelled']

const TenantsPage = () => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)

  const canCreate = Boolean(ability?.can('create', 'tenants'))
  const canUpdate = Boolean(ability?.can('update', 'tenants'))
  const canDelete = Boolean(ability?.can('delete', 'tenants'))

  const [tenants, setTenants] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(25)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState(null)

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const fetchTenants = (signal) => {
    setLoading(true)
    setLoadError(null)
    axios
      .get('/api/admin/tenants', {
        signal,
        params: {
          search: search || undefined,
          type: type || undefined,
          status: status || undefined,
          page: page + 1,
          perPage
        }
      })
      .then(response => {
        setTenants(response.data.data)
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
    fetchTenants(controller.signal)

    return () => controller.abort()
  }, [search, type, status, page, perPage])

  const openAddForm = () => {
    setEditingTenant(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = tenant => {
    setEditingTenant(tenant)
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingTenant(null)
    setFormError(null)
  }

  const handleFormSubmit = data => {
    setSubmitting(true)
    setFormError(null)

    const request = editingTenant
      ? axios.put(`/api/admin/tenants/${editingTenant.id}`, data)
      : axios.post('/api/admin/tenants', data)

    request
      .then(() => {
        closeForm()
        setToast(editingTenant ? 'updateSuccess' : 'createSuccess')
        fetchTenants()
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    setDeleting(true)
    axios
      .delete(`/api/admin/tenants/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setToast('deleteSuccess')
        fetchTenants()
      })
      .catch(() => setToast(null))
      .finally(() => setDeleting(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.tenants.title')}
            subheader={t('admin.tenants.subtitle')}
            action={
              canCreate ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openAddForm}>
                  {t('admin.tenants.addButton')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.tenants.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <Icon icon='tabler:search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <CustomTextField
                select
                sx={{ minWidth: 180 }}
                label={t('admin.tenants.filterType')}
                value={type}
                onChange={e => {
                  setPage(0)
                  setType(e.target.value)
                }}
              >
                <MenuItem value=''>{t('admin.tenants.allTypes')}</MenuItem>
                {TYPES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.tenantType.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                sx={{ minWidth: 180 }}
                label={t('admin.tenants.filterStatus')}
                value={status}
                onChange={e => {
                  setPage(0)
                  setStatus(e.target.value)
                }}
              >
                <MenuItem value=''>{t('admin.tenants.allStatuses')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.stats.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {loadError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`admin.tenants.${loadError}`)}
              </Alert>
            ) : null}

            <TenantsTable
              tenants={tenants}
              loading={loading}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
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

      <TenantFormDialog
        open={formOpen}
        tenant={editingTenant}
        submitting={submitting}
        errorCode={formError}
        onSubmit={handleFormSubmit}
        onClose={closeForm}
      />

      <TenantDeleteDialog
        open={Boolean(deleteTarget)}
        tenant={deleteTarget}
        submitting={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(`admin.tenants.${toast}`) : ''}
      />
    </Grid>
  )
}

TenantsPage.acl = {
  action: 'read',
  subject: 'tenants'
}

export default TenantsPage
