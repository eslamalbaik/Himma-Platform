// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const emptyPlan = {
  nameAr: '',
  nameEn: '',
  price: '',
  currency: 'AED',
  interval: 'yearly',
  featuresAr: '',
  featuresEn: '',
  isActive: true
}

const PlanFormDialog = ({ open, plan, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    values: plan
      ? { ...emptyPlan, ...plan, featuresAr: plan.featuresAr || '', featuresEn: plan.featuresEn || '' }
      : emptyPlan
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t(plan ? 'admin.billing.plans.editTitle' : 'admin.billing.plans.addTitle')}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            {['nameAr', 'nameEn'].map(name => (
              <Grid item xs={12} sm={6} key={name}>
                <Controller
                  name={name}
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      label={t(`admin.billing.plans.${name}`)}
                      error={Boolean(errors[name])}
                    />
                  )}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={4}>
              <Controller
                name='price'
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    type='number'
                    label={t('admin.billing.plans.price')}
                    error={Boolean(errors.price)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name='currency'
                control={control}
                rules={{ required: true, pattern: /^[A-Za-z]{3}$/ }}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label={t('admin.billing.plans.currency')}
                    error={Boolean(errors.currency)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name='interval'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} select fullWidth label={t('admin.billing.plans.interval')}>
                    {['monthly', 'yearly'].map(value => (
                      <MenuItem key={value} value={value}>
                        {t(`admin.billing.interval.${value}`)}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
              />
            </Grid>
            {['featuresAr', 'featuresEn'].map(name => (
              <Grid item xs={12} sm={6} key={name}>
                <Controller
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      fullWidth
                      multiline
                      minRows={3}
                      label={t(`admin.billing.plans.${name}`)}
                    />
                  )}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Controller
                name='isActive'
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />}
                    label={t('admin.billing.plans.isActive')}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
            {t('admin.common.cancel')}
          </Button>
          <Button type='submit' variant='contained' disabled={submitting}>
            {t('admin.common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

const PlansPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canCreate = Boolean(ability?.can('create', 'billing'))
  const canUpdate = Boolean(ability?.can('update', 'billing'))
  const canDelete = Boolean(ability?.can('delete', 'billing'))

  const [search, setSearch] = useState('')
  const list = useApiList('/api/admin/billing/plans', { search })

  const [form, setForm] = useState({ open: false, plan: null })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [toast, setToast] = useState(null)

  const save = data => {
    setSubmitting(true)
    setFormError(null)
    const payload = { ...data, price: Number(data.price) }
    const request = form.plan
      ? axios.put(`/api/admin/billing/plans/${form.plan.id}`, payload)
      : axios.post('/api/admin/billing/plans', payload)
    request
      .then(() => {
        setForm({ open: false, plan: null })
        setToast('admin.common.saved')
        list.reload()
      })
      .catch(err => setFormError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const remove = () => {
    setSubmitting(true)
    axios
      .delete(`/api/admin/billing/plans/${deleteTarget.id}`, { data: {} })
      .then(() => {
        setDeleteTarget(null)
        setToast('admin.common.deleted')
        list.reload()
      })
      .catch(err => setDeleteError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const columns = [
    {
      key: 'name',
      label: t('admin.billing.plans.name'),
      render: plan => <Typography sx={{ fontWeight: 500 }}>{localName(plan, 'name', lang)}</Typography>
    },
    {
      key: 'price',
      label: t('admin.billing.plans.price'),
      render: plan => formatMoney(plan.price, plan.currency, lang)
    },
    {
      key: 'interval',
      label: t('admin.billing.plans.interval'),
      render: plan => t(`admin.billing.interval.${plan.interval}`)
    },
    {
      key: 'subscriptionsCount',
      label: t('admin.billing.plans.subscriptions'),
      render: plan => plan.subscriptionsCount ?? 0
    },
    {
      key: 'isActive',
      label: t('admin.billing.plans.state'),
      render: plan => (
        <Chip
          size='small'
          variant='tonal'
          color={plan.isActive ? 'success' : 'secondary'}
          label={t(plan.isActive ? 'admin.billing.plans.active' : 'admin.billing.plans.inactive')}
        />
      )
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            label: t('admin.common.actions'),
            align: 'right',
            render: plan => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {canUpdate ? (
                  <IconButton
                    size='small'
                    aria-label={t('admin.common.edit')}
                    onClick={() => {
                      setFormError(null)
                      setForm({ open: true, plan })
                    }}
                  >
                    <Icon icon='tabler:edit' fontSize='1.25rem' />
                  </IconButton>
                ) : null}
                {canDelete ? (
                  <IconButton
                    size='small'
                    color='error'
                    aria-label={t('admin.common.delete')}
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(plan)
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
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.billing.plans.title')}
            subheader={t('admin.billing.plans.subtitle')}
            action={
              canCreate ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => {
                    setFormError(null)
                    setForm({ open: true, plan: null })
                  }}
                >
                  {t('admin.billing.plans.add')}
                </Button>
              ) : null
            }
          />
          <CardContent>
            <CustomTextField
              sx={{ mb: 4, width: { xs: '100%', sm: 320 } }}
              placeholder={t('admin.common.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <DataTable columns={columns} list={list} emptyKey='admin.billing.plans.empty' />
          </CardContent>
        </Card>
      </Grid>

      <PlanFormDialog
        open={form.open}
        plan={form.plan}
        submitting={submitting}
        errorCode={formError}
        onSubmit={save}
        onClose={() => setForm({ open: false, plan: null })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.billing.plans.deleteTitle')}
        message={t('admin.billing.plans.deleteMessage', { name: localName(deleteTarget, 'name', lang) })}
        confirmLabel={t('admin.common.delete')}
        submitting={submitting}
        errorCode={deleteError}
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Grid>
  )
}

PlansPage.acl = { action: 'read', subject: 'billing' }

export default PlansPage
