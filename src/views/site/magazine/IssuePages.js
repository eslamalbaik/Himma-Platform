// The pages of one magazine issue, designed at 560 x 784: the cover, the contents, an opener and a text page for
// every article, a colophon and the back cover. `buildPages` returns an even number of pages for the FlipBook.

// ** MUI Imports
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'

// ** Next Import
import Link from 'next/link'

// ** Utils
import { formatDate, initialOf, readingMinutes } from 'src/views/site/storyText'

const PAPER = '#fbf8f2'
const INK = '#1d1b19'
const MUTED = '#6b655d'
const ACCENT = '#8a1d2e'
const serif = lang =>
  lang === 'en' ? "'Georgia', 'Times New Roman', serif" : "'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif"
const sans = "'Public Sans', 'Segoe UI', Tahoma, sans-serif"

const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

const PageNumber = ({ n }) => (
  <Box
    sx={{
      position: 'absolute',
      bottom: 26,
      insetInline: 0,
      textAlign: 'center',
      fontFamily: sans,
      fontSize: 15,
      letterSpacing: 2,
      color: MUTED
    }}
  >
    {n}
  </Box>
)

// A picture that always fills its frame, or a soft colour field with the first letter when there is none.
const Picture = ({ src, label, sx }) =>
  src ? (
    <Box component='img' src={src} alt='' sx={{ ...fill, objectFit: 'cover', ...sx }} />
  ) : (
    <Box
      sx={{
        ...fill,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${ACCENT}, #3a1a24)`,
        color: 'rgba(255,255,255,.85)',
        fontFamily: serif('ar'),
        fontSize: 140,
        ...sx
      }}
    >
      {initialOf(label)}
    </Box>
  )

const CoverPage = ({ issue, t, lang }) => {
  const title = lang === 'en' ? issue.titleEn : issue.titleAr
  const theme = lang === 'en' ? issue.themeEn : issue.themeAr

  return (
    <Box sx={{ position: 'relative', width: PAGE_W_, height: PAGE_H_, overflow: 'hidden', bgcolor: '#2a1520' }}>
      <Picture src={issue.coverUrl} label={title} />
      <Box
        sx={{
          ...fill,
          background:
            'linear-gradient(180deg, rgba(20,8,14,.62) 0%, rgba(20,8,14,.05) 32%, rgba(20,8,14,.1) 50%, rgba(20,8,14,.88) 100%)'
        }}
      />
      <Box sx={{ position: 'absolute', top: 46, insetInline: 46, display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Box
            sx={{ fontFamily: serif(lang), fontSize: 66, lineHeight: 1, color: '#fff', textShadow: '0 2px 18px #0007' }}
          >
            {t('magazine.masthead')}
          </Box>
          <Box sx={{ mt: 1.5, fontFamily: sans, fontSize: 15, letterSpacing: 3, color: 'rgba(255,255,255,.85)' }}>
            {t('magazine.tagline')}
          </Box>
        </Box>
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            bgcolor: ACCENT,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: sans,
            boxShadow: '0 6px 20px #0006'
          }}
        >
          <Box sx={{ fontSize: 13, letterSpacing: 2 }}>{t('magazine.issueWord')}</Box>
          <Box sx={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>{issue.number}</Box>
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 58, insetInline: 46, color: '#fff' }}>
        <Box sx={{ width: 64, height: 4, bgcolor: '#e7b04a', mb: 3 }} />
        <Box sx={{ fontFamily: serif(lang), fontSize: 46, lineHeight: 1.3, textShadow: '0 2px 16px #0008' }}>
          {theme || title}
        </Box>
        {theme ? (
          <Box sx={{ mt: 2, fontFamily: sans, fontSize: 18, color: 'rgba(255,255,255,.82)' }}>{title}</Box>
        ) : null}
        <Box sx={{ mt: 3, fontFamily: sans, fontSize: 14, letterSpacing: 1.5, color: 'rgba(255,255,255,.65)' }}>
          {formatDate(issue.publishedAt, lang)}
        </Box>
      </Box>
    </Box>
  )
}

const PAGE_W_ = 560
const PAGE_H_ = 784

const Page = ({ children, sx }) => (
  <Box sx={{ position: 'relative', width: PAGE_W_, height: PAGE_H_, overflow: 'hidden', bgcolor: PAPER, ...sx }}>
    {children}
  </Box>
)

