import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import type { PrismaClient as PrismaClientType } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientType
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaPg({ connectionString })

const cachedPrisma = globalForPrisma.prisma

export const prisma =
  cachedPrisma && 'appliedJob' in cachedPrisma
    ? cachedPrisma
    : new PrismaClient({
        adapter,
      })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
