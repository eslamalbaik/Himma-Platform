// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import Inbox from 'src/views/admin/messages/Inbox'
import ReportsPanel from 'src/views/admin/messages/ReportsPanel'

// Private messages (MSG-01..06): the user's own conversations, and reported messages for moderators.
const MessagesPage = () => {
  const { t } = useTranslation()
  const [tab, setTab] = useState('inbox')

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 1 }}>
        {t('admin.messages.title')}
      </Typography>
      <Typography sx={{ mb: 4, color: 'text.secondary' }}>{t('admin.messages.subtitle')}</Typography>
      <Tabs value={tab} onChange={(e, value) => setTab(value)} sx={{ mb: 4 }}>
        <Tab value='inbox' label={t('admin.messages.tabInbox')} />
        <Tab value='reports' label={t('admin.messages.tabReports')} />
      </Tabs>
      {tab === 'inbox' ? <Inbox /> : <ReportsPanel />}
    </Box>
  )
}

MessagesPage.acl = { action: 'read', subject: 'messages' }

export default MessagesPage
