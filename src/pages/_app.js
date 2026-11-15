// ** Next Imports
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Router } from 'next/router'

// ** React Imports
import { useEffect } from 'react'

// ** Loader Import
import NProgress from 'nprogress'

// ** Emotion Imports
import { CacheProvider } from '@emotion/react'

// ** Config Imports
import i18n from 'src/configs/i18n'
import { setRoute } from 'src/configs/community'
import { defaultACLObj } from 'src/configs/acl'
import themeConfig from 'src/configs/themeConfig'

// ** Third Party Import
import { Toaster } from 'react-hot-toast'

// ** Component Imports
import UserLayout from 'src/layouts/UserLayout'
import AclGuard from 'src/@core/components/auth/AclGuard'
import ThemeComponent from 'src/@core/theme/ThemeComponent'
import AuthGuard from 'src/@core/components/auth/AuthGuard'
import GuestGuard from 'src/@core/components/auth/GuestGuard'

// ** Spinner Import
import Spinner from 'src/@core/components/spinner'

// ** Contexts
import { AuthProvider } from 'src/context/AuthContext'
import { SettingsConsumer, SettingsProvider } from 'src/@core/context/settingsContext'

// ** Styled Components
import ReactHotToast from 'src/@core/styles/libs/react-hot-toast'

// ** Utils Imports
import { createEmotionCache } from 'src/@core/utils/create-emotion-cache'

// ** Prismjs Styles (the Prism code itself loads with the demo pages)
import 'prismjs/themes/prism-tomorrow.css'

// ** React Perfect Scrollbar Style
import 'react-perfect-scrollbar/dist/css/styles.css'

// ** Icons used by Himma (regenerate with `npm run build:icons:himma`)
import 'src/iconify-bundle/icons-himma'

// ** Global css styles
import '../../styles/globals.css'

const clientSideEmotionCache = createEmotionCache()

// The Vuexy reference pages need Redux, the mocked API and every icon. They are loaded only
// when one of those pages is opened, so Himma pages stay small.
const DemoProvider = dynamic(() => import('src/@core/demo/DemoProvider'), { ssr: false, loading: () => <Spinner /> })

const HIMMA_ROUTES = [
  '/admin',
  '/billing',
  '/login',
  '/forgot-password',
  '/register',
  '/set-password',
  '/set-password',
  '/join',
  '/stories',
  '/write',
  '/me',
  '/u',
  '/org',
  '/magazine',
  '/401',
  '/404',
  '/500'
]

const isDemoRoute = pathname =>
  pathname !== '/' &&
  pathname !== '/_error' &&
  !HIMMA_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))

// ** Pace Loader
if (themeConfig.routingLoader) {
  Router.events.on('routeChangeStart', () => {
    NProgress.start()
  })
  Router.events.on('routeChangeError', () => {
    NProgress.done()
  })
  Router.events.on('routeChangeComplete', () => {
    NProgress.done()
  })
}

const Guard = ({ children, authGuard, guestGuard }) => {
  if (guestGuard) {
    return <GuestGuard fallback={<Spinner />}>{children}</GuestGuard>
  } else if (!guestGuard && !authGuard) {
    return <>{children}</>
  } else {
    return <AuthGuard fallback={<Spinner />}>{children}</AuthGuard>
  }
}

// The path's language (`/` Arabic, `/en` English) is the interface language and the layout direction.
const LocaleSync = ({ locale, settings, saveSettings }) => {
  useEffect(() => {
    if (i18n.language !== locale) i18n.changeLanguage(locale)
    document.documentElement.setAttribute('lang', locale)
    const direction = locale === 'en' ? 'ltr' : 'rtl'
    if (settings.direction !== direction) saveSettings({ ...settings, direction })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  return null
}

// ** Configure JSS & ClassName
const App = props => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps, router } = props

  // Which language community API requests are about (src/configs/community.js).
  setRoute(router.locale)

  // Variables
  const contentHeightFixed = Component.contentHeightFixed ?? false

  const getLayout =
    Component.getLayout ?? (page => <UserLayout contentHeightFixed={contentHeightFixed}>{page}</UserLayout>)
  const setConfig = Component.setConfig ?? undefined
  const authGuard = Component.authGuard ?? true
  const guestGuard = Component.guestGuard ?? false
  const aclAbilities = Component.acl ?? defaultACLObj

  const page = getLayout(<Component {...pageProps} />)

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>{themeConfig.templateName}</title>
        <meta
          name='description'
          content={`${themeConfig.templateName} – Material Design React Admin Dashboard Template – is the most developer friendly & highly customizable Admin Dashboard Template based on MUI v5.`}
        />
        <meta name='keywords' content='Material Design, MUI, Admin Template, React Admin Template' />
        <meta name='viewport' content='initial-scale=1, width=device-width' />
      </Head>

      <AuthProvider>
        <SettingsProvider {...(setConfig ? { pageSettings: setConfig() } : {})}>
          <SettingsConsumer>
            {({ settings, saveSettings }) => {
              return (
                <ThemeComponent settings={settings}>
                  <LocaleSync locale={router.locale} settings={settings} saveSettings={saveSettings} />
                  <Guard authGuard={authGuard} guestGuard={guestGuard}>
                    <AclGuard aclAbilities={aclAbilities} guestGuard={guestGuard} authGuard={authGuard}>
                      {isDemoRoute(router.pathname) ? <DemoProvider>{page}</DemoProvider> : page}
                    </AclGuard>
                  </Guard>
                  <ReactHotToast>
                    <Toaster position={settings.toastPosition} toastOptions={{ className: 'react-hot-toast' }} />
                  </ReactHotToast>
                </ThemeComponent>
              )
            }}
          </SettingsConsumer>
        </SettingsProvider>
      </AuthProvider>
    </CacheProvider>
  )
}

export default App
