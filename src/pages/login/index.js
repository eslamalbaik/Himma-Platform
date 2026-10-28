// Members' sign-in: individuals and the users of client organizations (`portal: member`). They land on the
// reading site, never the dashboard. Staff sign in at /admin/login, which the site does not link to.

// ** React Imports
import { useEffect, useState } from 'react'

// ** Next Imports
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Components
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import InputAdornment from '@mui/material/InputAdornment'
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

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
  email: yup.string().email('validation.email').required('validation.required'),
  password: yup.string().required('validation.required')
})

const MemberLoginPage = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const auth = useAuth()

  // Individuals and organizations use the same kind of account; the choice only changes the texts and
  // where "no account yet?" leads (sign up, or ask for the organization to join).
  const [type, setType] = useState('individual')
  useEffect(() => {
    if (router.isReady && router.query.type === 'organization') setType('organization')
  }, [router.isReady, router.query.type])
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({ defaultValues: { email: '', password: '' }, mode: 'onBlur', resolver: yupResolver(schema) })

  const onSubmit = ({ email, password }) => {
    setLoginError(null)
    setSubmitting(true)
    auth.login({ email, password, rememberMe, portal: 'member' }, code => {
      setSubmitting(false)
      setLoginError(code)
    })
  }

  const isOrg = type === 'organization'

  return (
    <AuthShell title={t('site.login.title')} subtitle={t(isOrg ? 'site.login.orgSubtitle' : 'site.login.subtitle')}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={type}
        onChange={(e, value) => value && setType(value)}
        sx={{ mb: 6 }}
        aria-label={t('site.login.accountType')}
      >
        <ToggleButton value='individual' sx={{ gap: 2 }}>
          <Icon icon='tabler:user' fontSize='1.1rem' />
          {t('site.login.individuals')}
        </ToggleButton>
        <ToggleButton value='organization' sx={{ gap: 2 }}>
          <Icon icon='tabler:building' fontSize='1.1rem' />
          {t('site.login.organizations')}
        </ToggleButton>
      </ToggleButtonGroup>

      {loginError ? (
        <Alert
          severity='error'
          sx={{ mb: 4 }}
          action={
            loginError === 'use_admin_login' ? (
              <Button component={Link} href='/admin/login' color='inherit' size='small'>
                {t('site.login.adminLink')}
              </Button>
            ) : null
          }
        >
          {t(`errors.${loginError}`)}
        </Alert>
      ) : null}

      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ mb: 4 }}>
          <Controller
            name='email'
            control={control}
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                fullWidth
                autoFocus
                type='email'
                autoComplete='username'
                label={t(isOrg ? 'site.login.orgEmail' : 'login.email')}
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
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                fullWidth
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                label={t('login.password')}
                autoComplete='current-password'
                type={showPassword ? 'text' : 'password'}
                error={Boolean(errors.password)}
                {...(errors.password && { helperText: t(errors.password.message) })}
                InputProps={{
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
                }}
              />
            )}
          />
        </Box>
        <FormControlLabel
          sx={{ mb: 4, '& .MuiFormControlLabel-label': { color: 'text.secondary' } }}
          label={t('login.remember')}
          control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />}
        />
        <Button fullWidth type='submit' variant='contained' size='large' disabled={submitting} sx={pillSx}>
          {t('login.submit')}
        </Button>
      </form>

      {isOrg ? (
        <AuthSwitch text={t('site.login.noOrg')} href='/join' label={t('site.orgs.join')} />
      ) : (
        <AuthSwitch text={t('site.login.noAccount')} href='/register' label={t('site.register.cta')} />
      )}
    </AuthShell>
  )
}

MemberLoginPage.getLayout = page => page
MemberLoginPage.guestGuard = true

export default MemberLoginPage
