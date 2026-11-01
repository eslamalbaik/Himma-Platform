// A story's text, block by block (paragraphs, subheadings and quotes; see toBlocks in storyText.js).

// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Utils
import { serifFont, toBlocks, videoEmbed, ink } from 'src/views/site/storyText'
import StoryInline from 'src/views/site/StoryInline'

const StoryBody = ({ body, language }) => {
  const font = serifFont(language)

  return toBlocks(body).map((block, i) => {
    if (block.type === 'image') {
      return (
        <Box key={i} component='figure' sx={{ m: 0, my: 8 }}>
          <Box
            component='img'
            src={block.url}
            alt={block.alt}
            loading='lazy'
            sx={{ width: '100%', display: 'block' }}
          />
          {block.alt ? (
            <Typography variant='body2' sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
              {block.alt}
            </Typography>
          ) : null}
        </Box>
      )
    }
    if (block.type === 'video') {
      return (
        <Box key={i} sx={{ my: 8, position: 'relative', pt: '56.25%' }}>
          <Box
            component='iframe'
            src={videoEmbed(block.url)}
            title='video'
            loading='lazy'
            allow='accelerometer; encrypted-media; picture-in-picture; fullscreen'
            allowFullScreen
            referrerPolicy='strict-origin-when-cross-origin'
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </Box>
      )
    }
    if (block.type === 'heading') {
      return (
        <Typography
          key={i}
          component='h2'
          sx={{ fontFamily: font, fontWeight: 700, fontSize: '1.6rem', mt: 10, mb: 2 }}
        >
          <StoryInline text={block.text} />
        </Typography>
      )
    }
    if (block.type === 'quote') {
      return (
        <Box
          key={i}
          component='blockquote'
          sx={{
            m: 0,
            my: 8,
            paddingInlineStart: 5,
            borderInlineStart: theme => `3px solid ${ink(theme)}`,
            fontFamily: font,
            fontStyle: language === 'en' ? 'italic' : 'normal',
            fontSize: '1.3rem',
            lineHeight: 1.8,
            whiteSpace: 'pre-line'
          }}
        >
          <StoryInline text={block.text} />
        </Box>
      )
    }

    return (
      <Typography
        key={i}
        sx={{
          fontFamily: font,
          fontSize: { xs: '1.125rem', md: '1.25rem' },
          lineHeight: language === 'en' ? 1.65 : 1.95,
          color: ink,
          mt: 7,
          whiteSpace: 'pre-line'
        }}
      >
        <StoryInline text={block.text} />
      </Typography>
    )
  })
}

export default StoryBody
