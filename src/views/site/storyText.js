// Helpers shared by the public site pages (home feed, story page, editor).

// Near-black reading ink (Medium-like); the dashboard's text colour is a softer grey.
export const ink = theme => (theme.palette.mode === 'light' ? '#191919' : '#F2F2F2')

// Serif reading fonts (loaded in src/pages/_document.js). Each story uses the font of its own language,
// whatever the interface language is.
export const serifFont = lang =>
  lang === 'en'
    ? '"Source Serif 4", Georgia, "Times New Roman", serif'
    : '"Noto Naskh Arabic", "IBM Plex Sans Arabic", serif'

export const storyDir = lang => (lang === 'en' ? 'ltr' : 'rtl')

// About 200 words a minute, never less than one minute.
export const readingMinutes = wordCount => Math.max(1, Math.round((wordCount || 0) / 200))

export const countWords = text => (text || '').trim().split(/\s+/).filter(Boolean).length

export const formatDate = (iso, lang) =>
  iso
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE-u-nu-latn', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(new Date(iso))
    : ''

export const initialOf = name => (name || '?').trim().charAt(0).toUpperCase()

// Stories are plain text. A blank line starts a new paragraph; a paragraph that starts with "## " is a
// subheading and one that starts with "> " is a quote.
export const toBlocks = body =>
  (body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      if (part.startsWith('## ')) return { type: 'heading', text: part.slice(3).trim() }
      if (part.startsWith('> ')) return { type: 'quote', text: part.replace(/^>\s?/gm, '') }

      return { type: 'paragraph', text: part }
    })
