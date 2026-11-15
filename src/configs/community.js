// Hinnah's two language communities (CLAUDE.md, "Language communities"): Arabic at `/`, English at `/en/...`.
// The path's language is the community, on the public site and in the dashboard alike (the English community's
// dashboard is `/en/admin`, in English; CommunitySwitcher moves between them). Every API request says it in the
// `X-Community` header. Staff limited to one community always get theirs from the server.

// ** Third Party Imports
import axios from 'axios'

export const COMMUNITIES = ['ar', 'en']

let locale = 'ar'

// Called by _app on every render with the current path's language.
export const setRoute = routeLocale => {
  locale = COMMUNITIES.includes(routeLocale) ? routeLocale : 'ar'
}

export const currentCommunity = () => locale

axios.interceptors.request.use(config => {
  // Only our own API (relative URLs); other origins would need a CORS preflight for the header.
  if (typeof config.url === 'string' && config.url.startsWith('/')) config.headers['X-Community'] = currentCommunity()

  return config
})

// Forms ask for names and texts in their community's language only (owner's decision): an Arabic community
// form shows `nameAr`, an English one `nameEn`, and the server copies it into the other language.
// `record` is the record being edited (its own community wins), else the current community applies.
export const formLanguage = record => (COMMUNITIES.includes(record?.community) ? record.community : currentCommunity())

// 'name' in 'en' → 'nameEn'.
export const inLanguage = (base, lang) => `${base}${lang === 'en' ? 'En' : 'Ar'}`

// Drops the other language's copy of each field before sending, so the server fills it from this one.
export const onlyLanguage = (data, bases, lang) => {
  const copy = { ...data }
  bases.forEach(base => delete copy[inLanguage(base, lang === 'en' ? 'ar' : 'en')])

  return copy
}
