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
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import { formatDateTime } from 'src/views/admin/events/helpers'

const errorOf = err => err.response?.data?.error?.code || 'network_error'

const StatusChip = ({ policy }) => {
  const { t } = useTranslation()

  return (
    <Chip
      size='small'
      variant='tonal'
      color={policy.isPublished ? 'success' : 'secondary'}
      label={t(policy.isPublished ? 'admin.settings.policies.published' : 'admin.settings.policies.draft')}
    />
  )
}

// Every saved text of one policy, newest first (policy_versions).
const HistoryDialog = ({ kind, onClose }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const [versions, setVersions] = useState(null)

  useEffect(() => {
    if (!kind) return
    setVersions(null)
    axios
      .get(`/api/admin/policies/${kind}/versions`)
      .then(response => setVersions(response.data.data))
      .catch(() => setVersions([]))
  }, [kind])

  return (
    <Dialog open={Boolean(kind)} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {kind ? t('admin.settings.policies.historyTitle', { policy: t(`policies.kind.${kind}`) }) : null}
      </DialogTitle>
      <DialogContent>
        {!versions ? (
          <CircularProgress size={28} />
        ) : versions.length === 0 ? (
          <Typography sx={{ color: 'text.disabled' }}>{t('admin.settings.policies.noHistory')}</Typography>
        ) : (
          versions.map(version => (
            <Box key={version.version} sx={{ mb: 5 }}>
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontWeight: 500 }}>
                  {t('admin.settings.policies.version', { version: version.version })}
                </Typography>
                <StatusChip policy={version} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {formatDateTime(version.createdAt, lang)} ·{' '}
                  {lang === 'en' ? version.editorNameEn : version.editorNameAr}
                </Typography>
              </Box>
              <Grid container spacing={3}>
                {['Ar', 'En'].map(suffix => (
                  <Grid item xs={12} md={6} key={suffix}>
                    <Typography
                      variant='body2'
                      dir={suffix === 'Ar' ? 'rtl' : 'ltr'}
                      sx={{ whiteSpace: 'pre-line', p: 3, borderRadius: 1, bgcolor: 'action.hover' }}
                    >
                      {version[`body${suffix}`] || '-'}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ mt: 5 }} />
            </Box>
          ))
        )}
      </DialogContent>
    </Dialog>
  )
}

// Settings → Policies (REQUIREMENTS.md §7): the media policies shown on the public /policies page.
const PoliciesPage = () => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const ability = useContext(AbilityContext)
  const canUpdate = Boolean(ability?.can('update', 'settings'))

  const [policies, setPolicies] = useState(null)
  const [selected, setSelected] = useState('publishing')
  const [draft, setDraft] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)
  const [history, setHistory] = useState(null)

  useEffect(() => {
    axios
      .get('/api/admin/policies')
      .then(response => setPolicies(response.data.data))
      .catch(err => setErrorCode(errorOf(err)))
  }, [])

  const current = policies?.find(policy => policy.kind === selected)

  useEffect(() => {
    if (!current) return
    setDraft({ bodyAr: current.bodyAr || '', bodyEn: current.bodyEn || '', isPublished: current.isPublished })
    setErrorCode(null)
  }, [current])

  const save = () => {
    setSubmitting(true)
    setErrorCode(null)
    axios
      .put(`/api/admin/policies/${selected}`, draft)
      .then(response => {
        setPolicies(list => list.map(policy => (policy.kind === selected ? response.data.data : policy)))
        setToast(true)
      })
      .catch(err => setErrorCode(errorOf(err)))
      .finally(() => setSubmitting(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={t('admin.settings.policies.title')}
            subheader={t('admin.settings.policies.subtitle')}
            action={
              <Button
                variant='tonal'
                size='small'
                href='/policies'
                target='_blank'
                rel='noopener'
                startIcon={<Icon icon='tabler:external-link' fontSize='1.125rem' />}
              >
                {t('admin.settings.policies.viewPublic')}
              </Button>
            }
          />
        </Card>
      </Grid>

      {!policies ? (
        <Grid item xs={12}>
          {errorCode ? <Alert severity='error'>{t(`errors.${errorCode}`)}</Alert> : <CircularProgress size={28} />}
        </Grid>
      ) : (
        <>
          <Grid item xs={12} md={4}>
            <Card>
              <List disablePadding>
                {policies.map(policy => (
                  <ListItemButton
                    key={policy.kind}
                    selected={policy.kind === selected}
                    onClick={() => setSelected(policy.kind)}
                    sx={{ gap: 2 }}
                  >
                    <ListItemText
                      primary={t(`policies.kind.${policy.kind}`)}
                      secondary={
                        policy.version > 0
                          ? t('admin.settings.policies.version', { version: policy.version })
                          : t('admin.settings.policies.notWritten')
                      }
                    />
                    <StatusChip policy={policy} />
                  </ListItemButton>
                ))}
              </List>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {current && draft ? (
              <Card>
                <CardHeader
                  title={t(`policies.kind.${current.kind}`)}
                  subheader={
                    current.updatedAt
                      ? t('admin.settings.policies.lastUpdated', {
                          date: formatDateTime(current.updatedAt, lang),
                          name: lang === 'en' ? current.editorNameEn : current.editorNameAr
                        })
                      : null
                  }
                  action={
                    current.version > 0 ? (
                      <Button size='small' onClick={() => setHistory(current.kind)}>
                        {t('admin.settings.policies.history')}
                      </Button>
                    ) : null
                  }
                />
                <CardContent>
                  {errorCode ? (
                    <Alert severity='error' sx={{ mb: 4 }}>
                      {t(`errors.${errorCode}`)}
                    </Alert>
                  ) : null}
                  <Grid container spacing={4}>
                    <Grid item xs={12}>
                      <CustomTextField
                        fullWidth
                        multiline
                        minRows={8}
                        label={t('admin.settings.policies.textAr')}
                        value={draft.bodyAr}
                        onChange={e => setDraft({ ...draft, bodyAr: e.target.value })}
                        disabled={!canUpdate}
                        inputProps={{ dir: 'rtl' }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <CustomTextField
                        fullWidth
                        multiline
                        minRows={8}
                        label={t('admin.settings.policies.textEn')}
                        value={draft.bodyEn}
                        onChange={e => setDraft({ ...draft, bodyEn: e.target.value })}
                        disabled={!canUpdate}
                        inputProps={{ dir: 'ltr' }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={draft.isPublished}
                            onChange={e => setDraft({ ...draft, isPublished: e.target.checked })}
                            disabled={!canUpdate}
                          />
                        }
                        label={t('admin.settings.policies.publishSwitch')}
                      />
                      <Typography variant='body2' sx={{ color: 'text.secondary', paddingInlineStart: 12 }}>
                        {t('admin.settings.policies.publishHelp')}
                      </Typography>
                    </Grid>
                    {canUpdate ? (
                      <Grid item xs={12}>
                        <Button variant='contained' onClick={save} disabled={submitting}>
                          {t('admin.common.save')}
                        </Button>
                      </Grid>
                    ) : null}
                  </Grid>
                </CardContent>
              </Card>
            ) : null}
          </Grid>
        </>
      )}

      <HistoryDialog kind={history} onClose={() => setHistory(null)} />
      <Snackbar
        open={toast}
        autoHideDuration={4000}
        onClose={() => setToast(false)}
        message={t('admin.common.saved')}
      />
    </Grid>
  )
}

PoliciesPage.acl = { action: 'read', subject: 'settings' }

export default PoliciesPage
