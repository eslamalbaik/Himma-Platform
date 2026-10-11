// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Layout & Components
import BlankLayout from 'src/@core/layouts/BlankLayout'
import { useSettings } from 'src/@core/hooks/useSettings'
import LanguageDropdown from 'src/@core/layouts/components/shared-components/LanguageDropdown'

// The public "Media policies and standards" page (REQUIREMENTS.md §7). Anyone can read it, signed in or not.
// Texts come from Settings → Policies; a policy appears once it has text in at least one language.
const ORDER = [
  'publishing',
  'advertising',
  'corrections',
  'copyright',
  'sponsored',
  'comments',
  'ai',
  'privacy',
  'complaints'
]

const PoliciesPage = () => {
  const { t, i18n } = useTranslation()
  const { settings, saveSettings } = useSettings()
  const lang = i18n.language === 'en' ? 'en' : 'ar'
  const other = lang === 'en' ? 'ar' : 'en'
  const [data, setData] = useState(null)
  const [errorCode, setErrorCode] = useState(null)

  useEffect(() => {
    axios
      .get('/api/site/policies')
      .then(response => setData(response.data.data))
      .catch(err => setErrorCode(err.response?.data?.error?.code || 'network_error'))
  }, [])

  const keys = data ? ORDER.filter(key => data.policies[key]) : []

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 6, md: 12 }, px: 4, display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 860 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 6 }}>
          <Box component='img' src='/images/logos/himma-logo.png' alt={t('site.name')} sx={{ height: 44 }} />
          <Box sx={{ flexGrow: 1 }} />
          <LanguageDropdown settings={settings} saveSettings={saveSettings} />
        </Box>

        <Typography variant='h3' sx={{ mb: 2 }}>
          {t('site.policies.title')}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 6 }}>{t('site.policies.subtitle')}</Typography>

        {errorCode ? <Alert severity='error'>{t(`errors.${errorCode}`)}</Alert> : null}
        {!data && !errorCode ? <CircularProgress size={28} /> : null}

        {data && keys.length === 0 ? <Alert severity='info'>{t('site.policies.empty')}</Alert> : null}

        {keys.length ? (
          <Card sx={{ mb: 6 }}>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                {t('site.policies.contents')}
              </Typography>
              <Box component='ol' sx={{ m: 0, ps: 5 }}>
                {keys.map(key => (
                  <li key={key}>
                    <Typography component='a' href={`#${key}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                      {t(`policies.${key}`)}
                    </Typography>
                  </li>
                ))}
              </Box>
            </CardContent>
          </Card>
        ) : null}

        {keys.map(key => {
          const policy = data.policies[key]
          const text = policy[lang]?.trim() ? policy[lang] : policy[other]
          const fallback = !policy[lang]?.trim()

          return (
            <Card key={key} id={key} sx={{ mb: 4, scrollMarginTop: 24 }}>
              <CardContent>
                <Typography variant='h5' sx={{ mb: 3 }}>
                  {t(`policies.${key}`)}
                </Typography>
                {fallback ? (
                  <Alert severity='info' sx={{ mb: 3 }}>
                    {t('site.policies.onlyIn', { language: t(`site.languageName.${other}`) })}
                  </Alert>
                ) : null}
                <Typography
                  dir={fallback ? (other === 'en' ? 'ltr' : 'rtl') : undefined}
                  sx={{ whiteSpace: 'pre-line', lineHeight: 1.9 }}
                >
                  {text}
                </Typography>
                {policy.updatedAt ? (
                  <Typography variant='body2' sx={{ color: 'text.disabled', mt: 3 }}>
                    {t('site.policies.updated', {
                      date: new Date(policy.updatedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-EG')
                    })}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          )
        })}

        {data ? (
          <>
            <Divider sx={{ my: 6 }} />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {t('site.policies.sponsoredNote', { label: data.sponsoredLabel[lang] })}
            </Typography>
          </>
        ) : null}
      </Box>
    </Box>
  )
}

PoliciesPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
PoliciesPage.authGuard = false
PoliciesPage.guestGuard = false

export default PoliciesPage
