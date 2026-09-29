import { currentUser, publicUser } from 'src/server/session'
import { allowMethods, sendError } from 'src/server/http'

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return

  const user = await currentUser(req)
  if (!user) return sendError(res, 401, 'unauthenticated')

  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).json({ user: publicUser(user) })
}
