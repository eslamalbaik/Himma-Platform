// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Components
import CardFrame from 'src/views/site/cards/CardFrame'
import { AMBER } from 'src/views/site/cards/helpers'

// Loading, "not found" (unknown or unpublished card) and "could not load" states of the card pages.
const CardMissing = ({ status }) => {
  const { t } = useTranslation()

  return (
    <CardFrame>
      {status === 'loading' ? (
        <Box sx={{ pt: 6 }}>
          <Skeleton variant='rounded' height={220} sx={{ borderRadius: 6 }} />
          <Skeleton sx={{ mt: 4 }} />
          <Skeleton width='70%' />
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 20 }}>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, mb: 3 }}>
            {t(status === 'missing' ? 'cards.public.notFound' : 'cards.public.failed')}
          </Typography>
          <Button
            component={Link}
            href='/'
            variant='contained'
            sx={{ borderRadius: 99, backgroundColor: AMBER, '&:hover': { backgroundColor: AMBER } }}
          >
            {t('site.backHome')}
          </Button>
        </Box>
      )}
    </CardFrame>
  )
}

export default CardMissing
