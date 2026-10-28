// Switches the interface between Arabic (right-to-left) and English (left-to-right).

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Hooks
import { useSettings } from 'src/@core/hooks/useSettings'

const useLanguageToggle = () => {
  const { t, i18n } = useTranslation()
  const { settings, saveSettings } = useSettings()

  const toggle = () => {
    const lang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(lang)
    saveSettings({ ...settings, direction: lang === 'en' ? 'ltr' : 'rtl' })
  }

  return { toggle, label: t(i18n.language === 'en' ? 'language.ar' : 'language.en'), lang: i18n.language }
}

export default useLanguageToggle
