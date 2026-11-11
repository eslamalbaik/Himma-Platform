// Where an organization admin runs their organization on the public site: its profile, its people and its
// events and live broadcasts. Only `tenant_admin` has the `team` and `broadcasts` permissions.

// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import SiteShell from 'src/views/site/SiteShell'
import OrgPeopleTab from 'src/views/site/org/OrgPeopleTab'
import OrgProfileTab from 'src/views/site/org/OrgProfileTab'
import OrgBroadcastsTab from 'src/views/site/org/OrgBroadcastsTab'

// ** Utils
import { serifFont } from 'src/views/site/storyText'

const OrganizationPage = () => {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('profile')

  return (
    <SiteShell title={t('community.org.title')}>
      <Box sx={{ maxWidth: 820, mx: 'auto', px: { xs: 4, sm: 6 }, py: { xs: 8, md: 12 } }}>
        <Typography
          component='h1'
          sx={{ fontFamily: serifFont(i18n.language), fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 600, mb: 6 }}
        >
          {t('community.org.title')}
        </Typography>
        <Tabs
          value={tab}
          onChange={(e, value) => setTab(value)}
          variant='scrollable'
          scrollButtons={false}
          sx={{ mb: 6, borderBottom: theme => `1px solid ${theme.palette.divider}` }}
        >
          <Tab value='profile' label={t('community.org.tabs.profile')} />
          <Tab value='people' label={t('community.org.tabs.people')} />
          <Tab value='broadcasts' label={t('community.org.tabs.broadcasts')} />
        </Tabs>

        {tab === 'profile' ? <OrgProfileTab /> : null}
        {tab === 'people' ? <OrgPeopleTab /> : null}
        {tab === 'broadcasts' ? <OrgBroadcastsTab /> : null}
      </Box>
    </SiteShell>
  )
}

OrganizationPage.getLayout = page => page
OrganizationPage.acl = { action: 'manage', subject: 'team' }

export default OrganizationPage
