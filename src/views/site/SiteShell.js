// Frame of every public-site page (home, story, editor, my stories): the top bar, the page and a
// small footer. Members and guests see it; staff work in the dashboard instead.

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
import SiteHeader from 'src/views/site/SiteHeader'
import SiteFooter from 'src/views/site/SiteFooter'

// Texts load from /locales in the browser only. The static HTML and the first browser render are both the
// spinner, so React hydrates without a mismatch and translation keys never show on screen.
export const useTextsReady = () => {
  const { ready } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return mounted && ready
}

const SiteShell = ({ title, description, header, footer = true, children }) => {
  const textsReady = useTextsReady()
  const { t } = useTranslation()

  if (!textsReady) return <Spinner />

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper' }}>
      <Head>
        <title>{title ? `${title} | ${t('site.name')}` : t('site.meta.title')}</title>
        <meta name='description' content={description || t('site.meta.description')} />
      </Head>
      {header ?? <SiteHeader />}
      <Box component='main' sx={{ flex: 1 }}>
        {children}
      </Box>
      {footer ? <SiteFooter /> : null}
    </Box>
  )
}

export default SiteShell
