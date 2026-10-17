// Public landing page. Organizations sign in from here (src/configs/landing.js); signed-in users see a
// link to their dashboard instead. Sections: src/views/landing, texts: `landing.*` in public/locales.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Import
import Head from 'next/head'

// ** MUI Imports
import Box from '@mui/material/Box'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import Spinner from 'src/@core/components/spinner'
import BlankLayout from 'src/@core/layouts/BlankLayout'
import LandingHeader from 'src/views/landing/LandingHeader'
import LandingHero from 'src/views/landing/LandingHero'
import LandingSections from 'src/views/landing/LandingSections'
import LandingFooter from 'src/views/landing/LandingFooter'

const Home = () => {
  const { t, ready } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Texts load from /locales in the browser only. The static HTML and the first browser render are both the
  // spinner, so React hydrates without a mismatch and translation keys never show on screen.
  if (!mounted || !ready) return <Spinner />

  return (
    <Box id='top' sx={{ backgroundColor: 'background.paper' }}>
      <Head>
        <title>{t('landing.meta.title')}</title>
        <meta name='description' content={t('landing.meta.description')} />
      </Head>
      <LandingHeader />
      <Box component='main'>
        <LandingHero />
        <LandingSections />
      </Box>
      <LandingFooter />
    </Box>
  )
}

Home.getLayout = page => <BlankLayout>{page}</BlankLayout>
Home.authGuard = false

export default Home
