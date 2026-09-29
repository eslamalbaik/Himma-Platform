// Small helpers shared by API routes.

export const clientIp = req => {
  const forwarded = req.headers['x-forwarded-for']

  return (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.socket?.remoteAddress || null
}

// Errors carry a stable code; the browser translates it (public/locales/*.json, key `errors.<code>`).
export const sendError = (res, status, code) => res.status(status).json({ error: { code } })

export const allowMethods = (req, res, methods) => {
  if (methods.includes(req.method)) return true
  res.setHeader('Allow', methods.join(', '))
  sendError(res, 405, 'method_not_allowed')

  return false
}

// CSRF defence for cookie-authenticated writes: the session cookie is SameSite=Lax,
// and state-changing requests must come from this site with a JSON body.
export const isSameOriginJson = req => {
  const origin = req.headers.origin
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return false
    } catch {
      return false
    }
  }

  return (req.headers['content-type'] || '').startsWith('application/json')
}
