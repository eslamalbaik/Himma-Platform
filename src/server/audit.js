import { prisma } from 'src/server/db'
import { clientIp } from 'src/server/http'

// Writes one audit row. Never throws: a failed audit write must not break the request,
// but it is reported on the server console.
export const audit = async (req, { action, actor = null, actorEmail = null, entityType, entityId, metadata }) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? actorEmail,
        tenantId: actor?.tenantId ?? null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip: clientIp(req),
        userAgent: req.headers['user-agent']?.slice(0, 500) ?? null
      }
    })
  } catch (e) {
    console.error('Audit write failed', action, e)
  }
}
