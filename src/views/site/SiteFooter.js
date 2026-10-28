// Small footer of the public site. The staff sign-in (/admin/login) is deliberately not linked here.

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Utils
import { ink } from 'src/views/site/storyText'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Config
import { contactEmail } from 'src/configs/site'

const FooterLink = props => (
  <Typography
    component={Link}
    variant='body2'
    sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { color: ink } }}
    {...props}
  />
)

const SiteFooter = () => {
  const { t } = useTranslation()

  return (
    <Box component='footer' sx={{ borderTop: theme => `1px solid ${theme.palette.divider}` }}>
      <Box
        sx={{
          mx: 'auto',
          maxWidth: 1336,
          px: { xs: 4, md: 6 },
          py: 5,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: { xs: 3, sm: 5 }
        }}
      >
        <FooterLink href='/'>{t('site.footer.home')}</FooterLink>
        <FooterLink href='/join'>{t('site.orgs.join')}</FooterLink>
        <FooterLink href='/login?type=organization'>{t('site.orgs.signIn')}</FooterLink>
        <FooterLink href={`mailto:${contactEmail}`}>{t('site.footer.contact')}</FooterLink>
        <Typography variant='body2' sx={{ color: 'text.disabled', marginInlineStart: { sm: 'auto' } }}>
          {t('site.footer.rights', { year: new Date().getFullYear() })}
        </Typography>
      </Box>
    </Box>
  )
}

export default SiteFooter
