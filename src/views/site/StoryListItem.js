// One story in the home feed: author, title, summary, date, reading time and section.

// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import { useTranslation } from 'react-i18next'

// ** Utils
import { formatDate, initialOf, readingMinutes, serifFont, storyDir, ink } from 'src/views/site/storyText'

const StoryListItem = ({ story, onSection }) => {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const section = lang === 'en' ? story.sectionNameEn : story.sectionNameAr
  const org = lang === 'en' ? story.tenantNameEn : story.tenantNameAr

  return (
    <Box component='article' sx={{ py: 6, borderBottom: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
          {initialOf(story.authorName)}
        </Avatar>
        <Typography variant='body2' sx={{ color: ink }}>
          {story.authorName}
          {org ? (
            <Box component='span' sx={{ color: 'text.secondary' }}>
              {' '}
              {t('site.story.in')} {org}
            </Box>
          ) : null}
        </Typography>
      </Box>

      <Box
        component={Link}
        href={`/stories/${story.id}`}
        dir={storyDir(story.language)}
        sx={{ display: 'block', textDecoration: 'none', color: ink, textAlign: 'start' }}
      >
        <Typography
          component='h2'
          sx={{
            fontFamily: serifFont(story.language),
            fontWeight: 700,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            lineHeight: 1.35,
            mb: 1.5
          }}
        >
          {story.title}
        </Typography>
        {story.summary ? (
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '1rem',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {story.summary}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 3 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {formatDate(story.publishedAt, lang)} · {t('site.story.minutes', { count: readingMinutes(story.wordCount) })}
        </Typography>
        {section ? (
          <Chip
            size='small'
            label={section}
            onClick={onSection ? () => onSection(story.sectionId) : undefined}
            sx={{ borderRadius: 99, backgroundColor: 'action.hover' }}
          />
        ) : null}
      </Box>
    </Box>
  )
}

export default StoryListItem
