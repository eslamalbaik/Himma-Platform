// Shared by the smart-card pages (public /c/{slug}) and their editor in the dashboard (/admin/cards).

export const CARD_KINDS = ['author', 'business', 'education', 'government']

export const LINK_TYPES = [
  'website',
  'store',
  'email',
  'whatsapp',
  'x',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'other'
]

export const BOOK_FORMATS = ['print', 'digital', 'both']

export const EVENT_TYPES = ['launch', 'seminar', 'meeting', 'signing', 'other']

export const KIND_ICONS = {
  author: 'tabler:book-2',
  business: 'tabler:briefcase',
  education: 'tabler:school',
  government: 'tabler:building-bank'
}

export const LINK_ICONS = {
  website: 'tabler:world',
  store: 'tabler:shopping-bag',
  email: 'tabler:mail',
  whatsapp: 'tabler:brand-whatsapp',
  x: 'tabler:brand-twitter',
  instagram: 'tabler:brand-instagram',
  facebook: 'tabler:brand-facebook',
  linkedin: 'tabler:brand-linkedin',
  youtube: 'tabler:brand-youtube',
  tiktok: 'tabler:brand-tiktok',
  other: 'tabler:link'
}

// The amber identity of Hinnah cards; each card may pick its own accent colour.
export const AMBER = '#9A5B13'
export const CREAM = '#FBF6EE'
export const GOLD = '#D9A441'

// Text of a record in the current language, falling back to the other one.
export const pick = (row, prefix, lang) =>
  (lang === 'en' ? row?.[`${prefix}En`] : row?.[`${prefix}Ar`]) || row?.[`${prefix}En`] || row?.[`${prefix}Ar`] || ''

// The address written on the NFC tag and in the QR code; `src` tells the page how it was opened.
export const cardUrl = (slug, src) => {
  const origin = typeof window === 'undefined' ? '' : window.location.origin

  return `${origin}/c/${slug}/${src ? `?src=${src}` : ''}`
}

export const eventUrl = (slug, eventId) => `/c/${slug}/events/${eventId}/`

export const formatDateTime = (iso, lang) =>
  iso
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-AE', { dateStyle: 'full', timeStyle: 'short' }).format(
        new Date(iso)
      )
    : ''

export const isUpcoming = event => new Date(event.startsAt).getTime() > Date.now() - 3 * 60 * 60 * 1000

// A contact file (vCard 3.0) that phones add straight to the address book.
export const downloadVCard = (card, lang) => {
  const escape = value =>
    String(value || '')
      .replace(/([,;\\])/g, '\\$1')
      .replace(/\n/g, '\\n')
  const website = (card.links || []).find(link => link.type === 'website')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(pick(card, 'name', lang))}`,
    card.headlineAr || card.headlineEn ? `TITLE:${escape(pick(card, 'headline', lang))}` : null,
    card.email ? `EMAIL;TYPE=INTERNET:${card.email}` : null,
    card.phone ? `TEL;TYPE=CELL:${card.phone.replace(/[^+\d]/g, '')}` : null,
    website ? `URL:${website.url}` : null,
    `URL;TYPE=Hinnah:${cardUrl(card.slug)}`,
    'END:VCARD'
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${card.slug}.vcf`
  anchor.click()
  URL.revokeObjectURL(href)
}
