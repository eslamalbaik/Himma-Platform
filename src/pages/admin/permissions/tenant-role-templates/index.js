// ** React Imports
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Snackbar from '@mui/material/Snackbar'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import { useTheme } from '@mui/material/styles'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { RankTable } from 'src/views/admin/reports/parts'
import RoleFormDialog from 'src/views/admin/permissions/RoleFormDialog'
import PermissionMatrix, { StateIcon } from 'src/views/admin/permissions/PermissionMatrix'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'

const errorOf = err => err.response?.data?.error?.code || 'network_error'

// ROL-06: the selected role: description, users, last update and what it is allowed to do.
const RoleDetails = ({ role, groups }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const allowed = Object.values(groups)
    .flat()
    .filter(p => role.permissions[p] === 'allowed')

  return (
    <Card>
      <CardHeader title={t('admin.tenantRoles.details')} />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant='h6'>{localName(role, 'name', lang)}</Typography>
          <CustomChip
            rounded
            size='small'
            skin='light'
            color={role.type === 'system' ? 'info' : 'primary'}
            label={t(`admin.tenantRoles.type.${role.type}`)}
          />
        </Box>
        <Typography variant='body2' sx={{ mb: 4, color: 'text.secondary' }}>
          {localName(role, 'description', lang) === '-'
            ? t('admin.tenantRoles.noDescription')
            : localName(role, 'description', lang)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 6, mb: 4 }}>
          <Box>
            <Typography variant='body2'>{t('admin.tenantRoles.usersCount')}</Typography>
            <Typography variant='h5'>{role.usersCount}</Typography>
          </Box>
          <Box>
            <Typography variant='body2'>{t('admin.tenantRoles.lastUpdate')}</Typography>
            <Typography variant='h6'>{formatDate(role.updatedAt, lang)}</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Typography variant='subtitle2' sx={{ mb: 2 }}>
          {t('admin.tenantRoles.mainPermissions')}
        </Typography>
        {allowed.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.tenantRoles.noneAllowed')}
          </Typography>
        ) : (
          allowed.map(p => (
            <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <StateIcon state='allowed' size='1.125rem' />
              <Typography variant='body2'>{t(`tenantPermissions.${p}`)}</Typography>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ROL-07: how the matrix splits between the three states.
const StatsCard = ({ stats }) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const states = ['allowed', 'restricted', 'denied']
  const colors = [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main]

  const options = {
    labels: states.map(s => t(`admin.tenantRoles.state.${s}`)),
    colors,
    stroke: { width: 2, colors: [theme.palette.background.paper] },
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { enabled: true },
    plotOptions: { pie: { donut: { size: '68%' } } }
  }

  return (
    <Card>
      <CardHeader title={t('admin.tenantRoles.stats')} />
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ width: 150 }}>
          <ReactApexcharts type='donut' height={150} options={options} series={states.map(s => stats[s])} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {states.map(s => (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <StateIcon state={s} size='1.125rem' />
              <Typography variant='body2' sx={{ flexGrow: 1 }}>
                {t(`admin.tenantRoles.state.${s}`)}
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{stats[s]}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant='body2'>{t('admin.tenantRoles.total')}</Typography>
            <Typography sx={{ fontWeight: 600 }}>{stats.total}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ROL-08: the latest changes, with a link to the full audit log.
const RecentCard = ({ recent, canReadAudit }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const dateFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  return (
    <Card>
      <CardHeader title={t('admin.tenantRoles.recent')} />
      <CardContent>
        {recent.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.disabled' }}>
            {t('admin.tenantRoles.noRecent')}
          </Typography>
        ) : (
          recent.map(log => (
            <Box key={log.id} sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Box sx={{ color: 'text.secondary', pt: 0.5 }}>
                <Icon icon='tabler:history' fontSize='1.125rem' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {t(`admin.tenantRoles.audit.${log.action.replace('tenant_role.', '')}`, {
                    role: lang === 'en' ? log.metadata?.nameEn : log.metadata?.nameAr
                  })}
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  {(lang === 'en' ? log.actorNameEn : log.actorNameAr) || log.actorEmail} ·{' '}
                  {dateFormatter.format(new Date(log.createdAt))}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        {canReadAudit ? (
          <Button component={Link} href='/admin/audit' size='small'>
            {t('admin.tenantRoles.viewAudit')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

const TenantRoleTemplatesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'permissions'))
  const canUpdate = Boolean(ability?.can('update', 'permissions'))
  const canDelete = Boolean(ability?.can('delete', 'permissions'))
  const canReadAudit = Boolean(ability?.can('read', 'audit'))

  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('')
  const [pending, setPending] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [form, setForm] = useState({ open: false, role: null })
  const [formError, setFormError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(
    () =>
      axios
        .get('/api/admin/tenant-roles')
        .then(response => {
          setData(response.data.data)
          setSelectedId(id => id || response.data.data.roles[0]?.id)
        })
        .catch(err => setLoadError(errorOf(err))),
    []
  )

  useEffect(() => {
    load()
  }, [load])

  // ROL-01: search for a permission by its name and filter by group.
  const visibleGroups = useMemo(() => {
    if (!data) return {}
    const needle = search.trim().toLowerCase()

    return Object.fromEntries(
      Object.entries(data.groups)
        .filter(([key]) => !group || key === group)
        .map(([key, permissions]) => [
          key,
          permissions.filter(p => !needle || t(`tenantPermissions.${p}`).toLowerCase().includes(needle))
        ])
        .filter(([, permissions]) => permissions.length > 0)
    )
  }, [data, search, group, t])

  const pendingCount = Object.values(pending).reduce((n, cells) => n + Object.keys(cells).length, 0)

  const cycle = (role, permission, next) =>
    setPending(current => {
      const cells = { ...(current[role.id] || {}) }
      if (role.permissions[permission] === next) delete cells[permission]
      else cells[permission] = next
      const { [role.id]: _old, ...rest } = current

      return Object.keys(cells).length ? { ...rest, [role.id]: cells } : rest
    })

  const saveMatrix = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      for (const [roleId, permissions] of Object.entries(pending)) {
        await axios.put(`/api/admin/tenant-roles/${roleId}/permissions`, { permissions })
      }
      setPending({})
      setToast('admin.common.saved')
      await load()
    } catch (err) {
      setSaveError(errorOf(err))
    } finally {
      setSaving(false)
    }
  }

  const saveRole = values => {
    setSaving(true)
    setFormError(null)
    const request = form.role
      ? axios.put(`/api/admin/tenant-roles/${form.role.id}`, values)
      : axios.post('/api/admin/tenant-roles', values)
    request
      .then(response => {
        setForm({ open: false, role: null })
        setSelectedId(response.data.data.id)
        setToast('admin.common.saved')
        load()
      })
      .catch(err => setFormError(errorOf(err)))
      .finally(() => setSaving(false))
  }

  const removeRole = () => {
    setSaving(true)
    setFormError(null)
    axios
      .delete(`/api/admin/tenant-roles/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setSelectedId(null)
        setToast('admin.common.deleted')
        load()
      })
      .catch(err => setFormError(errorOf(err)))
      .finally(() => setSaving(false))
  }

  if (!data) {
    return loadError ? <Alert severity='error'>{t(`errors.${loadError}`)}</Alert> : <CircularProgress size={28} />
  }

  const selected = data.roles.find(r => r.id === selectedId) || data.roles[0]

  const roleColumns = [
    {
      key: 'name',
      label: t('admin.tenantRoles.roleName'),
      render: role => (
        <Typography
          component='button'
          onClick={() => setSelectedId(role.id)}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            fontWeight: 500,
            color: role.id === selected?.id ? 'primary.main' : 'text.primary'
          }}
        >
          {localName(role, 'name', lang)}
        </Typography>
      )
    },
    { key: 'type', label: t('admin.tenantRoles.typeLabel'), render: role => t(`admin.tenantRoles.type.${role.type}`) },
    { key: 'usersCount', label: t('admin.tenantRoles.usersCount'), align: 'right' },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: role => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {canUpdate ? (
                  <IconButton
                    size='small'
                    aria-label={t('admin.common.edit')}
                    onClick={() => {
                      setFormError(null)
                      setForm({ open: true, role })
                    }}
                  >
                    <Icon icon='tabler:edit' fontSize='1.25rem' />
                  </IconButton>
                ) : null}
                {canDelete && role.type === 'custom' ? (
                  <IconButton
                    size='small'
                    color='error'
                    aria-label={t('admin.common.delete')}
                    onClick={() => {
                      setFormError(null)
                      setDeleteTarget(role)
                    }}
                  >
                    <Icon icon='tabler:trash' fontSize='1.25rem' />
                  </IconButton>
                ) : null}
              </Box>
            )
          }
        ]
      : [])
  ]

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant='h4'>{t('admin.tenantRoles.title')}</Typography>
              <Typography sx={{ color: 'text.secondary' }}>{t('admin.tenantRoles.subtitle')}</Typography>
            </Box>
            {canReadAudit ? (
              <Button component={Link} href='/admin/audit' variant='tonal' startIcon={<Icon icon='tabler:history' />}>
                {t('nav.audit')}
              </Button>
            ) : null}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('admin.tenantRoles.matrix')} />
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', mb: 4 }}>
                <CustomTextField
                  sx={{ width: { xs: '100%', sm: 260 } }}
                  placeholder={t('admin.tenantRoles.searchPermission')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <CustomTextField
                  select
                  sx={{ width: { xs: '100%', sm: 200 } }}
                  value={group}
                  onChange={e => setGroup(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>{t('admin.tenantRoles.allGroups')}</MenuItem>
                  {Object.keys(data.groups).map(key => (
                    <MenuItem key={key} value={key}>
                      {t(`tenantPermissions.group.${key}`)}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', ms: 'auto' }}>
                  {data.states.map(s => (
                    <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <StateIcon state={s} size='1.125rem' />
                      <Typography variant='body2'>{t(`admin.tenantRoles.state.${s}`)}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              {saveError ? (
                <Alert severity='error' sx={{ mb: 4 }}>
                  {t(`errors.${saveError}`)}
                </Alert>
              ) : null}
              <PermissionMatrix
                groups={visibleGroups}
                roles={data.roles}
                pending={pending}
                onCycle={cycle}
                editable={canUpdate && !saving}
                selectedId={selected?.id}
                onSelectRole={setSelectedId}
              />
              <Typography variant='body2' sx={{ mt: 3, color: 'text.secondary' }}>
                {t('admin.tenantRoles.itemLevelNote')}
              </Typography>
              {canUpdate && pendingCount > 0 ? (
                <Box sx={{ display: 'flex', gap: 3, mt: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button variant='contained' onClick={saveMatrix} disabled={saving}>
                    {t('admin.tenantRoles.saveChanges', { count: pendingCount })}
                  </Button>
                  <Button variant='tonal' color='secondary' onClick={() => setPending({})} disabled={saving}>
                    {t('admin.tenantRoles.discard')}
                  </Button>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader
              title={t('admin.tenantRoles.rolesList')}
              action={
                canCreate ? (
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<Icon icon='tabler:plus' />}
                    onClick={() => {
                      setFormError(null)
                      setForm({ open: true, role: null })
                    }}
                  >
                    {t('admin.tenantRoles.add')}
                  </Button>
                ) : null
              }
            />
            <CardContent>
              <RankTable columns={roleColumns} rows={data.roles} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Grid container spacing={6}>
            {selected ? (
              <Grid item xs={12}>
                <RoleDetails role={selected} groups={data.groups} />
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <StatsCard stats={data.stats} />
            </Grid>
            <Grid item xs={12}>
              <RecentCard recent={data.recent} canReadAudit={canReadAudit} />
            </Grid>
          </Grid>
        </Grid>

        <RoleFormDialog
          open={form.open}
          role={form.role}
          roles={data.roles}
          submitting={saving}
          errorCode={formError}
          onSubmit={saveRole}
          onClose={() => setForm({ open: false, role: null })}
        />
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title={t('admin.tenantRoles.deleteTitle')}
          message={t('admin.tenantRoles.deleteMessage', { name: localName(deleteTarget, 'name', lang) })}
          confirmLabel={t('admin.common.delete')}
          submitting={saving}
          errorCode={formError}
          onConfirm={removeRole}
          onClose={() => setDeleteTarget(null)}
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

TenantRoleTemplatesPage.acl = { action: 'read', subject: 'permissions' }

export default TenantRoleTemplatesPage
