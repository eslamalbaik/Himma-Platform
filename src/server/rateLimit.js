// In-memory limiter for failed sign-ins. It resets when the server restarts and is per
// process, which is enough for a single server; move it to Redis when scaling out.
const WINDOW_MS = 15 * 60 * 1000
// Per account, and a looser limit per IP so one office network is not locked out by a single user.
const MAX_FAILURES = { email: 5, ip: 20 }

const failures = new Map()

const recent = key => {
  const now = Date.now()
  const list = (failures.get(key) || []).filter(t => now - t < WINDOW_MS)
  failures.set(key, list)

  return list
}

export const isLoginBlocked = keys =>
  keys.some(key => recent(key).length >= (MAX_FAILURES[key.split(':')[0]] ?? MAX_FAILURES.email))

export const recordLoginFailure = keys => keys.forEach(key => recent(key).push(Date.now()))

export const clearLoginFailures = keys => keys.forEach(key => failures.delete(key))
