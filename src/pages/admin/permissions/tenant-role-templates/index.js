// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** Next Imports
import Link from 'next/link'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import { AbilityContext } from 'src/layouts/components/acl/Can'

// ** Views
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { localName } from 'src/views/admin/billing/format'
import RoleMatrix, { nextState } from 'src/views/admin/permissions/RoleMatrix'
import {
  PermissionStats,
  RecentRoleEvents,
  RoleDetails,
  RoleForm,
  RolesList
} from 'src/views/admin/permissions/RolePanels'

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// Permissions → Client role templates (REQUIREMENTS.md §10, ROL-01..08): the roles offered to clients,
// members and the public, and what each may do. Only the owner edits; auditors read.
const RoleTemplatesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'permissions'))
  const canUpdate = Boolean(ability?.can('update', 'permissions'))
  const canDelete = Boolean(ability?.can('delete', 'permissions'))

  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [busyCell, setBusyCell] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [toast, setToast] = useState(null)

  const load = () =>
    axios
      .get('/api/admin/role-templates')
      .then(response => {
        setData(response.data)
        setSelectedId(current => current || response.data.data[0]?.id)
      })
      .catch(err => setLoadError(errorOf(err)))

  useEffect(() => {
    load()
  }, [])

  const replaceRole = role =>
    setData(current => ({ ...current, data: current.data.map(r => (r.id === role.id ? role : r)) }))

  // One cell moves to its next state; the server's answer replaces the role, then the audit panel reloads.
  const toggle = (role, permission) => {
    setBusyCell(`${role.id}:${permission}`)
    axios
      .put(`/api/admin/role-templates/${role.id}/permissions/${permission}`, {
        state: nextState(role.permissions[permission])
      })
      .then(response => {
        replaceRole(response.data.data)
        load()
      })
      .catch(err => setToast(`errors.${errorOf(err)}`))
      .finally(() => setBusyCell(null))
  }

  const save = values => {
    setSubmitting(true)
    setFormError(null)
    const request = editing
      ? axios.put(`/api/admin/role-templates/${editing.id}`, values)
      : axios.post('/api/admin/role-templates', values)
    request
      .then(response => {
        setEditing(null)
        setSelectedId(response.data.data.id)
        setToast('admin.common.saved')
        load()
      })
      .catch(err => setFormError(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const remove = () => {
    setSubmitting(true)
    axios
      .delete(`/api/admin/role-templates/${deleting.id}`, { data: {} })
      .then(() => {
        setDeleting(null)
        setSelectedId(null)
        setToast('admin.common.deleted')
        load()
      })
      .catch(err => setDeleteError(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  const roles = data?.data || []
  const selected = roles.find(role => role.id === selectedId)

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant='h4'>{t('admin.roleTemplates.title')}</Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {t('admin.roleTemplates.subtitle')}
                </Typography>
              </Box>
              <Button
                component={Link}
                href='/admin/permissions/platform-roles'
                variant='tonal'
                color='secondary'
                startIcon={<Icon icon='tabler:shield-lock' />}
              >
                {t('nav.permissions.platformRoles')}
              </Button>
              {ability?.can('read', 'audit') ? (
                <Button component={Link} href='/admin/audit' variant='tonal' startIcon={<Icon icon='tabler:history' />}>
                  {t('nav.audit')}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {loadError ? (
          <Grid item xs={12}>
            <Alert severity='error'>{t(`errors.${loadError}`)}</Alert>
          </Grid>
        ) : null}
        {!data && !loadError ? (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Grid>
        ) : null}

        {data ? (
          <>
            <Grid item xs={12}>
              <RoleMatrix
                roles={roles}
                groups={data.groups}
                selectedId={selectedId}
                canUpdate={canUpdate}
                busyCell={busyCell}
                onSelect={setSelectedId}
                onToggle={toggle}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <RoleDetails role={selected} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <PermissionStats roles={roles} />
            </Grid>
            <Grid item xs={12} lg={4}>
              <RecentRoleEvents events={data.recentEvents} roles={roles} />
            </Grid>

            <Grid item xs={12} md={canCreate || editing ? 7 : 12}>
              <Card>
                <CardHeader title={t('admin.roleTemplates.listTitle')} />
                <RolesList
                  roles={roles}
                  selectedId={selectedId}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onSelect={setSelectedId}
                  onEdit={role => {
                    setFormError(null)
                    setEditing(role)
                  }}
                  onDelete={role => {
                    setDeleteError(null)
                    setDeleting(role)
                  }}
                />
              </Card>
            </Grid>
            {canCreate || editing ? (
              <Grid item xs={12} md={5}>
                <RoleForm
                  role={editing}
                  roles={roles}
                  submitting={submitting}
                  errorCode={formError}
                  onSubmit={save}
                  onCancel={() => setEditing(null)}
                />
              </Grid>
            ) : null}
          </>
        ) : null}

        <ConfirmDialog
          open={Boolean(deleting)}
          title={t('admin.roleTemplates.deleteTitle')}
          message={deleting ? t('admin.roleTemplates.deleteMessage', { name: localName(deleting, 'name', lang) }) : ''}
          confirmLabel={t('admin.common.delete')}
          submitting={submitting}
          errorCode={deleteError}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
        <Snackbar
          open={Boolean(toast)}
          autoHideDuration={4000}
          onClose={() => setToast(null)}
          message={toast ? t(toast) : ''}
        />
      </Grid>
    </ApexChartWrapper>
  )
}

RoleTemplatesPage.acl = { action: 'read', subject: 'permissions' }

export default RoleTemplatesPage
