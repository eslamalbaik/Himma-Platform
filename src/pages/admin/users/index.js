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

// ** Configs
import { PLATFORM_ROLES, roleLabel } from 'src/configs/roles'

// ** Views
import UsersTable from 'src/views/admin/UsersTable'
import UserFormDialog from 'src/views/admin/UserFormDialog'
import UserDeleteDialog from 'src/views/admin/UserDeleteDialog'

const STATUSES = ['active', 'disabled']

const UsersPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const ability = useContext(AbilityContext)

  const canCreate = Boolean(ability?.can('create', 'users'))
  const canUpdate = Boolean(ability?.can('update', 'users'))
  const canDelete = Boolean(ability?.can('delete', 'users'))

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(25)

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const fetchUsers = (signal) => {
    setLoading(true)
    setLoadError(null)
    axios
      .get('/api/admin/users', {
        signal,
        params: {
          search: search || undefined,
          role: role || undefined,
          status: status || undefined,
          page: page + 1,
          perPage
        }
      })
      .then(response => {
        setUsers(response.data.data)
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
    fetchUsers(controller.signal)

    return () => controller.abort()
  }, [search, role, status, page, perPage])

  const openAddForm = () => {
    setEditingUser(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = u => {
    setEditingUser(u)
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingUser(null)
    setFormError(null)
  }

  const handleFormSubmit = data => {
    setSubmitting(true)
    setFormError(null)

    const payload = { ...data }
    if (editingUser && !payload.password) delete payload.password

    const request = editingUser
      ? axios.put(`/api/admin/users/${editingUser.id}`, payload)
      : axios.post('/api/admin/users', payload)

    request
      .then(() => {
        closeForm()
        setToast(editingUser ? 'updateSuccess' : 'createSuccess')
        fetchUsers()
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    setDeleting(true)
    axios
      .delete(`/api/admin/users/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setToast('deleteSuccess')
        fetchUsers()
      })
      .catch(() => setToast(null))
      .finally(() => setDeleting(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.users.title')}
            subheader={t('admin.users.subtitle')}
            action={
              canCreate ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openAddForm}>
                  {t('admin.users.addButton')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('admin.users.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <Icon icon='tabler:search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <CustomTextField
                select
                sx={{ minWidth: 200 }}
                label={t('admin.users.filterRole')}
                value={role}
                onChange={e => {
                  setPage(0)
                  setRole(e.target.value)
                }}
              >
                <MenuItem value=''>{t('admin.users.allRoles')}</MenuItem>
                {Object.keys(PLATFORM_ROLES).map(value => (
                  <MenuItem key={value} value={value}>
                    {roleLabel(value, lang)}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                sx={{ minWidth: 180 }}
                label={t('admin.users.filterStatus')}
                value={status}
                onChange={e => {
                  setPage(0)
                  setStatus(e.target.value)
                }}
              >
                <MenuItem value=''>{t('admin.users.allStatuses')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.users.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {loadError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`admin.users.${loadError}`)}
              </Alert>
            ) : null}

            <UsersTable
              users={users}
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

      <UserFormDialog
        open={formOpen}
        editingUser={editingUser}
        submitting={submitting}
        errorCode={formError}
        onSubmit={handleFormSubmit}
        onClose={closeForm}
      />

      <UserDeleteDialog
        open={Boolean(deleteTarget)}
        user={deleteTarget}
        submitting={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(`admin.users.${toast}`) : ''}
      />
    </Grid>
  )
}

UsersPage.acl = {
  action: 'read',
  subject: 'users'
}

export default UsersPage
