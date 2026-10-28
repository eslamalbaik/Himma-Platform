// An organization (school, association, institution, government body) asks to join Hinnah
// (`POST /api/public/join-requests`). Staff review it in the dashboard (Clients → Join requests); once it
// is approved, the organization's users sign in at /login.

// ** React Imports
import { useState } from 'react'

// ** Next Import
import Link from 'next/link'

// ** MUI Components
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import * as yup from 'yup'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

// ** Components
import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import AuthShell, { AuthSwitch } from 'src/views/site/AuthShell'
import { pillSx } from 'src/views/site/SiteHeader'

const TYPES = ['school', 'association', 'institution', 'government']

// Messages are translation keys, shown with t().
const schema = yup.object().shape({
  nameAr: yup.string().trim().required('validation.required'),
  nameEn: yup.string().trim().required('validation.required'),
  type: yup.string().oneOf(TYPES, 'validation.required').required('validation.required'),
  contactName: yup.string().trim().required('validation.required'),
  contactEmail: yup.string().email('validation.email').required('validation.required'),
  contactPhone: yup.string().trim().max(50),
  message: yup.string().trim().max(5000)
})

const defaultValues = {
  nameAr: '',
  nameEn: '',
  type: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  message: ''
}

const JoinPage = () => {
  const { t } = useTranslation()
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState(null)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({ defaultValues, mode: 'onBlur', resolver: yupResolver(schema) })

  const onSubmit = data => {
    setError(null)
    setSubmitting(true)
    axios
      .post('/api/public/join-requests', data)
      .then(() => setSentTo(data.contactEmail))
      .catch(err => setError(err.response?.data?.error?.code || 'network_error'))
      .finally(() => setSubmitting(false))
  }

  const field = (name, props = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange, onBlur } }) => (
        <CustomTextField
          fullWidth
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          label={t(`site.join.${name}`)}
          error={Boolean(errors[name])}
          {...(errors[name] && { helperText: t(errors[name].message) })}
          {...props}
        />
      )}
    />
  )

  if (sentTo) {
    return (
      <AuthShell title={t('site.join.sentTitle')} maxWidth={520}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ color: 'success.main', mb: 4 }}>
            <Icon icon='tabler:circle-check' fontSize='3.5rem' />
          </Box>
          <Typography sx={{ color: 'text.secondary', mb: 8 }}>{t('site.join.sentText', { email: sentTo })}</Typography>
          <Button component={Link} href='/' variant='contained' sx={pillSx}>
            {t('site.backHome')}
          </Button>
        </Box>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('site.join.title')} subtitle={t('site.join.subtitle')} maxWidth={620}>
      {error ? (
        <Alert severity='error' sx={{ mb: 4 }}>
          {t(`errors.${error}`)}
        </Alert>
      ) : null}
      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6}>
            {field('nameAr', { autoFocus: true, inputProps: { dir: 'rtl' } })}
          </Grid>
          <Grid item xs={12} sm={6}>
            {field('nameEn', { inputProps: { dir: 'ltr' } })}
          </Grid>
          <Grid item xs={12}>
            {field('type', {
              select: true,
              SelectProps: { displayEmpty: false },
              children: TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {t(`site.join.types.${type}`)}
                </MenuItem>
              ))
            })}
          </Grid>
          <Grid item xs={12} sm={6}>
            {field('contactName', { autoComplete: 'name' })}
          </Grid>
          <Grid item xs={12} sm={6}>
            {field('contactEmail', { type: 'email', autoComplete: 'email' })}
          </Grid>
          <Grid item xs={12}>
            {field('contactPhone', { type: 'tel', autoComplete: 'tel' })}
          </Grid>
          <Grid item xs={12}>
            {field('message', { multiline: true, minRows: 3 })}
          </Grid>
          <Grid item xs={12}>
            <Button fullWidth type='submit' variant='contained' size='large' disabled={submitting} sx={pillSx}>
              {t('site.join.submit')}
            </Button>
          </Grid>
        </Grid>
      </form>
      <AuthSwitch text={t('site.join.alreadyMember')} href='/login?type=organization' label={t('site.orgs.signIn')} />
    </AuthShell>
  )
}

JoinPage.getLayout = page => page
JoinPage.authGuard = false

export default JoinPage
