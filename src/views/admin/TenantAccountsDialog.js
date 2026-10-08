// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import { localName } from 'src/views/admin/billing/format'

const emptyForm = { nameAr: '', nameEn: '', email: '', role: '', status: 'active', password: '' }

// Clients → a client's accounts (GET/POST/PUT /api/admin/tenants/{id}/users): the accounts that sign in to the
// client dashboard. Adding needs a first password; on edit an empty password keeps the current one, and a new one
// signs the account out everywhere.
const TenantAccountsDialog = ({ tenant, canUpdate, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const [accounts, setAccounts] = useState(null)
  const [roles, setRoles] = useState([])
  const [editing, setEditing] = useState(null) // null: list only, 'new', or an account
  const [form, setForm] = useState(emptyForm)
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const base = tenant ? `/api/admin/tenants/${tenant.id}/users` : null

  const load = () =>
    axios
      .get(base)
      .then(response => {
        setAccounts(response.data.data)
        setRoles(response.data.roles)
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))

  useEffect(() => {
    if (!tenant) return
    setAccounts(null)
    setEditing(null)
    setErrorCode(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant])

  // A government client's accounts default to the government role, others to school / institution.
  const defaultRole = tenant?.type === 'government' ? 'government' : 'institution'

  const startNew = () => {
    setErrorCode(null)
    setForm({ ...emptyForm, role: defaultRole })
    setEditing('new')
  }

  const startEdit = account => {
    setErrorCode(null)
    setForm({ ...emptyForm, ...account, password: '' })
    setEditing(account)
  }

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    const payload = { ...form, password: form.password || null }
    const request = editing === 'new' ? axios.post(base, payload) : axios.put(`${base}/${editing.id}`, payload)
    request
      .then(() => {
        setEditing(null)
        load()
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const roleName = key => {
    const role = roles.find(r => r.key === key)

    return role ? localName(role, 'name', lang) : key
  }

  const field = (name, props = {}) => (
    <CustomTextField
      fullWidth
      label={t(`admin.tenants.accounts.field.${name}`)}
      value={form[name]}
      onChange={e => setForm({ ...form, [name]: e.target.value })}
      {...props}
    />
  )

  return (
    <Dialog open={Boolean(tenant)} onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {tenant ? t('admin.tenants.accounts.title', { name: localName(tenant, 'name', lang) }) : null}
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {t('admin.tenants.accounts.subtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {!accounts ? (
          errorCode ? null : (
            <CircularProgress size={28} />
          )
        ) : accounts.length === 0 ? (
          <Typography sx={{ mb: 4, color: 'text.secondary' }}>{t('admin.tenants.accounts.empty')}</Typography>
        ) : (
          <Table size='small' sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.tenants.accounts.field.name')}</TableCell>
                <TableCell>{t('admin.tenants.accounts.field.role')}</TableCell>
                <TableCell>{t('admin.tenants.accounts.field.status')}</TableCell>
                <TableCell>{t('admin.tenants.accounts.lastLogin')}</TableCell>
                {canUpdate ? <TableCell align='right' /> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {localName(account, 'name', lang)}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }} dir='ltr'>
                      {account.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{roleName(account.role)}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={account.status === 'active' ? 'success' : 'secondary'}
                      label={t(`admin.stats.status.${account.status}`)}
                    />
                  </TableCell>
                  <TableCell>
                    {account.lastLoginAt
                      ? new Date(account.lastLoginAt).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-AE')
                      : t('admin.tenants.accounts.never')}
                  </TableCell>
                  {canUpdate ? (
                    <TableCell align='right'>
                      <IconButton size='small' aria-label={t('admin.common.edit')} onClick={() => startEdit(account)}>
                        <Icon icon='tabler:edit' fontSize='1.125rem' />
                      </IconButton>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canUpdate && editing ? (
          <>
            <Divider sx={{ mb: 4 }} />
            <Typography variant='h6' sx={{ mb: 4 }}>
              {t(editing === 'new' ? 'admin.tenants.accounts.addTitle' : 'admin.tenants.accounts.editTitle')}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                {field('nameAr', { inputProps: { dir: 'rtl' } })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('nameEn', { inputProps: { dir: 'ltr' } })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('email', { type: 'email', inputProps: { dir: 'ltr' } })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('password', {
                  type: 'password',
                  autoComplete: 'new-password',
                  helperText: t(
                    editing === 'new' ? 'admin.tenants.accounts.passwordNew' : 'admin.tenants.accounts.passwordKeep'
                  )
                })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('role', {
                  select: true,
                  children: roles.map(role => (
                    <MenuItem key={role.key} value={role.key}>
                      {localName(role, 'name', lang)}
                    </MenuItem>
                  ))
                })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('status', {
                  select: true,
                  helperText: t('admin.tenants.accounts.statusHelp'),
                  children: ['active', 'disabled'].map(status => (
                    <MenuItem key={status} value={status}>
                      {t(`admin.stats.status.${status}`)}
                    </MenuItem>
                  ))
                })}
              </Grid>
            </Grid>
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        {canUpdate && editing ? (
          <>
            <Button variant='tonal' color='secondary' onClick={() => setEditing(null)} disabled={submitting}>
              {t('admin.common.cancel')}
            </Button>
            <Button variant='contained' onClick={save} disabled={submitting}>
              {t('admin.common.save')}
            </Button>
          </>
        ) : (
          <>
            <Button variant='tonal' color='secondary' onClick={onClose}>
              {t('admin.common.close')}
            </Button>
            {canUpdate ? (
              <Button variant='contained' startIcon={<Icon icon='tabler:user-plus' />} onClick={startNew}>
                {t('admin.tenants.accounts.add')}
              </Button>
            ) : null}
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default TenantAccountsDialog
