import { prisma } from '@/lib/prisma'
import type { PlatformValues } from '@/lib/schema'

const platformSelect = {
  id: true,
  userId: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      appliedJobs: true,
    },
  },
} as const

export class PlatformServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function platformNameExists(userId: string, name: string, ignoreId?: string) {
  const normalizedName = name.trim().toLowerCase()
  const platforms = await prisma.platform.findMany({
    where: {
      userId,
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
    select: {
      name: true,
    },
  })

  return platforms.some(
    (platform) => platform.name.trim().toLowerCase() === normalizedName,
  )
}

export function listPlatforms(userId: string) {
  return prisma.platform.findMany({
    where: {
      userId,
    },
    orderBy: {
      name: 'asc',
    },
    select: platformSelect,
  })
}

export async function createPlatform(userId: string, values: PlatformValues) {
  if (await platformNameExists(userId, values.name)) {
    throw new PlatformServiceError('Platform already exists', 409)
  }

  return prisma.platform.create({
    data: {
      userId,
      name: values.name,
    },
    select: platformSelect,
  })
}

export function getPlatform(platformId: string, userId: string) {
  return prisma.platform.findFirst({
    where: {
      id: platformId,
      userId,
    },
    select: platformSelect,
  })
}

export async function updatePlatform({
  platformId,
  userId,
  values,
}: {
  platformId: string
  userId: string
  values: PlatformValues
}) {
  const existingPlatform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId,
    },
    select: {
      id: true,
    },
  })

  if (!existingPlatform) {
    throw new PlatformServiceError('Platform not found', 404)
  }

  if (await platformNameExists(userId, values.name, platformId)) {
    throw new PlatformServiceError('Platform already exists', 409)
  }

  return prisma.platform.update({
    where: {
      id: existingPlatform.id,
    },
    data: {
      name: values.name,
    },
    select: platformSelect,
  })
}

export async function deletePlatform(platformId: string, userId: string) {
  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId,
    },
    select: {
      id: true,
      _count: {
        select: {
          appliedJobs: true,
        },
      },
    },
  })

  if (!platform) {
    throw new PlatformServiceError('Platform not found', 404)
  }

  if (platform._count.appliedJobs > 0) {
    throw new PlatformServiceError('Platform is used by applied jobs', 409)
  }

  await prisma.platform.delete({
    where: {
      id: platform.id,
    },
  })
}
