// ** React Imports
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import { roleLabel } from 'src/configs/roles'
import { localName, pickLang } from 'src/views/admin/billing/format'
import { NewMessageDialog, ReportMessageDialog, errorOf, personLabel } from './dialogs'

const POLL_MS = 15 * 1000

const initials = name =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')

const time = (iso, lang) =>
  iso
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(iso)
      )
    : ''

// Conversation list on one side, the open conversation on the other (stacked on small screens).
const Inbox = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const ability = useContext(AbilityContext)
  const canWrite = Boolean(ability?.can('create', 'messages'))

  const [conversations, setConversations] = useState(null)
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [thread, setThread] = useState(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [reporting, setReporting] = useState(null)
  const [notice, setNotice] = useState(null)
  const endRef = useRef(null)

  const loadList = useCallback(
    () =>
      axios
        .get('/api/admin/messages/conversations', { params: { search: search || undefined } })
        .then(response => {
          setConversations(response.data.data)
          setLoadError(null)
        })
        .catch(err => setLoadError(errorOf(err))),
    [search]
  )

  const loadThread = useCallback(
    id =>
      axios
        .get(`/api/admin/messages/conversations/${id}`)
        .then(response => setThread(response.data.data))
        .catch(err => setActionError(errorOf(err))),
    []
  )

  useEffect(() => {
    const timer = setTimeout(loadList, 300)

    return () => clearTimeout(timer)
  }, [loadList])

  // Keep the list and the open conversation fresh while the page is open.
  useEffect(() => {
    const timer = setInterval(() => {
      loadList()
      if (activeId) loadThread(activeId)
    }, POLL_MS)

    return () => clearInterval(timer)
  }, [activeId, loadList, loadThread])

  useEffect(() => {
    if (!activeId) return
    setThread(null)
    setActionError(null)
    setNotice(null)
    loadThread(activeId).then(loadList)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [thread?.messages?.length])

  const send = () => {
    if (!body.trim()) return
    setSending(true)
    setActionError(null)
    axios
      .post(`/api/admin/messages/conversations/${activeId}/messages`, { body })
      .then(() => {
        setBody('')

        return loadThread(activeId).then(loadList)
      })
      .catch(err => setActionError(errorOf(err)))
      .finally(() => setSending(false))
  }

  const toggleBlock = () => {
    const other = thread.conversation.other
    setActionError(null)
    const request = thread.conversation.blockedByMe
      ? axios.delete(`/api/admin/messages/blocks/${other.id}`, { data: {} })
      : axios.post('/api/admin/messages/blocks', { userId: other.id })
    request
      .then(() => {
        setNotice(thread.conversation.blockedByMe ? 'admin.messages.unblocked' : 'admin.messages.blocked')

        return loadThread(activeId)
      })
      .catch(err => setActionError(errorOf(err)))
  }

  const conversation = thread?.conversation
  const other = conversation?.other
  const blocked = conversation?.blockedByMe || conversation?.blockedMe

  return (
    <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 560 }}>
      {/* Conversation list */}
      <Box
        sx={{
          width: { xs: '100%', md: 340 },
          borderInlineEnd: theme => ({ md: `1px solid ${theme.palette.divider}` }),
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 4, display: 'flex', gap: 2 }}>
          <CustomTextField
            fullWidth
            size='small'
            placeholder={t('admin.messages.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {canWrite ? (
            <Tooltip title={t('admin.messages.new')}>
              <IconButton color='primary' onClick={() => setNewOpen(true)} aria-label={t('admin.messages.new')}>
                <Icon icon='tabler:message-plus' />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
        <Divider />
        {loadError ? (
          <Alert severity='error' sx={{ m: 4 }}>
            {t(`errors.${loadError}`)}
          </Alert>
        ) : null}
        {!conversations ? (
          <Box sx={{ p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : conversations.length === 0 ? (
          <Typography sx={{ p: 4, color: 'text.secondary' }}>{t('admin.messages.empty')}</Typography>
        ) : (
          <List sx={{ p: 0, overflowY: 'auto', maxHeight: { md: 520 } }}>
            {conversations.map(c => (
              <ListItemButton
                key={c.id}
                selected={c.id === activeId}
                onClick={() => setActiveId(c.id)}
                sx={{ gap: 3, alignItems: 'flex-start', py: 3 }}
              >
                <Badge color='error' badgeContent={c.unread} invisible={!c.unread}>
                  <CustomAvatar skin='light' color={c.other?.staff ? 'primary' : 'info'} sx={{ width: 38, height: 38 }}>
                    {initials(localName(c.other, 'name', lang))}
                  </CustomAvatar>
                </Badge>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography noWrap sx={{ flex: 1, fontWeight: c.unread ? 600 : 500 }}>
                      {localName(c.other, 'name', lang)}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                      {time(c.lastMessageAt, lang)}
                    </Typography>
                  </Box>
                  <Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
                    {c.lastMessage ? `${c.lastMessage.mine ? t('admin.messages.you') : ''}${c.lastMessage.body}` : ''}
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Open conversation */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeId ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6 }}>
            <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
              <Icon icon='tabler:messages' fontSize='3rem' />
              <Typography sx={{ mt: 2, color: 'text.secondary' }}>{t('admin.messages.pick')}</Typography>
            </Box>
          </Box>
        ) : !thread ? (
          <Box sx={{ p: 6 }}>
            {actionError ? (
              <Alert severity='error'>{t(`errors.${actionError}`)}</Alert>
            ) : (
              <CircularProgress size={24} />
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='h6' noWrap>
                  {personLabel(other, lang)}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {other?.staff ? roleLabel(other.role, lang) : t('admin.messages.clientUser')}
                </Typography>
              </Box>
              {canWrite && other ? (
                <Button
                  size='small'
                  variant='tonal'
                  color={conversation.blockedByMe ? 'secondary' : 'error'}
                  startIcon={<Icon icon={conversation.blockedByMe ? 'tabler:lock-open' : 'tabler:ban'} />}
                  onClick={toggleBlock}
                >
                  {t(conversation.blockedByMe ? 'admin.messages.unblock' : 'admin.messages.block')}
                </Button>
              ) : null}
            </Box>
            <Divider />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 4, maxHeight: { md: 420 }, bgcolor: 'action.hover' }}>
              {thread.messages.map(m => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: m.mine ? 'flex-start' : 'flex-end', mb: 3 }}>
                  <Box sx={{ maxWidth: '75%' }}>
                    <Box
                      sx={{
                        px: 3.5,
                        py: 2,
                        borderRadius: 1,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        bgcolor: m.mine ? 'primary.main' : 'background.paper',
                        color: m.mine ? 'common.white' : 'text.primary',
                        boxShadow: 1
                      }}
                    >
                      {m.body}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 0.5,
                        justifyContent: m.mine ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                        {time(m.createdAt, lang)}
                      </Typography>
                      {!m.mine && canWrite ? (
                        m.reportedByMe ? (
                          <Chip size='small' variant='tonal' color='warning' label={t('admin.messages.reported')} />
                        ) : (
                          <Tooltip title={t('admin.messages.report')}>
                            <IconButton
                              size='small'
                              onClick={() => setReporting(m)}
                              aria-label={t('admin.messages.report')}
                            >
                              <Icon icon='tabler:flag' fontSize='1rem' />
                            </IconButton>
                          </Tooltip>
                        )
                      ) : null}
                    </Box>
                  </Box>
                </Box>
              ))}
              <div ref={endRef} />
            </Box>
            <Divider />
            <Box sx={{ p: 4 }}>
              {actionError ? (
                <Alert severity='error' sx={{ mb: 3 }}>
                  {t(`errors.${actionError}`)}
                </Alert>
              ) : null}
              {notice ? (
                <Alert severity='success' sx={{ mb: 3 }} onClose={() => setNotice(null)}>
                  {t(notice)}
                </Alert>
              ) : null}
              {blocked ? (
                <Alert severity='warning'>
                  {t(conversation.blockedByMe ? 'admin.messages.youBlocked' : 'admin.messages.blockedYou')}
                </Alert>
              ) : canWrite ? (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <CustomTextField
                    fullWidth
                    multiline
                    maxRows={5}
                    placeholder={t('admin.messages.typeHere')}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                  />
                  <Button
                    variant='contained'
                    onClick={send}
                    disabled={sending || !body.trim()}
                    endIcon={<Icon icon='tabler:send' style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />}
                  >
                    {t('admin.messages.send')}
                  </Button>
                </Box>
              ) : null}
            </Box>
          </>
        )}
      </Box>

      <NewMessageDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onStarted={started => {
          setNewOpen(false)
          setActiveId(started.id)
          loadList()
        }}
      />
      <ReportMessageDialog
        message={reporting}
        onClose={() => setReporting(null)}
        onReported={() => {
          setReporting(null)
          setNotice('admin.messages.reportSent')
          loadThread(activeId)
        }}
      />
    </Card>
  )
}

export default Inbox
