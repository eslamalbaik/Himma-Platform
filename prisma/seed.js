/* eslint-disable no-console */
// Creates the first super admin account. Safe to re-run: existing users are left as they are.
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@himma.local').toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!password || password.length < 10) {
    throw new Error('Set SEED_ADMIN_PASSWORD (10+ characters) in .env before seeding.')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Super admin ${email} already exists, nothing to do.`)

    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      nameAr: 'مدير المنصة',
      nameEn: 'Platform Owner',
      role: 'super_admin'
    }
  })
  console.log(`Created super admin ${email}`)
}

main()
  .catch(e => {
    console.error(e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
