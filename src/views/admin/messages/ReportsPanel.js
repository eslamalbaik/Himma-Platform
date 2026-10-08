// ** React Imports
import { useContext, useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import { formatDate, localName, pickLang } from 'src/views/admin/billing/format'
import { errorOf, personLabel } from './dialogs'

const STATUSES = ['open', 'resolved', 'dismissed']
const STATUS_COLORS = { open: 'warning', resolved: 'success', dismissed: 'secondary' }

// Reported private messages (MSG-04, MSG-06): moderators see only the reported message.
const ReportsPanel = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canDecide = Boolean(ability?.can('update', 'messages'))

  const [status, setStatus] = useState('open')
  const [rows, setRows] = useState(null)
  const [openCount, setOpenCount] = useState(0)
  const [loadError, setLoadError] = useState(null)
  const [deciding, setDeciding] = useState(null)
  const [decision, setDecision] = useState({ status: 'resolved', note: '' })
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = () =>
    axios
      .get('/api/admin/messages/reports', { params: { status: status || undefined, perPage: 50 } })
      .then(response => {
        setRows(response.data.data)
        setOpenCount(response.data.meta.openCount)
        setLoadError(null)
      })
      .catch(err => setLoadError(errorOf(err)))

  useEffect(() => {
    setRows(null)
    load()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const decide = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .post(`/api/admin/messages/reports/${deciding.id}/decide`, decision)
      .then(() => {
        setDeciding(null)
        load()
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Card>
      <CardHeader
        title={t('admin.messages.reports.title')}
        subheader={t('admin.messages.reports.subtitle', { count: openCount })}
        action={
          <CustomTextField
            select
            size='small'
            value={status}
            onChange={e => setStatus(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>{t('admin.common.all')}</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s} value={s}>
                {t(`admin.messages.reports.status.${s}`)}
              </MenuItem>
            ))}
          </CustomTextField>
        }
      />
      <CardContent>
        <Alert severity='info' sx={{ mb: 4 }}>
          {t('admin.messages.reports.privacyNote')}
        </Alert>
        {loadError ? (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(`errors.${loadError}`)}
          </Alert>
        ) : null}
        {!rows ? (
          loadError ? null : (
            <CircularProgress size={24} />
          )
        ) : rows.length === 0 ? (
          <Typography sx={{ color: 'text.secondary' }}>{t('admin.messages.reports.empty')}</Typography>
        ) : (
          rows.map(r => (
            <Box
              key={r.id}
              sx={{ p: 4, mb: 3, borderRadius: 1, border: theme => `1px solid ${theme.palette.divider}` }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  size='small'
                  variant='tonal'
                  color={STATUS_COLORS[r.status]}
                  label={t(`admin.messages.reports.status.${r.status}`)}
                />
                <Chip size='small' variant='outlined' label={t(`admin.messages.reason.${r.reason}`)} />
                <Typography variant='caption' sx={{ color: 'text.disabled', flex: 1 }}>
                  {formatDate(r.createdAt, lang)}
                </Typography>
                {canDecide && r.status === 'open' ? (
                  <Button
                    size='small'
                    variant='tonal'
                    onClick={() => {
                      setErrorCode(null)
                      setDecision({ status: 'resolved', note: '' })
                      setDeciding(r)
                    }}
                  >
                    {t('admin.messages.reports.decide')}
                  </Button>
                ) : null}
              </Box>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {t('admin.messages.reports.sender')}: {personLabel(r.message?.sender, lang)}
              </Typography>
              <Box sx={{ my: 2, p: 3, borderRadius: 1, bgcolor: 'action.hover', whiteSpace: 'pre-wrap' }}>
                {r.message?.body}
              </Box>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {t('admin.messages.reports.reporter')}: {personLabel(r.reporter, lang)}
                {r.details ? ` — ${r.details}` : ''}
              </Typography>
              {r.status !== 'open' ? (
                <Typography variant='body2' sx={{ mt: 1 }}>
                  {t('admin.messages.reports.decidedBy', { name: localName(r, 'resolverName', lang) })}:{' '}
                  {r.resolutionNote}
                </Typography>
              ) : null}
            </Box>
          ))
        )}
      </CardContent>

      <Dialog open={Boolean(deciding)} onClose={() => setDeciding(null)} maxWidth='sm' fullWidth>
        <DialogTitle>{t('admin.messages.reports.decide')}</DialogTitle>
        <DialogContent>
          {errorCode ? (
            <Alert severity='error' sx={{ mb: 4 }}>
              {t(`errors.${errorCode}`)}
            </Alert>
          ) : null}
          <CustomTextField
            select
            fullWidth
            sx={{ mt: 1, mb: 4 }}
            label={t('admin.messages.reports.decision')}
            value={decision.status}
            onChange={e => setDecision({ ...decision, status: e.target.value })}
          >
            <MenuItem value='resolved'>{t('admin.messages.reports.status.resolved')}</MenuItem>
            <MenuItem value='dismissed'>{t('admin.messages.reports.status.dismissed')}</MenuItem>
          </CustomTextField>
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={t('admin.messages.reports.note')}
            value={decision.note}
            onChange={e => setDecision({ ...decision, note: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button variant='tonal' color='secondary' onClick={() => setDeciding(null)} disabled={submitting}>
            {t('admin.common.cancel')}
          </Button>
          <Button variant='contained' onClick={decide} disabled={submitting}>
            {t('admin.common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default ReportsPanel
