// A story's text, block by block (paragraphs, subheadings and quotes; see toBlocks in storyText.js).

// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Utils
import { serifFont, toBlocks, ink } from 'src/views/site/storyText'

const StoryBody = ({ body, language }) => {
  const font = serifFont(language)

  return toBlocks(body).map((block, i) => {
    if (block.type === 'heading') {
      return (
        <Typography
          key={i}
          component='h2'
          sx={{ fontFamily: font, fontWeight: 700, fontSize: '1.6rem', mt: 10, mb: 2 }}
        >
          {block.text}
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
          {block.text}
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
        {block.text}
      </Typography>
    )
  })
}

export default StoryBody
