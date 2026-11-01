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
import Switch from '@mui/material/Switch'
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
import MenuItem from '@mui/material/MenuItem'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { localName, pickLang } from 'src/views/admin/billing/format'

const emptyForm = {
  authorAr: '',
  authorEn: '',
  roleAr: '',
  roleEn: '',
  quoteAr: '',
  quoteEn: '',
  rating: 5,
  color: '#5F0118',
  isVisible: true
}

const toPayload = item => ({ ...emptyForm, ...item, roleAr: item.roleAr || '', roleEn: item.roleEn || '' })

const TestimonialDialog = ({ open, item, submitting, errorCode, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) setForm(item ? toPayload(item) : emptyForm)
  }, [open, item])

  const field = (name, extra = {}) => (
    <CustomTextField
      fullWidth
      label={t(`admin.landing.testimonials.${name}`)}
      value={form[name]}
      onChange={e => setForm({ ...form, [name]: e.target.value })}
      {...extra}
    />
  )

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>
        {t(item ? 'admin.landing.testimonials.editTitle' : 'admin.landing.testimonials.addTitle')}
      </DialogTitle>
      <DialogContent>
        {errorCode ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        <Grid container spacing={4} sx={{ pt: 1 }}>
          {['authorAr', 'authorEn', 'roleAr', 'roleEn'].map(name => (
            <Grid item xs={12} sm={6} key={name}>
              {field(name)}
            </Grid>
          ))}
          {['quoteAr', 'quoteEn'].map(name => (
            <Grid item xs={12} key={name}>
              {field(name, { multiline: true, minRows: 2 })}
            </Grid>
          ))}
          <Grid item xs={12} sm={4}>
            {field('rating', {
              select: true,
              onChange: e => setForm({ ...form, rating: Number(e.target.value) }),
              children: [5, 4, 3, 2, 1].map(n => (
                <MenuItem key={n} value={n}>
                  {'★'.repeat(n)}
                </MenuItem>
              ))
            })}
          </Grid>
          <Grid item xs={12} sm={4}>
            {field('color', { type: 'color', inputProps: { style: { height: 24, padding: 0 } } })}
          </Grid>
          <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch checked={form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
              <Typography>{t('admin.landing.testimonials.isVisible')}</Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 6 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button variant='contained' disabled={submitting} onClick={() => onSubmit(form)}>
          {t('admin.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const TestimonialsTab = ({ canCreate, canUpdate, canDelete }) => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ open: false, item: null })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(() => {
    axios
      .get('/api/admin/landing/testimonials')
      .then(({ data }) => setItems(data.data))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(load, [load])

  const run = (request, after) => {
    setSubmitting(true)
    setErrorCode(null)
    request
      .then(() => {
        after?.()
        setToast('admin.common.saved')
        load()
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const save = data =>
    run(
      form.item
        ? axios.put(`/api/admin/landing/testimonials/${form.item.id}`, data)
        : axios.post('/api/admin/landing/testimonials', data),
      () => setForm({ open: false, item: null })
    )

  const move = (index, step) => {
    const ids = items.map(item => item.id)
    ;[ids[index], ids[index + step]] = [ids[index + step], ids[index]]
    run(axios.put('/api/admin/landing/testimonials/order', { ids }))
  }

  return (
    <Card>
      <CardHeader
        title={t('admin.landing.testimonials.title')}
        subheader={t('admin.landing.testimonials.subtitle')}
        action={
          canCreate ? (
            <Button
              variant='contained'
              startIcon={<Icon icon='tabler:plus' />}
              onClick={() => {
                setErrorCode(null)
                setForm({ open: true, item: null })
              }}
            >
              {t('admin.landing.testimonials.add')}
            </Button>
          ) : null
        }
      />
      <CardContent>
        {errorCode && !form.open && !deleteTarget ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${errorCode}`)}
          </Alert>
        ) : null}
        {loaded && !items.length ? <Typography>{t('admin.landing.testimonials.empty')}</Typography> : null}
        {items.length ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.landing.testimonials.author')}</TableCell>
                  <TableCell>{t('admin.landing.testimonials.quote')}</TableCell>
                  <TableCell>{t('admin.landing.testimonials.rating')}</TableCell>
                  <TableCell>{t('admin.landing.testimonials.isVisible')}</TableCell>
                  <TableCell align='right'>{t('admin.common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color }} />
                        {localName(item, 'author', lang)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography noWrap variant='body2'>
                        {localName(item, 'quote', lang)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: 'warning.main', whiteSpace: 'nowrap' }}>
                      {'★'.repeat(item.rating)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isVisible}
                        disabled={!canUpdate || submitting}
                        inputProps={{ 'aria-label': t('admin.landing.testimonials.isVisible') }}
                        onChange={e =>
                          run(
                            axios.put(`/api/admin/landing/testimonials/${item.id}`, {
                              ...toPayload(item),
                              isVisible: e.target.checked
                            })
                          )
                        }
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
                            disabled={index === items.length - 1}
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
                              setForm({ open: true, item })
                            }}
                          >
                            <Icon icon='tabler:edit' />
                          </IconButton>
                        </>
                      ) : null}
                      {canDelete ? (
                        <IconButton
                          size='small'
                          color='error'
                          aria-label={t('admin.common.delete')}
                          onClick={() => {
                            setErrorCode(null)
                            setDeleteTarget(item)
                          }}
                        >
                          <Icon icon='tabler:trash' />
                        </IconButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : null}
      </CardContent>
      <TestimonialDialog
        open={form.open}
        item={form.item}
        submitting={submitting}
        errorCode={form.open ? errorCode : null}
        onSubmit={save}
        onClose={() => setForm({ open: false, item: null })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('admin.landing.testimonials.deleteTitle')}
        message={t('admin.landing.testimonials.deleteMessage', { name: localName(deleteTarget, 'author', lang) })}
        confirmLabel={t('admin.common.delete')}
        submitting={submitting}
        errorCode={deleteTarget ? errorCode : null}
        onConfirm={() =>
          run(axios.delete(`/api/admin/landing/testimonials/${deleteTarget.id}`, { data: {} }), () =>
            setDeleteTarget(null)
          )
        }
        onClose={() => setDeleteTarget(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ? t(toast) : ''}
      />
    </Card>
  )
}

export default TestimonialsTab
