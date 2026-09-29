import { prisma } from 'src/server/db'
import { audit } from 'src/server/audit'
import { currentUser, endSession } from 'src/server/session'
import { allowMethods, isSameOriginJson, sendError } from 'src/server/http'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return
  if (!isSameOriginJson(req)) return sendError(res, 403, 'bad_origin')

  const user = await currentUser(req)
  endSession(res)
  if (user) {
    // Invalidate the token itself too, so a copied cookie stops working after sign-out.
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } })
    await audit(req, { action: 'auth.logout', actor: user })
  }

  return res.status(204).end()
}
