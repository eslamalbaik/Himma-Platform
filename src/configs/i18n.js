import i18n from 'i18next'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

// The language comes from the path: `/en/...` is English (the English community), everything else Arabic.
// See `i18n` in next.config.js; _app keeps i18next in line when the path changes.
const languageFromPath = () =>
  typeof window !== 'undefined' && /^\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'ar'

i18n

  // Enables the i18next backend
  .use(Backend)

  // Enables the hook initialization module
  .use(initReactI18next)
  .init({
    // Himma is bilingual: Arabic (default, RTL) and English (LTR). See CLAUDE.md.
    supportedLngs: ['ar', 'en'],
    lng: languageFromPath(),
    fallbackLng: 'ar',
    backend: {
      /* translation file path */
      loadPath: '/locales/{{lng}}.json'
    },
    debug: false,
    keySeparator: false,
    react: {
      useSuspense: false
    },
    interpolation: {
      escapeValue: false,
      formatSeparator: ','
    }
  })

export default i18n
