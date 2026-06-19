import { NextResponse, type NextRequest } from 'next/server'
import * as z from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { platformSchema } from '@/lib/schema'

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

type PlatformRouteContext = {
  params: Promise<{
    platformId: string
  }>
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status })
}

async function readJson(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function platformNameExists(userId: string, name: string, id: string) {
  const normalizedName = name.trim().toLowerCase()
  const platforms = await prisma.platform.findMany({
    where: {
      userId,
      NOT: {
        id,
      },
    },
    select: {
      name: true,
    },
  })

  return platforms.some(
    (platform) => platform.name.trim().toLowerCase() === normalizedName,
  )
}

export async function GET(
  request: NextRequest,
  context: PlatformRouteContext,
) {
  const user = await getCurrentUser(request)

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const { platformId } = await context.params
  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId: user.id,
    },
    select: platformSelect,
  })

  if (!platform) {
    return jsonError('Platform not found', 404)
  }

  return NextResponse.json({ platform })
}

export async function PUT(
  request: NextRequest,
  context: PlatformRouteContext,
) {
  const user = await getCurrentUser(request)

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const body = await readJson(request)

  if (!body) {
    return jsonError('Invalid JSON body', 400)
  }

  const result = platformSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid platform details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  const { platformId } = await context.params
  const existingPlatform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId: user.id,
    },
    select: {
      id: true,
    },
  })

  if (!existingPlatform) {
    return jsonError('Platform not found', 404)
  }

  if (await platformNameExists(user.id, result.data.name, platformId)) {
    return jsonError('Platform already exists', 409)
  }

  const platform = await prisma.platform.update({
    where: {
      id: existingPlatform.id,
    },
    data: {
      name: result.data.name,
    },
    select: platformSelect,
  })

  return NextResponse.json({ platform })
}

export async function DELETE(
  request: NextRequest,
  context: PlatformRouteContext,
) {
  const user = await getCurrentUser(request)

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const { platformId } = await context.params
  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId: user.id,
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
    return jsonError('Platform not found', 404)
  }

  if (platform._count.appliedJobs > 0) {
    return jsonError('Platform is used by applied jobs', 409)
  }

  await prisma.platform.delete({
    where: {
      id: platform.id,
    },
  })

  return NextResponse.json({ message: 'Platform deleted' })
}
