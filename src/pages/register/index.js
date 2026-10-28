// Individuals create their own reader/writer account (`POST /api/auth/register`) and are signed in at once.
// Organizations do not sign up here: they ask to join at /join.

// ** React Imports
import { useState } from 'react'

// ** MUI Components
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'

// ** Third Party Imports
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

// ** Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import AuthShell, { AuthSwitch } from 'src/views/site/AuthShell'
import { pillSx } from 'src/views/site/SiteHeader'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// Messages are translation keys, shown with t().
const schema = yup.object().shape({
  name: yup.string().trim().min(2, 'errors.invalid_name').required('validation.required'),
  email: yup.string().email('validation.email').required('validation.required'),
  password: yup.string().min(8, 'errors.invalid_password').required('validation.required')
})

const RegisterPage = () => {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onBlur',
    resolver: yupResolver(schema)
  })

  const onSubmit = data => {
    setError(null)
    setSubmitting(true)
    auth.register({ ...data, locale: i18n.language === 'en' ? 'en' : 'ar' }, code => {
      setSubmitting(false)
      setError(code)
    })
  }

  const field = (name, props = {}) => (
    <Box sx={{ mb: 4 }}>
      <Controller
        name={name}
        control={control}
        render={({ field: { value, onChange, onBlur } }) => (
          <CustomTextField
            fullWidth
            value={value}
            onBlur={onBlur}
            onChange={onChange}
            error={Boolean(errors[name])}
            {...(errors[name] && { helperText: t(errors[name].message) })}
            {...props}
          />
        )}
      />
    </Box>
  )

  return (
    <AuthShell title={t('site.register.title')} subtitle={t('site.register.subtitle')}>
      {error ? (
        <Alert severity='error' sx={{ mb: 4 }}>
          {t(`errors.${error}`)}
        </Alert>
      ) : null}
      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
        {field('name', { autoFocus: true, autoComplete: 'name', label: t('site.register.name') })}
        {field('email', { type: 'email', autoComplete: 'email', label: t('login.email') })}
        {field('password', {
          label: t('login.password'),
          autoComplete: 'new-password',
          type: showPassword ? 'text' : 'password',
          helperText: errors.password ? t(errors.password.message) : t('site.register.passwordHint'),
          InputProps: {
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton
                  edge='end'
                  aria-label={t('site.showPassword')}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon fontSize='1.25rem' icon={showPassword ? 'tabler:eye' : 'tabler:eye-off'} />
                </IconButton>
              </InputAdornment>
            )
          }
        })}
        <Button
          fullWidth
          type='submit'
          variant='contained'
          size='large'
          disabled={submitting}
          sx={{ ...pillSx, mt: 2 }}
        >
          {t('site.register.cta')}
        </Button>
      </form>
      <Typography variant='body2' sx={{ color: 'text.disabled', textAlign: 'center', mt: 4 }}>
        {t('site.register.orgNote')}
      </Typography>
      <AuthSwitch text={t('site.register.haveAccount')} href='/login' label={t('site.signIn')} />
    </AuthShell>
  )
}

RegisterPage.getLayout = page => page
RegisterPage.guestGuard = true

export default RegisterPage
