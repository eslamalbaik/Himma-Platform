// Switches between Arabic (right-to-left, `/`) and English (left-to-right, `/en`): the same page on the other
// language path, which is also the other language community. _app updates the language and direction.

// ** Next Import
import { useRouter } from 'next/router'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

export const useSwitchLanguage = () => {
  const router = useRouter()

  return lang => router.push(router.asPath, router.asPath, { locale: lang })
}

const useLanguageToggle = () => {
  const { t, i18n } = useTranslation()
  const switchLanguage = useSwitchLanguage()

  const toggle = () => switchLanguage(i18n.language === 'en' ? 'ar' : 'en')

  return { toggle, label: t(i18n.language === 'en' ? 'language.ar' : 'language.en'), lang: i18n.language }
}

export default useLanguageToggle
