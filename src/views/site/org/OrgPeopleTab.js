// An organization admin manages the organization's people (`/api/me/organization/members`): add (they get an
// email to choose a password), change the role, switch an account off and on, send the invitation again.

// ** React Imports
import { useCallback, useEffect, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

// ** Third Party Imports
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ** Components
import { pillSx } from 'src/views/site/SiteHeader'
import VerifiedBadge from 'src/views/site/VerifiedBadge'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

const ROLES = ['tenant_member', 'tenant_admin']
const empty = { email: '', nameAr: '', nameEn: '', role: 'tenant_member' }

const OrgPeopleTab = () => {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [members, setMembers] = useState(null)
  const [failed, setFailed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setFailed(false)
    axios
      .get('/api/me/organization/members')
      .then(({ data }) => setMembers(data.data))
      .catch(() => setFailed(true))
  }, [])

  useEffect(load, [load])

  const fail = err => toast.error(t(`errors.${err.response?.data?.error?.code || 'network_error'}`))

  const add = () => {
    setBusy(true)
    setError(null)
    axios
      .post('/api/me/organization/members', form)
      .then(({ data }) => {
        setMembers(prev => [...prev, data.data])
        setAdding(false)
        setForm(empty)
        toast.success(t('community.team.added'))
      })
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setBusy(false))
  }

  const update = (member, changes) => {
    axios
      .put(`/api/me/organization/members/${member.id}`, changes)
      .then(({ data }) => setMembers(prev => prev.map(other => (other.id === member.id ? data.data : other))))
      .catch(fail)
  }

  const resend = member => {
    axios
      .post(`/api/me/organization/members/${member.id}/resend-invitation`)
      .then(() => toast.success(t('community.team.resent')))
      .catch(fail)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, mb: 3 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {t('community.team.help')}
        </Typography>
        <Button variant='contained' size='small' onClick={() => setAdding(true)} sx={pillSx}>
          {t('community.team.add')}
        </Button>
      </Box>

      {failed ? (
        <Alert severity='error' action={<Button onClick={load}>{t('site.retry')}</Button>}>
          {t('site.feed.failed')}
        </Alert>
      ) : null}
      {!members && !failed ? <Skeleton height={120} /> : null}

      {members?.map(member => {
        const self = member.id === user?.id
        const name = i18n.language === 'en' ? member.nameEn : member.nameAr

        return (
          <Box
            key={member.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 3,
              py: 3,
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              opacity: member.status === 'disabled' ? 0.6 : 1
            }}
          >
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontWeight: 500 }}>
                {name}
                <VerifiedBadge verified={member.verified} />
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }} dir='ltr' align='start'>
                {member.email}
              </Typography>
            </Box>
            {member.status === 'disabled' ? <Chip size='small' label={t('community.team.disabled')} /> : null}
            <TextField
              select
              size='small'
              value={member.role}
              disabled={self}
              onChange={e => update(member, { role: e.target.value })}
              sx={{ minWidth: 150 }}
            >
              {ROLES.map(role => (
                <MenuItem key={role} value={role}>
                  {t(`community.roles.${role}`)}
                </MenuItem>
              ))}
            </TextField>
            {!member.lastLoginAt && member.status === 'active' ? (
              <Button size='small' color='secondary' onClick={() => resend(member)}>
                {t('community.team.resend')}
              </Button>
            ) : null}
            {!self ? (
              <Button
                size='small'
                color={member.status === 'active' ? 'error' : 'success'}
                onClick={() => update(member, { status: member.status === 'active' ? 'disabled' : 'active' })}
              >
                {t(member.status === 'active' ? 'community.team.disable' : 'community.team.enable')}
              </Button>
            ) : null}
          </Box>
        )
      })}

      <Dialog open={adding} onClose={() => setAdding(false)} maxWidth='xs' fullWidth>
        <DialogTitle>{t('community.team.add')}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 4, pt: '8px !important' }}>
          {error ? <Alert severity='error'>{t(`errors.${error}`)}</Alert> : null}
          <TextField
            label={t('community.team.email')}
            type='email'
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            inputProps={{ dir: 'ltr' }}
          />
          <TextField
            label={t('community.team.nameAr')}
            value={form.nameAr}
            onChange={e => setForm({ ...form, nameAr: e.target.value })}
          />
          <TextField
            label={t('community.team.nameEn')}
            value={form.nameEn}
            onChange={e => setForm({ ...form, nameEn: e.target.value })}
            inputProps={{ dir: 'ltr' }}
          />
          <TextField
            select
            label={t('community.team.role')}
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.map(role => (
              <MenuItem key={role} value={role}>
                {t(`community.roles.${role}`)}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {t('community.team.inviteNote')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setAdding(false)}>
            {t('site.cancel')}
          </Button>
          <Button variant='contained' disabled={busy} onClick={add}>
            {t('community.team.send')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default OrgPeopleTab
