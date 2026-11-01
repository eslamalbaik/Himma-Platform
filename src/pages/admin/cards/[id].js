// One smart card: its profile, links, books (ISBN), events with their programme, the QR code / NFC address,
// and readers' requests and subscribers. `/admin/cards/new` creates a card.

// ** React Imports
import { useCallback, useContext, useEffect, useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Icon from 'src/@core/components/icon'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import ConfirmDialog from 'src/views/admin/billing/ConfirmDialog'
import { localName, pickLang } from 'src/views/admin/billing/format'
import { BooksTab, EventsTab, LinksTab, ProfileTab, emptyCard } from 'src/views/admin/cards/CardFormTabs'
import { RequestsTab, SubscribersTab } from 'src/views/admin/cards/ReadersTab'
import ShareTab from 'src/views/admin/cards/ShareTab'

const FORM_TABS = ['profile', 'links', 'books', 'events']
const SAVED_TABS = ['share', 'requests', 'subscribers']

// The API sends null for empty texts; the inputs want ''.
const toForm = card => {
  const form = { ...emptyCard }
  Object.keys(emptyCard).forEach(key => {
    if (card[key] !== null && card[key] !== undefined) form[key] = card[key]
  })

  return form
}

const toPayload = form => ({
  ...form,
  books: form.books.map(book => ({ ...book, year: book.year === '' ? null : book.year })),
  events: form.events.map(event => ({
    ...event,
    programme: event.programme.map(step => ({ ...step, minute: Number(step.minute) }))
  }))
})

const CardEditorPage = () => {
  const { t, i18n } = useTranslation()
  const lang = pickLang(i18n)
  const router = useRouter()
  const { id } = router.query
  const isNew = id === 'new'
  const ability = useContext(AbilityContext)
  const canSave = Boolean(ability?.can(isNew ? 'create' : 'update', 'cards'))

  const [card, setCard] = useState(null)
  const [form, setForm] = useState(emptyCard)
  const [tab, setTab] = useState('profile')
  const [loadError, setLoadError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(() => {
    if (!id || isNew) return
    axios
      .get(`/api/admin/cards/${id}`)
      .then(({ data }) => {
        setCard(data.data)
        setForm(toForm(data.data))
      })
      .catch(err => setLoadError(err.response?.data?.error?.code || 'network_error'))
  }, [id, isNew])

  useEffect(load, [load])

  useEffect(() => {
    const wanted = router.query.tab
    if ([...FORM_TABS, ...SAVED_TABS].includes(wanted)) setTab(wanted)
  }, [router.query.tab])

  const set = patch => setForm(current => ({ ...current, ...patch }))

  const save = () => {
    setSaving(true)
    setErrorCode(null)
    const request = isNew
      ? axios.post('/api/admin/cards', toPayload(form))
      : axios.put(`/api/admin/cards/${id}`, toPayload(form))
    request
      .then(({ data }) => {
        setToast('admin.common.saved')
        if (isNew) router.replace(`/admin/cards/${data.data.id}/?tab=share`)
        else {
          setCard(data.data)
          setForm(toForm(data.data))
        }
      })
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSaving(false))
  }

  const remove = () => {
    setDeleting(true)
    axios
      .delete(`/api/admin/cards/${id}`, { data: {} })
      .then(() => router.replace('/admin/cards/'))
      .catch(err => {
        setErrorCode(err.response?.data?.error?.code || 'network_error')
        setDeleting(false)
        setConfirmDelete(false)
      })
  }

  if (loadError) return <Alert severity='error'>{t(`errors.${loadError}`)}</Alert>

  if (!isNew && !card) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
        <CircularProgress />
      </Box>
    )
  }

  const tabs = isNew ? FORM_TABS : [...FORM_TABS, ...SAVED_TABS]
  const counts = { requests: card?.newRequests, subscribers: card?.subscribers }

  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
        <Button component={Link} href='/admin/cards/' size='small' startIcon={<Icon icon='tabler:arrow-back-up' />}>
          {t('admin.cards.backToList')}
        </Button>
        <Typography variant='h5' sx={{ flex: 1, minWidth: 200 }}>
          {isNew ? t('admin.cards.add') : localName(card, 'name', lang)}
        </Typography>
        {card ? (
          <Chip
            size='small'
            skin='light'
            color={card.status === 'published' ? 'success' : 'secondary'}
            label={t(`admin.cards.statuses.${card.status}`)}
          />
        ) : null}
        {!isNew && ability?.can('delete', 'cards') ? (
          <Button color='error' variant='tonal' onClick={() => setConfirmDelete(true)}>
            {t('admin.common.delete')}
          </Button>
        ) : null}
        {canSave ? (
          <Button variant='contained' onClick={save} disabled={saving} startIcon={<Icon icon='tabler:device-floppy' />}>
            {t('admin.common.save')}
          </Button>
        ) : null}
      </CardContent>
      {errorCode ? (
        <Alert severity='error' sx={{ mx: 6, mb: 2 }}>
          {t(`errors.${errorCode}`)}
        </Alert>
      ) : null}
      <TabContext value={tab}>
        <Box sx={{ px: 6, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
          <TabList variant='scrollable' scrollButtons='auto' onChange={(_, value) => setTab(value)}>
            {tabs.map(value => (
              <Tab
                key={value}
                value={value}
                label={
                  counts[value]
                    ? `${t(`admin.cards.tabs.${value}`)} (${counts[value]})`
                    : t(`admin.cards.tabs.${value}`)
                }
              />
            ))}
          </TabList>
        </Box>
        <CardContent>
          <TabPanel value='profile' sx={{ p: 0 }}>
            <ProfileTab form={form} set={set} disabled={!canSave} />
          </TabPanel>
          <TabPanel value='links' sx={{ p: 0 }}>
            <LinksTab form={form} set={set} disabled={!canSave} />
          </TabPanel>
          <TabPanel value='books' sx={{ p: 0 }}>
            <BooksTab form={form} set={set} disabled={!canSave} />
          </TabPanel>
          <TabPanel value='events' sx={{ p: 0 }}>
            <EventsTab form={form} set={set} disabled={!canSave} />
          </TabPanel>
          {card ? (
            <>
              <TabPanel value='share' sx={{ p: 0 }}>
                <ShareTab card={card} />
              </TabPanel>
              <TabPanel value='requests' sx={{ p: 0 }}>
                <RequestsTab cardId={card.id} canUpdate={Boolean(ability?.can('update', 'cards'))} onChanged={load} />
              </TabPanel>
              <TabPanel value='subscribers' sx={{ p: 0 }}>
                <SubscribersTab cardId={card.id} />
              </TabPanel>
            </>
          ) : null}
        </CardContent>
      </TabContext>
      <ConfirmDialog
        open={confirmDelete}
        title={t('admin.cards.deleteTitle')}
        message={t('admin.cards.deleteMessage', { name: localName(card, 'name', lang) })}
        confirmLabel={t('admin.common.delete')}
        submitting={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
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

CardEditorPage.acl = { action: 'read', subject: 'cards' }

export default CardEditorPage
