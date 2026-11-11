// Requests for the verified badge from people and organizations (`/api/admin/verifications`). Staff with
// `update,verification` approve (the badge shows at once) or reject with a note the requester sees.

// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import useApiList from 'src/hooks/useApiList'
import DataTable from 'src/views/admin/billing/DataTable'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'

const COLORS = { pending: 'warning', approved: 'success', rejected: 'error' }

const VerificationsPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const [status, setStatus] = useState('pending')
  const [deciding, setDeciding] = useState(null) // { row, action }
  const [note, setNote] = useState('')
  const list = useApiList('/api/admin/verifications', { status })
  const canDecide = ability?.can('update', 'verification')

  const decide = () => {
    axios
      .post(`/api/admin/verifications/${deciding.row.id}/${deciding.action}`, { note })
      .then(() => {
        toast.success(t(`admin.verifications.done.${deciding.action}`))
        setDeciding(null)
        setNote('')
        list.reload()
      })
      .catch(err => toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`)))
  }

  const columns = [
    {
      key: 'subject',
      label: t('admin.verifications.subject'),
      render: row => (
        <>
          <Typography sx={{ fontWeight: 500 }}>{localName(row, 'subjectName', lang)}</Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {t(`admin.verifications.types.${row.subjectType}`)}
            {row.subjectKey ? ` · ${row.subjectType === 'organization' ? '/org/' : '/u/'}${row.subjectKey}` : ''}
          </Typography>
        </>
      )
    },
    {
      key: 'requestedBy',
      label: t('admin.verifications.requestedBy'),
      render: row => localName(row, 'requestedByName', lang)
    },
    {
      key: 'evidence',
      label: t('admin.verifications.evidence'),
      render: row => (
        <Typography variant='body2' sx={{ maxWidth: 380, whiteSpace: 'pre-line' }}>
          {row.evidence}
          {row.reviewNote ? (
            <Typography component='span' variant='caption' sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
              {t('admin.verifications.note')}: {row.reviewNote}
            </Typography>
          ) : null}
        </Typography>
      )
    },
    {
      key: 'status',
      label: t('admin.verifications.status'),
      render: row => (
        <Chip
          size='small'
          skin='light'
          color={COLORS[row.status]}
          label={t(`admin.verifications.statuses.${row.status}`)}
        />
      )
    },
    { key: 'createdAt', label: t('admin.verifications.createdAt'), render: row => formatDate(row.createdAt, lang) },
    {
      key: 'actions',
      label: '',
      render: row =>
        canDecide && row.status === 'pending' ? (
          <>
            <Button size='small' color='success' onClick={() => setDeciding({ row, action: 'approve' })}>
              {t('admin.verifications.approve')}
            </Button>
            <Button size='small' color='error' onClick={() => setDeciding({ row, action: 'reject' })}>
              {t('admin.verifications.reject')}
            </Button>
          </>
        ) : null
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={t('admin.verifications.title')} subheader={t('admin.verifications.subtitle')} />
          <CardContent>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <CustomTextField
                  select
                  fullWidth
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>{t('admin.verifications.allStatuses')}</MenuItem>
                  {['pending', 'approved', 'rejected'].map(value => (
                    <MenuItem key={value} value={value}>
                      {t(`admin.verifications.statuses.${value}`)}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
            <DataTable columns={columns} list={list} emptyKey='admin.verifications.empty' />
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={Boolean(deciding)} onClose={() => setDeciding(null)} maxWidth='xs' fullWidth>
        <DialogTitle>{t(`admin.verifications.${deciding?.action || 'approve'}`)}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary', mb: 4 }}>
            {deciding ? localName(deciding.row, 'subjectName', lang) : ''}
          </Typography>
          <CustomTextField
            fullWidth
            multiline
            minRows={2}
            label={t('admin.verifications.note')}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setDeciding(null)}>
            {t('site.cancel')}
          </Button>
          <Button variant='contained' color={deciding?.action === 'approve' ? 'success' : 'error'} onClick={decide}>
            {t(`admin.verifications.${deciding?.action || 'approve'}`)}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

VerificationsPage.acl = { action: 'read', subject: 'verification' }

export default VerificationsPage