const ContentsPage = ({ articles, t, lang, startPage, goTo, number }) => (
  <Page sx={{ px: '52px', pt: '64px' }}>
    <Box sx={{ fontFamily: sans, fontSize: 14, letterSpacing: 3, color: ACCENT, mb: 2 }}>
      {t('magazine.issue', { number })}
    </Box>
    <Box sx={{ fontFamily: serif(lang), fontSize: 44, color: INK, mb: 5 }}>{t('magazine.contents')}</Box>
    <Box sx={{ borderTop: `2px solid ${INK}` }}>
      {articles.map((article, i) => {
        const page = startPage(i)
        const section = lang === 'en' ? article.sectionNameEn : article.sectionNameAr

        return (
          <Box
            key={article.id}
            role='button'
            tabIndex={0}
            onClick={() => goTo(page)}
            onKeyDown={e => e.key === 'Enter' && goTo(page)}
            sx={{
              display: 'flex',
              gap: '16px',
              alignItems: 'baseline',
              py: '13px',
              borderBottom: '1px solid #e3dcd0',
              cursor: 'pointer',
              '&:hover .t': { color: ACCENT }
            }}
          >
            <Box sx={{ fontFamily: sans, fontSize: 15, color: ACCENT, width: 28, flexShrink: 0 }}>
              {String(page + 1).padStart(2, '0')}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                className='t'
                sx={{ fontFamily: serif(article.language), fontSize: 19, lineHeight: 1.5, color: INK }}
              >
                {article.title}
              </Box>
              <Box sx={{ fontFamily: sans, fontSize: 12.5, color: MUTED, mt: '2px' }}>
                {[section, article.authorName].filter(Boolean).join(' · ')}
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  </Page>
)

const OpenerPage = ({ article, lang, n, t }) => {
  const section = lang === 'en' ? article.sectionNameEn : article.sectionNameAr
  const dir = article.language === 'en' ? 'ltr' : 'rtl'

  return (
    <Page>
      <Box sx={{ position: 'absolute', top: 0, insetInline: 0, height: 440 }}>
        <Picture src={article.coverUrl} label={article.title} />
        <Box sx={{ ...fill, background: 'linear-gradient(180deg, rgba(0,0,0,.0) 55%, rgba(0,0,0,.35) 100%)' }} />
        {section ? (
          <Box
            sx={{
              position: 'absolute',
              top: 30,
              insetInlineStart: 34,
              bgcolor: PAPER,
              color: INK,
              fontFamily: sans,
              fontSize: 13.5,
              px: '16px',
              py: '7px',
              letterSpacing: 1
            }}
          >
            {section}
          </Box>
        ) : null}
      </Box>
      <Box dir={dir} sx={{ position: 'absolute', top: 440, insetInline: 0, bottom: 0, px: '46px', pt: '30px' }}>
        <Box sx={{ width: 48, height: 4, bgcolor: ACCENT, mb: '18px' }} />
        <Box
          sx={{
            fontFamily: serif(article.language),
            fontSize: 38,
            lineHeight: 1.4,
            color: INK,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {article.title}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mt: '20px' }}>
          <Avatar
            src={article.authorAvatarUrl || undefined}
            sx={{ width: 38, height: 38, bgcolor: ACCENT, fontSize: 16 }}
          >
            {initialOf(article.authorName)}
          </Avatar>
          <Box sx={{ fontFamily: sans, fontSize: 14.5, color: INK }}>
            {article.authorName}
            <Box component='span' sx={{ color: MUTED }}>
              {' · '}
              {t('site.story.minutes', { count: readingMinutes(article.wordCount) })}
            </Box>
          </Box>
        </Box>
      </Box>
      <PageNumber n={n} />
    </Page>
  )
}

const TextPage = ({ article, t, n }) => {
  const dir = article.language === 'en' ? 'ltr' : 'rtl'

  return (
    <Page sx={{ px: '50px', pt: '58px' }}>
      <Box dir={dir}>
        {article.summary ? (
          <Box
            sx={{
              fontFamily: serif(article.language),
              fontSize: 23,
              lineHeight: 1.75,
              color: INK,
              paddingInlineStart: '18px',
              borderInlineStart: `4px solid ${ACCENT}`,
              mb: '28px'
            }}
          >
            {article.summary}
          </Box>
        ) : null}
        <Box
          sx={{
            fontFamily: serif(article.language),
            fontSize: 18.5,
            lineHeight: 2,
            color: '#2c2925',
            whiteSpace: 'pre-line',
            height: 360,
            overflow: 'hidden',
            maskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)',
            // A drop cap only for Latin text: an Arabic letter joins the next one and cannot stand alone.
            ...(article.language === 'en'
              ? {
                  '&::first-letter': {
                    fontSize: '3.1em',
                    float: 'inline-start',
                    lineHeight: 0.95,
                    paddingInlineEnd: '10px',
                    color: ACCENT
                  }
                }
              : {})
          }}
        >
          {article.excerpt}
        </Box>
        <Box
          component={Link}
          href={`/stories/${article.id}`}
          sx={{
            display: 'inline-block',
            mt: '24px',
            px: '26px',
            py: '12px',
            borderRadius: '99px',
            bgcolor: INK,
            color: '#fff',
            fontFamily: sans,
            fontSize: 15,
            textDecoration: 'none',
            '&:hover': { bgcolor: ACCENT }
          }}
        >
          {t('magazine.read')}
        </Box>
      </Box>
      <PageNumber n={n} />
    </Page>
  )
}

const ColophonPage = ({ issue, articles, t, lang }) => {
  const authors = [...new Set(articles.map(article => article.authorName).filter(Boolean))]
  const title = lang === 'en' ? issue.titleEn : issue.titleAr

  return (
    <Page sx={{ px: '56px', pt: '90px' }}>
      <Box sx={{ fontFamily: sans, fontSize: 14, letterSpacing: 3, color: ACCENT, mb: 2 }}>
        {t('magazine.issue', { number: issue.number })}
      </Box>
      <Box sx={{ fontFamily: serif(lang), fontSize: 40, color: INK, mb: '10px' }}>{t('magazine.colophon')}</Box>
      <Box sx={{ fontFamily: sans, fontSize: 15.5, color: MUTED, mb: '34px' }}>
        {title} · {formatDate(issue.publishedAt, lang)} · {t('magazine.count', { count: articles.length })}
      </Box>
      <Box sx={{ fontFamily: sans, fontSize: 13, letterSpacing: 2, color: ACCENT, mb: '12px' }}>
        {t('magazine.writers')}
      </Box>
      <Box sx={{ fontFamily: serif(lang), fontSize: 19, lineHeight: 2.1, color: INK }}>{authors.join(' · ')}</Box>
      <Box sx={{ mt: '44px', fontFamily: serif(lang), fontSize: 18, lineHeight: 2, color: MUTED }}>
        {t('magazine.about')}
      </Box>
    </Page>
  )
}

const BackCover = ({ t, lang, nextIssue }) => (
  <Box
    sx={{
      position: 'relative',
      width: PAGE_W_,
      height: PAGE_H_,
      background: 'linear-gradient(160deg, #3a1a24, #1e0d14)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      px: '60px'
    }}
  >
    <Box sx={{ width: 130, height: 130, borderRadius: '50%', bgcolor: PAPER, display: 'grid', placeItems: 'center' }}>
      <Box component='img' src='/images/logos/hinnah-logo.png' alt='' sx={{ width: 90 }} />
    </Box>
    <Box sx={{ fontFamily: serif(lang), fontSize: 44, mt: '30px' }}>{t('magazine.masthead')}</Box>
    <Box sx={{ fontFamily: sans, fontSize: 15, letterSpacing: 3, color: 'rgba(255,255,255,.7)', mt: '6px' }}>
      {t('magazine.tagline')}
    </Box>
    <Box sx={{ width: 60, height: 3, bgcolor: '#e7b04a', my: '34px' }} />
    <Box sx={{ fontFamily: serif(lang), fontSize: 22, lineHeight: 1.9, color: 'rgba(255,255,255,.88)' }}>
      {t('magazine.thanks')}
    </Box>
    <Box sx={{ display: 'flex', gap: '12px', mt: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Box
        component={Link}
        href='/magazine'
        sx={{
          px: '24px',
          py: '11px',
          borderRadius: '99px',
          border: '1px solid rgba(255,255,255,.6)',
          color: '#fff',
          fontFamily: sans,
          fontSize: 14.5,
          textDecoration: 'none',
          '&:hover': { bgcolor: 'rgba(255,255,255,.12)' }
        }}
      >
        {t('magazine.allIssues')}
      </Box>
      {nextIssue ? (
        <Box
          component={Link}
          href={`/magazine/${nextIssue}`}
          sx={{
            px: '24px',
            py: '11px',
            borderRadius: '99px',
            bgcolor: '#e7b04a',
            color: '#2a1520',
            fontFamily: sans,
            fontSize: 14.5,
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          {t('magazine.nextIssue', { number: nextIssue })}
        </Box>
      ) : null}
    </Box>
  </Box>
)

// The page index where article `i` starts. An article's opener is an odd page (the left page of a spread) so it faces
// its text page: 0 cover, 1 colophon, 2 contents, then two pages per article, then the back cover.
export const articleStart = i => 3 + i * 2

export const buildPages = ({ issue, t, lang, goTo, nextIssue }) => {
  const articles = issue.articles
  const pages = [
    <CoverPage key='cover' issue={issue} t={t} lang={lang} />,
    <ColophonPage key='colophon' issue={issue} articles={articles} t={t} lang={lang} />,
    <ContentsPage
      key='contents'
      articles={articles}
      t={t}
      lang={lang}
      number={issue.number}
      startPage={articleStart}
      goTo={goTo}
    />
  ]
  articles.forEach((article, i) => {
    const n = articleStart(i) + 1
    pages.push(<OpenerPage key={`${article.id}-a`} article={article} lang={lang} n={n} t={t} />)
    pages.push(<TextPage key={`${article.id}-b`} article={article} t={t} n={n + 1} />)
  })
  pages.push(<BackCover key='back' t={t} lang={lang} nextIssue={nextIssue} />)

  return pages
}
