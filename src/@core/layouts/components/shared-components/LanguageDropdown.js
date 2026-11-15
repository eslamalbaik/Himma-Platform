// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party Import
import { useTranslation } from 'react-i18next'

// ** Custom Components Imports
import OptionsMenu from 'src/@core/components/option-menu'

// ** Hooks
import { useSwitchLanguage } from 'src/views/site/useLanguageToggle'

// Hinnah supports Arabic (RTL, `/`) and English (LTR, `/en`). Choosing a language opens the same page on that
// language's path; _app then sets the language and the layout direction.
const LanguageDropdown = () => {
  // ** Hook
  const { i18n, t } = useTranslation()
  const handleLangItemClick = useSwitchLanguage()

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
