import bcrypt from 'bcryptjs'

import { prisma } from 'src/server/db'
import { audit } from 'src/server/audit'
import { isPlatformRole } from 'src/configs/roles'
import { startSession, publicUser } from 'src/server/session'
import { allowMethods, clientIp, isSameOriginJson, sendError } from 'src/server/http'
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from 'src/server/rateLimit'

// Compared against when the email is unknown, so both paths take about the same time.
const DUMMY_HASH = '$2a$12$AQxTVhIiavTxkJuyDJi6Je2AnEAIUb.ijqRse4fLT3APYwsjGap9.'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return
  if (!isSameOriginJson(req)) return sendError(res, 403, 'bad_origin')

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const remember = req.body?.remember === true

  if (!email || !password || password.length > 200) return sendError(res, 400, 'invalid_credentials')

  const limitKeys = [`ip:${clientIp(req)}`, `email:${email}`]
  if (isLoginBlocked(limitKeys)) {
    await audit(req, { action: 'auth.login_blocked', actorEmail: email })

    return sendError(res, 429, 'too_many_attempts')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !passwordOk || user.status !== 'active') {
    recordLoginFailure(limitKeys)
    await audit(req, {
      action: 'auth.login_failed',
      actorEmail: email,
      metadata: { reason: !user ? 'unknown_email' : !passwordOk ? 'wrong_password' : 'disabled' }
    })

    return sendError(res, 401, 'invalid_credentials')
  }

  // Only the super admin dashboard exists so far; client (tenant) accounts get their own dashboard later.
  if (!isPlatformRole(user.role)) {
    await audit(req, { action: 'auth.login_denied', actor: user, metadata: { reason: 'no_dashboard_for_role' } })

    return sendError(res, 403, 'dashboard_not_available')
  }

  clearLoginFailures(limitKeys)
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await startSession(res, updated, remember)
  await audit(req, { action: 'auth.login', actor: updated, metadata: { remember } })

  return res.status(200).json({ user: publicUser(updated) })
}
