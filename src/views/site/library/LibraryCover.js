// A library item's cover: its picture, or a plain cloth-coloured cover with the title when it has none.

// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Utils
import { serifFont } from 'src/views/site/storyText'

const LibraryCover = ({ item, sx = {} }) => {
  const { t, i18n } = useTranslation()

  return (
    <Box
      className='cover'
      sx={{
        position: 'relative',
        aspectRatio: '2 / 3',
        overflow: 'hidden',
        borderRadius: '3px 8px 8px 3px',
        bgcolor: '#23313f',
        boxShadow: '0 14px 30px rgba(0,0,0,.22)',
        transition: 'transform .25s ease, box-shadow .25s ease',
        ...sx
      }}
    >
      {item.coverUrl ? (
        <Box
          component='img'
          src={item.coverUrl}
          alt=''
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, p: 4, display: 'flex', flexDirection: 'column', color: '#fff' }}>
          <Typography variant='caption' sx={{ color: 'rgba(255,255,255,.7)', letterSpacing: 1 }}>
            {t(`library.type.${item.type}`)}
          </Typography>
          <Typography
            dir='auto'
            sx={{
              fontFamily: serifFont(i18n.language),
              fontSize: '1.2rem',
              lineHeight: 1.4,
              color: 'inherit',
              mt: 'auto'
            }}
          >
            {item.title}
          </Typography>
          <Typography variant='body2' dir='auto' sx={{ color: 'rgba(255,255,255,.8)', mt: 1 }}>
            {item.authorName}
          </Typography>
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 10,
          background: 'linear-gradient(90deg, rgba(0,0,0,.35), rgba(0,0,0,0))'
        }}
      />
    </Box>
  )
}

export default LibraryCover
