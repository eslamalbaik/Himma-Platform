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

// Stories are plain text with a few marks. A blank line starts a new block. A block that starts with "## " is a
// subheading and one that starts with "> " is a quote; "![caption](/storage/...)" alone is a picture and
// "@[video](https://...)" alone is a YouTube or Vimeo video. Inside text: **bold**, *italic*, [text](url).
const IMAGE = /^!\[([^\]]*)\]\((\/storage\/[^\s)]+|https:\/\/[^\s)]+)\)$/
const VIDEO = /^@\[video\]\((https:\/\/[^\s)]+)\)$/

// The embeddable address of a YouTube or Vimeo link, or null for anything else.
export const videoEmbed = link => {
  let url
  try {
    url = new URL(link)
  } catch (e) {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  let id = null
  if (host === 'youtu.be') id = url.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'm.youtube.com') {
    id = url.searchParams.get('v') || (url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/) || [])[1]
  } else if (host === 'vimeo.com') id = (url.pathname.match(/^\/(\d+)/) || [])[1]
  else return null
  if (!id || !/^[\w-]+$/.test(id)) return null

  return host === 'vimeo.com' ? `https://player.vimeo.com/video/${id}` : `https://www.youtube-nocookie.com/embed/${id}`
}

export const toBlocks = body =>
  (body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const image = part.match(IMAGE)
      if (image) return { type: 'image', alt: image[1], url: image[2] }
      const video = part.match(VIDEO)
      if (video && videoEmbed(video[1])) return { type: 'video', url: video[1] }
      if (part.startsWith('## ')) return { type: 'heading', text: part.slice(3).trim() }
      if (part.startsWith('> ')) return { type: 'quote', text: part.replace(/^>\s?/gm, '') }

      return { type: 'paragraph', text: part }
    })

// The reverse of toBlocks, used by the editor.
export const fromBlocks = blocks =>
  blocks
    .map(block => {
      if (block.type === 'image') return `![${(block.alt || '').replace(/[\]\n]/g, ' ')}](${block.url})`
      if (block.type === 'video') return `@[video](${block.url})`
      const text = (block.text || '').trim()
      if (!text) return ''
      if (block.type === 'heading') return `## ${text.replace(/\n+/g, ' ')}`
      if (block.type === 'quote') return text.replace(/^/gm, '> ')

      return text
    })
    .filter(Boolean)
    .join('\n\n')
