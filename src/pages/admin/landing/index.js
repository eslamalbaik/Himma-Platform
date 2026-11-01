// The landing page's pricing and testimonials sections: texts, on/off switch, plans and student opinions.
// Public side: src/views/site/landing, data: GET /api/public/landing.

// ** React Imports
import { useContext, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Custom Components
import { AbilityContext } from 'src/layouts/components/acl/Can'
import SectionSettingsCard from 'src/views/admin/landing/SectionSettingsCard'
import PlansTab from 'src/views/admin/landing/PlansTab'
import TestimonialsTab from 'src/views/admin/landing/TestimonialsTab'

const LandingPage = () => {
  const { t } = useTranslation()
  const ability = useContext(AbilityContext)
  const can = action => Boolean(ability?.can(action, 'landing'))
  const [tab, setTab] = useState('pricing')

  return (
    <TabContext value={tab}>
      <TabList onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab value='pricing' label={t('admin.landing.tabs.pricing')} />
        <Tab value='testimonials' label={t('admin.landing.tabs.testimonials')} />
      </TabList>
      <TabPanel value='pricing' sx={{ p: 0 }}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <SectionSettingsCard section='pricing' canUpdate={can('update')} />
          </Grid>
          <Grid item xs={12}>
            <PlansTab canUpdate={can('update')} />
          </Grid>
        </Grid>
      </TabPanel>
      <TabPanel value='testimonials' sx={{ p: 0 }}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <SectionSettingsCard section='testimonials' canUpdate={can('update')} />
          </Grid>
          <Grid item xs={12}>
            <TestimonialsTab canCreate={can('create')} canUpdate={can('update')} canDelete={can('delete')} />
          </Grid>
        </Grid>
      </TabPanel>
    </TabContext>
  )
}

LandingPage.acl = { action: 'read', subject: 'landing' }

export default LandingPage
