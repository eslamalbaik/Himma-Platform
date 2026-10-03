// ** React Imports
import { useState } from 'react'

// ** MUI Components
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import InputAdornment from '@mui/material/InputAdornment'
import MuiFormControlLabel from '@mui/material/FormControlLabel'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party Imports
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'
import { useSettings } from 'src/@core/hooks/useSettings'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Styled Components
const FormControlLabel = styled(MuiFormControlLabel)(({ theme }) => ({
  '& .MuiFormControlLabel-label': {
    color: theme.palette.text.secondary
  }
}))

// Messages are translation keys, shown with t().
const schema = yup.object().shape({
  email: yup.string().email('validation.email').required('validation.required'),
  password: yup.string().required('validation.required')
})

const defaultValues = {
  password: '',
  email: ''
}

const LoginPage = () => {
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { t, i18n } = useTranslation()

  // ** Hooks
  const auth = useAuth()
  const { settings, saveSettings } = useSettings()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onBlur',
    resolver: yupResolver(schema)
  })

  const onSubmit = data => {
    const { email, password } = data
    setLoginError(null)
    setSubmitting(true)
    auth.login({ email, password, rememberMe }, code => {
      setSubmitting(false)
      setLoginError(code)
    })
  }

  const toggleLanguage = () => {
    const lang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(lang)
    saveSettings({ ...settings, direction: lang === 'en' ? 'ltr' : 'rtl' })
  }

  return (
    <Box sx={{ backgroundColor: 'background.paper' }}>
      <Box
        sx={{
          p: [6, 12],
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img src='/images/logos/himma-logo.png' alt={t('login.title')} style={{ height: 110 }} />
              <Button size='small' variant='text' onClick={toggleLanguage} startIcon={<Icon icon='tabler:language' />}>
                {t(i18n.language === 'en' ? 'language.ar' : 'language.en')}
              </Button>
            </Box>
            <Box sx={{ my: 6 }}>
              <Typography variant='h3' sx={{ mb: 1.5 }}>
                {t('login.title')}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{t('login.subtitle')}</Typography>
            </Box>
            {loginError ? (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(`errors.${loginError}`)}
              </Alert>
            ) : null}
            <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ mb: 4 }}>
                <Controller
                  name='email'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <CustomTextField
                      fullWidth
                      autoFocus
                      type='email'
                      autoComplete='username'
                      label={t('login.email')}
                      value={value}
                      onBlur={onBlur}
                      onChange={onChange}
                      error={Boolean(errors.email)}
                      {...(errors.email && { helperText: t(errors.email.message) })}
                    />
                  )}
                />
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Controller
                  name='password'
                  control={control}
                  rules={{ required: true }}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <CustomTextField
                      fullWidth
                      value={value}
                      onBlur={onBlur}
                      label={t('login.password')}
                      onChange={onChange}
                      id='auth-login-v2-password'
                      autoComplete='current-password'
                      error={Boolean(errors.password)}
                      {...(errors.password && { helperText: t(errors.password.message) })}
                      type={showPassword ? 'text' : 'password'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position='end'>
                            <IconButton
                              edge='end'
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <Icon fontSize='1.25rem' icon={showPassword ? 'tabler:eye' : 'tabler:eye-off'} />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Box>
              <Box sx={{ mb: 1.75, display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  label={t('login.remember')}
                  control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />}
                />
              </Box>
              <Button fullWidth type='submit' variant='contained' disabled={submitting} sx={{ mb: 4 }}>
                {t('login.submit')}
              </Button>
            </form>
        </Box>
      </Box>
    </Box>
  )
}
LoginPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
LoginPage.guestGuard = true

export default LoginPage
