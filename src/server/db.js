import { PrismaClient } from '@prisma/client'

// One client per server process; reused across hot reloads in development.
const globalForPrisma = globalThis

export const prisma = globalForPrisma.himmaPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.himmaPrisma = prisma
