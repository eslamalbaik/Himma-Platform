// ** React Imports
import { useEffect, useState } from 'react'

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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Component Imports
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Views
import MemberFormDialog from 'src/views/client/MemberFormDialog'

const STATUSES = ['active', 'disabled']

// Client dashboard → Members: the accounts of the user's own organisation (needs `manage_entity_members`).
const MembersPage = () => {
  const { t, i18n } = useTranslation()
  const { user, setUser } = useAuth()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const readOnly = ['suspended', 'cancelled'].includes(user?.tenant?.status)

  const [members, setMembers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [roles, setRoles] = useState([])

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(25)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [toast, setToast] = useState(null)

  const roleByKey = Object.fromEntries(roles.map(r => [r.key, r]))
  const roleName = key => (roleByKey[key] ? roleByKey[key][lang === 'en' ? 'nameEn' : 'nameAr'] : key)
  const canEdit = member => !readOnly && (member.id === user?.id || Boolean(roleByKey[member.role]?.assignable))

  useEffect(() => {
    axios
      .get('/api/client/roles')
      .then(response => setRoles(response.data.data))
      .catch(() => setRoles([]))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0)
      setSearch(searchInput)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  const fetchMembers = signal => {
    setLoading(true)
    setLoadError(null)
    axios
      .get('/api/client/members', {
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
        setMembers(response.data.data)
        setTotal(response.data.meta.total)
      })
      .catch(err => {
        if (axios.isCancel(err)) return
        setLoadError(err.response?.data?.error?.code || 'network_error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchMembers(controller.signal)

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, status, page, perPage])

  const openForm = member => {
    setEditing(member)
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSubmit = data => {
    setSubmitting(true)
    setFormError(null)

    const payload = {
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      role: data.role,
      status: data.status,
      ...(editing ? {} : { email: data.email }),
      ...(data.password ? { password: data.password } : {})
    }

    const request = editing
      ? axios.put(`/api/client/members/${editing.id}`, payload)
      : axios.post('/api/client/members', payload)

    request
      .then(() => {
        // Your own names changed: refresh the signed-in user shown in the menu.
        if (editing?.id === user?.id) {
          axios.get('/api/auth/me').then(response => setUser(response.data.user))
        }
        closeForm()
        setToast(editing ? 'updated' : 'created')
        fetchMembers()
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('client.members.title')}
            subheader={t('client.members.subtitle', { tenant: user?.tenant?.[lang === 'en' ? 'nameEn' : 'nameAr'] })}
            action={
              readOnly ? null : (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => openForm(null)}>
                  {t('client.members.add')}
                </Button>
              )
            }
          />
          <CardContent>
            {readOnly ? (
              <Alert severity='warning' sx={{ mb: 4 }}>
                {t(`client.home.readOnly.${user.tenant.status}`)}
              </Alert>
            ) : null}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
              <CustomTextField
                sx={{ flex: '1 1 240px' }}
                placeholder={t('client.members.search')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <Icon icon='tabler:search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <CustomTextField
                select
                SelectProps={{ displayEmpty: true }}
                sx={{ minWidth: 200 }}
                label={t('client.members.filterRole')}
                value={role}
                onChange={e => {
                  setPage(0)
                  setRole(e.target.value)
                }}
              >
                <MenuItem value=''>{t('client.members.allRoles')}</MenuItem>
                {roles.map(r => (
                  <MenuItem key={r.key} value={r.key}>
                    {roleName(r.key)}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                SelectProps={{ displayEmpty: true }}
                sx={{ minWidth: 180 }}
                label={t('client.members.filterStatus')}
                value={status}
                onChange={e => {
                  setPage(0)
                  setStatus(e.target.value)
                }}
              >
                <MenuItem value=''>{t('client.members.allStatuses')}</MenuItem>
                {STATUSES.map(value => (
                  <MenuItem key={value} value={value}>
                    {t(`admin.users.status.${value}`)}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {loadError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`errors.${loadError}`)}
              </Alert>
            ) : null}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('client.members.table.name')}</TableCell>
                    <TableCell>{t('client.members.table.email')}</TableCell>
                    <TableCell>{t('client.members.table.role')}</TableCell>
                    <TableCell>{t('client.members.table.status')}</TableCell>
                    <TableCell>{t('client.members.table.lastLogin')}</TableCell>
                    <TableCell align='right'>{t('client.members.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                        <Typography sx={{ color: 'text.secondary' }}>{t('client.members.empty')}</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map(m => (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography component='div' sx={{ fontWeight: 500 }}>
                            {lang === 'en' ? m.nameEn : m.nameAr}
                            {m.id === user?.id ? (
                              <Chip size='small' variant='tonal' label={t('client.members.you')} sx={{ mx: 2 }} />
                            ) : null}
                          </Typography>
                          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            {lang === 'en' ? m.nameAr : m.nameEn}
                          </Typography>
                        </TableCell>
                        <TableCell dir='ltr' sx={{ textAlign: 'start' }}>
                          {m.email}
                        </TableCell>
                        <TableCell>{roleName(m.role)}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={m.status === 'active' ? 'success' : 'warning'}
                            label={t(`admin.users.status.${m.status}`)}
                          />
                        </TableCell>
                        <TableCell>
                          {m.lastLoginAt
                            ? new Date(m.lastLoginAt).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG')
                            : '-'}
                        </TableCell>
                        <TableCell align='right'>
                          {canEdit(m) ? (
                            <IconButton size='small' onClick={() => openForm(m)} aria-label={t('client.members.edit')}>
                              <Icon icon='tabler:edit' fontSize='1.25rem' />
                            </IconButton>
                          ) : readOnly ? null : (
                            <Tooltip title={t('client.members.outranks')}>
                              <span>
                                <IconButton size='small' disabled aria-label={t('client.members.edit')}>
                                  <Icon icon='tabler:lock' fontSize='1.25rem' />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

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
              labelRowsPerPage={t('admin.common.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => t('admin.common.pageRange', { from, to, count })}
            />
          </CardContent>
        </Card>
      </Grid>

      <MemberFormDialog
        open={formOpen}
        member={editing}
        isSelf={Boolean(editing && editing.id === user?.id)}
        roles={roles}
        submitting={submitting}
        errorCode={formError}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(`client.members.${toast}`) : ''}
      />
    </Grid>
  )
}

MembersPage.acl = {
  action: 'manage_entity_members',
  subject: 'client'
}

export default MembersPage
