import { SignJWT, jwtVerify } from 'jose'

import { prisma } from 'src/server/db'

export const SESSION_COOKIE = 'himma_session'
const SHORT_SESSION_SECONDS = 8 * 60 * 60
const LONG_SESSION_SECONDS = 30 * 24 * 60 * 60

const secretKey = () => {
  const secret = process.env.AUTH_SECRET
  const weak = !secret || secret.length < 32 || secret.startsWith('change-me')
  if (weak) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET must be set to a random value of at least 32 characters.')
    }

    return new TextEncoder().encode('himma-development-only-secret-do-not-use-in-production')
  }

  return new TextEncoder().encode(secret)
}

const serializeCookie = (value, maxAgeSeconds) => {
  const parts = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (maxAgeSeconds !== null) parts.push(`Max-Age=${maxAgeSeconds}`)
  if (process.env.NODE_ENV === 'production') parts.push('Secure')

  return parts.join('; ')
}

// `remember` keeps the session for 30 days; otherwise the cookie ends with the browser session
// and the token itself expires after 8 hours.
export const startSession = async (res, user, remember) => {
  const lifetime = remember ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS

  const token = await new SignJWT({ ver: user.tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${lifetime}s`)
    .sign(secretKey())

  res.setHeader('Set-Cookie', serializeCookie(token, remember ? lifetime : null))
}

export const endSession = res => {
  res.setHeader('Set-Cookie', serializeCookie('', 0))
}

const readCookie = req => {
  const header = req.headers.cookie || ''
  const match = header.split(/;\s*/).find(c => c.startsWith(`${SESSION_COOKIE}=`))

  return match ? match.slice(SESSION_COOKIE.length + 1) : null
}

// Returns the signed-in, active user for this request, or null.
export const currentUser = async req => {
  const token = readCookie(req)
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] })
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.status !== 'active' || user.tokenVersion !== payload.ver) return null

    return user
  } catch {
    return null
  }
}

// Only these fields ever leave the server.
export const publicUser = user => ({
  id: user.id,
  email: user.email,
  nameAr: user.nameAr,
  nameEn: user.nameEn,
  role: user.role,
  locale: user.locale,
  tenantId: user.tenantId
})
