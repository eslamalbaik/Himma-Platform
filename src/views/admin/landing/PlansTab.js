// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { formatMoney, localName, pickLang } from 'src/views/admin/billing/format'

const THEMES = ['light', 'primary', 'dark']

// The body `PUT /api/admin/landing/plans/{id}` expects, from a plan as the list returns it.
const toPayload = plan => ({
  showOnSite: plan.showOnSite,
  isFeatured: plan.isFeatured,
  theme: plan.theme,
  badgeAr: plan.badgeAr || '',
  badgeEn: plan.badgeEn || '',
  descriptionAr: plan.descriptionAr || '',
  descriptionEn: plan.descriptionEn || '',
  ctaLabelAr: plan.ctaLabelAr || '',
  ctaLabelEn: plan.ctaLabelEn || '',
  ctaUrl: plan.ctaUrl || '',
  featureGroups: plan.featureGroups || []
})

const emptyItem = { textAr: '', textEn: '', included: true }
const emptyGroup = { titleAr: '', titleEn: '', items: [{ ...emptyItem }] }

const PlanDisplayDialog = ({ plan, submitting, errorCode, onSubmit, onClose }) => {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState(null)

  useEffect(() => setForm(plan ? toPayload(plan) : null), [plan])

  if (!plan || !form) return null

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }))
  const setGroups = groups => set('featureGroups', groups)
  const setGroup = (index, patch) => setGroups(form.featureGroups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  const setItem = (gi, ii, patch) =>
    setGroup(gi, { items: form.featureGroups[gi].items.map((item, i) => (i === ii ? { ...item, ...patch } : item)) })

  const text = (name, extra = {}) => (
    <CustomTextField
      fullWidth
      label={t(`admin.landing.plans.${name}`)}
      value={form[name] || ''}
      onChange={e => set(name, e.target.value)}
      {...extra}
    />
  )

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth='md' fullWidth scroll='paper'>
      <DialogTitle>{t('admin.landing.plans.editTitle', { name: localName(plan, 'name', pickLang(i18n)) })}</DialogTitle>
      <DialogContent dividers>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={form.showOnSite} onChange={e => set('showOnSite', e.target.checked)} />}
              label={t('admin.landing.plans.showOnSite')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} />}
              label={t('admin.landing.plans.isFeatured')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              select
              fullWidth
              label={t('admin.landing.plans.theme')}
              value={form.theme}
              onChange={e => set('theme', e.target.value)}
            >
              {THEMES.map(value => (
                <MenuItem key={value} value={value}>
                  {t(`admin.landing.plans.themes.${value}`)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            {text('ctaUrl', {
              placeholder: '/join',
              inputProps: { dir: 'ltr' },
              helperText: t('admin.landing.plans.ctaUrlHelp')
            })}
          </Grid>
          {['badgeAr', 'badgeEn', 'ctaLabelAr', 'ctaLabelEn'].map(name => (
            <Grid item xs={12} sm={6} key={name}>
              {text(name)}
            </Grid>
          ))}
          {['descriptionAr', 'descriptionEn'].map(name => (
            <Grid item xs={12} sm={6} key={name}>
              {text(name, { multiline: true, minRows: 2 })}
            </Grid>
          ))}

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600 }}>{t('admin.landing.plans.featureGroups')}</Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {t('admin.landing.plans.featureGroupsHelp')}
            </Typography>
          </Grid>
          {form.featureGroups.map((group, gi) => (
            <Grid item xs={12} key={gi}>
              <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 4 }}>
                <Box sx={{ display: 'flex', gap: 3, mb: 3, alignItems: 'flex-end' }}>
                  <CustomTextField
                    fullWidth
                    label={t('admin.landing.plans.groupTitleAr')}
                    value={group.titleAr}
                    onChange={e => setGroup(gi, { titleAr: e.target.value })}
                  />
                  <CustomTextField
                    fullWidth
                    label={t('admin.landing.plans.groupTitleEn')}
                    value={group.titleEn}
                    onChange={e => setGroup(gi, { titleEn: e.target.value })}
                  />
                  <IconButton
                    color='error'
                    aria-label={t('admin.landing.plans.removeGroup')}
                    onClick={() => setGroups(form.featureGroups.filter((_, i) => i !== gi))}
                  >
                    <Icon icon='tabler:trash' />
                  </IconButton>
                </Box>
                {group.items.map((item, ii) => (
                  <Box key={ii} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <Checkbox
                      checked={item.included}
                      onChange={e => setItem(gi, ii, { included: e.target.checked })}
                      inputProps={{ 'aria-label': t('admin.landing.plans.included') }}
                    />
                    <CustomTextField
                      fullWidth
                      size='small'
                      placeholder={t('admin.landing.plans.itemAr')}
                      value={item.textAr}
                      onChange={e => setItem(gi, ii, { textAr: e.target.value })}
                    />
                    <CustomTextField
                      fullWidth
                      size='small'
                      placeholder={t('admin.landing.plans.itemEn')}
                      value={item.textEn}
                      onChange={e => setItem(gi, ii, { textEn: e.target.value })}
                    />
                    <IconButton
                      size='small'
                      aria-label={t('admin.landing.plans.removeItem')}
                      onClick={() => setGroup(gi, { items: group.items.filter((_, i) => i !== ii) })}
                    >
                      <Icon icon='tabler:x' fontSize='1.1rem' />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size='small'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => setGroup(gi, { items: [...group.items, { ...emptyItem }] })}
                >
                  {t('admin.landing.plans.addItem')}
                </Button>
              </Box>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              variant='tonal'
              startIcon={<Icon icon='tabler:plus' />}
              onClick={() => setGroups([...form.featureGroups, { ...emptyGroup, items: [{ ...emptyItem }] }])}
            >
              {t('admin.landing.plans.addGroup')}
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, py: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' disabled={submitting} onClick={() => onSubmit(plan, form)}>
          {t('admin.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const PlansTab = ({ canUpdate }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [plans, setPlans] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)
  const [toast, setToast] = useState(false)

  const load = useCallback(() => {
    axios
      .get('/api/admin/landing/plans')
      .then(({ data }) => setPlans(data.data))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(load, [load])

  const save = (plan, payload) => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put(`/api/admin/landing/plans/${plan.id}`, payload)
      .then(() => {
        setEditing(null)
        setToast(true)
        load()
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const move = (index, step) => {
    const ids = plans.map(plan => plan.id)
    ;[ids[index], ids[index + step]] = [ids[index + step], ids[index]]
    axios
      .put('/api/admin/landing/plans/order', { ids })
      .then(load)
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
  }

  return (
    <Card>
      <CardHeader title={t('admin.landing.plans.title')} subheader={t('admin.landing.plans.subtitle')} />
      <CardContent>
        {errorCode && !editing ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {loaded && !plans.length ? <Typography>{t('admin.landing.plans.empty')}</Typography> : null}
        {plans.length ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.billing.plans.name')}</TableCell>
                  <TableCell>{t('admin.billing.plans.price')}</TableCell>
                  <TableCell>{t('admin.landing.plans.theme')}</TableCell>
                  <TableCell>{t('admin.landing.plans.showOnSite')}</TableCell>
                  <TableCell align='right'>{t('admin.common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan, index) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>{localName(plan, 'name', lang)}</Typography>
                      {plan.isFeatured ? (
                        <Chip
                          size='small'
                          variant='tonal'
                          color='warning'
                          label={t('admin.landing.plans.isFeatured')}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {plan.price === 0 ? t('landing.pricing.free') : formatMoney(plan.price, plan.currency, lang)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={{ light: 'secondary', primary: 'primary', dark: 'secondary' }[plan.theme]}
                        label={t(`admin.landing.plans.themes.${plan.theme}`)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={plan.showOnSite}
                        disabled={!canUpdate}
                        inputProps={{ 'aria-label': t('admin.landing.plans.showOnSite') }}
                        onChange={e => save(plan, { ...toPayload(plan), showOnSite: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                      {canUpdate ? (
                        <>
                          <IconButton
                            size='small'
                            disabled={index === 0}
                            aria-label={t('admin.landing.moveUp')}
                            onClick={() => move(index, -1)}
                          >
                            <Icon icon='tabler:chevron-up' />
                          </IconButton>
                          <IconButton
                            size='small'
                            disabled={index === plans.length - 1}
                            aria-label={t('admin.landing.moveDown')}
                            onClick={() => move(index, 1)}
                          >
                            <Icon icon='tabler:chevron-down' />
                          </IconButton>
                          <IconButton
                            size='small'
                            aria-label={t('admin.common.edit')}
                            onClick={() => {
                              setErrorCode(null)
                              setEditing(plan)
                            }}
                          >
                            <Icon icon='tabler:edit' />
                          </IconButton>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : null}
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 4 }}>
          {t('admin.landing.plans.billingNote')}
        </Typography>
      </CardContent>
      <PlanDisplayDialog
        plan={editing}
        submitting={submitting}
        errorCode={editing ? errorCode : null}
        onSubmit={save}
        onClose={() => setEditing(null)}
      />
      <Snackbar
        open={toast}
        autoHideDuration={4000}
        onClose={() => setToast(false)}
        message={t('admin.common.saved')}
      />
    </Card>
  )
}

export default PlansTab
