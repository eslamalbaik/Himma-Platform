// Same lists as App\Models\Event.
export const TYPES = ['webinar', 'conference', 'workshop', 'course', 'meeting']
export const FORMATS = ['online', 'onsite', 'hybrid']
export const VISIBILITIES = ['public', 'members', 'institutional']
export const STATUSES = ['draft', 'scheduled', 'live', 'ended', 'cancelled']

export const statusColors = {
  draft: 'secondary',
  scheduled: 'info',
  live: 'error',
  ended: 'success',
  cancelled: 'secondary'
}

export const formatDateTime = (value, lang) =>
  value
    ? new Date(value).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
    : '-'

// ISO string → value for <input type="datetime-local"> in the browser's time zone, and back.
export const toLocalInput = iso => {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = n => String(n).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

export const fromLocalInput = value => (value ? new Date(value).toISOString() : null)

// Embed address for a YouTube watch, short, live or embed link; null for anything else.
// `privacyEnhanced` (Settings → YouTube) embeds from youtube-nocookie.com.
export const youtubeEmbedUrl = (url, privacyEnhanced = false) => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\.|^m\./, '')
    let id = null
    if (host === 'youtu.be') id = parsed.pathname.slice(1)
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:live|embed|shorts)\/([^/?]+)/)?.[1]
    }

    const embedHost = privacyEnhanced ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com'

    return id && /^[\w-]{6,20}$/.test(id) ? `${embedHost}/embed/${id}` : null
  } catch {
    return null
  }
}
