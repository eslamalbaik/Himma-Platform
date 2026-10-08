// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import axios from 'axios'
import { useTranslation } from 'react-i18next'

// ** Core Imports
import Icon from 'src/@core/components/icon'
import BlankLayout from 'src/@core/layouts/BlankLayout'
import { useSettings } from 'src/@core/hooks/useSettings'

const formatDate = (value, lang) =>
  value ? new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-AE', { dateStyle: 'long' }) : null

// Public page "Media policies and standards" (REQUIREMENTS.md §7): the policies published in
// Settings → Policies, in the reader's language. No sign-in needed.
const PoliciesPage = () => {
  const { t, i18n } = useTranslation()
  const { settings, saveSettings } = useSettings()
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const [policies, setPolicies] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    axios
      .get('/api/policies')
      .then(response => setPolicies(response.data.data))
      .catch(() => setError(true))
  }, [])

  const toggleLanguage = () => {
    const next = lang === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(next)
    saveSettings({ ...settings, direction: next === 'en' ? 'ltr' : 'rtl' })
  }

  const body = policy => (lang === 'en' ? policy.bodyEn : policy.bodyAr)

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', py: [6, 12], px: 4 }}>
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        <Box sx={{ mb: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <img src='/images/logos/himma-logo.png' alt={t('policies.platform')} style={{ height: 80 }} />
          <Button size='small' variant='text' onClick={toggleLanguage} startIcon={<Icon icon='tabler:language' />}>
            {t(lang === 'en' ? 'language.ar' : 'language.en')}
          </Button>
        </Box>

        <Typography variant='h3' sx={{ mb: 2 }}>
          {t('policies.title')}
        </Typography>
        <Typography sx={{ mb: 8, color: 'text.secondary' }}>{t('policies.intro')}</Typography>

        {error ? <Alert severity='error'>{t('errors.server_error')}</Alert> : null}
        {!policies && !error ? <CircularProgress /> : null}
        {policies && policies.length === 0 ? <Alert severity='info'>{t('policies.none')}</Alert> : null}

        {policies && policies.length > 0 ? (
          <>
            <Card sx={{ mb: 6 }}>
              <CardContent>
                <Typography variant='h6' sx={{ mb: 3 }}>
                  {t('policies.contents')}
                </Typography>
                <Box component='ol' sx={{ m: 0, paddingInlineStart: 5, display: 'grid', gap: 1.5 }}>
                  {policies.map(policy => (
                    <li key={policy.kind}>
                      <Link href={`#${policy.kind}`} underline='hover'>
                        {t(`policies.kind.${policy.kind}`)}
                      </Link>
                    </li>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {policies.map(policy => (
              <Card key={policy.kind} id={policy.kind} sx={{ mb: 6, scrollMarginTop: 24 }}>
                <CardContent>
                  <Typography variant='h5' sx={{ mb: 1 }}>
                    {t(`policies.kind.${policy.kind}`)}
                  </Typography>
                  <Typography variant='body2' sx={{ mb: 4, color: 'text.disabled' }}>
                    {t('policies.updated', { date: formatDate(policy.publishedAt, lang), version: policy.version })}
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.9 }}>{body(policy)}</Typography>
                </CardContent>
              </Card>
            ))}
          </>
        ) : null}

        <Typography variant='body2' sx={{ mt: 8, textAlign: 'center', color: 'text.disabled' }}>
          {t('policies.footer', { year: new Date().getFullYear() })}
        </Typography>
      </Box>
    </Box>
  )
}

PoliciesPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
PoliciesPage.authGuard = false

export default PoliciesPage
