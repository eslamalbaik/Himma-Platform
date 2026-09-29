// ** React Import
import { useEffect } from 'react'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party Import
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import OptionsMenu from 'src/@core/components/option-menu'

// Himma supports Arabic (RTL) and English (LTR); the layout direction always follows the language.
const directionFor = lang => (lang === 'en' ? 'ltr' : 'rtl')

const LanguageDropdown = ({ settings, saveSettings }) => {
  // ** Hook
  const { i18n, t } = useTranslation()

  const handleLangItemClick = lang => {
    i18n.changeLanguage(lang)
  }

  // ** Keep the html `lang` attribute and the layout direction in line with the language
  useEffect(() => {
    document.documentElement.setAttribute('lang', i18n.language)
    const direction = directionFor(i18n.language)
    if (settings.direction !== direction) {
      saveSettings({ ...settings, direction })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  return (
    <OptionsMenu
      iconButtonProps={{ color: 'inherit' }}
      icon={<Icon fontSize='1.625rem' icon='tabler:language' />}
      menuProps={{ sx: { '& .MuiMenu-paper': { mt: 4.25, minWidth: 130 } } }}
      options={['ar', 'en'].map(lang => ({
        text: t(`language.${lang}`),
        menuItemProps: {
          sx: { py: 2 },
          selected: i18n.language === lang,
          onClick: () => handleLangItemClick(lang)
        }
      }))}
    />
  )
}

export default LanguageDropdown
