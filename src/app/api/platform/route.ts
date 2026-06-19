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

async function platformNameExists(userId: string, name: string) {
  const normalizedName = name.trim().toLowerCase()
  const platforms = await prisma.platform.findMany({
    where: {
      userId,
    },
    select: {
      name: true,
    },
  })

  return platforms.some(
    (platform) => platform.name.trim().toLowerCase() === normalizedName,
  )
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const platforms = await prisma.platform.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      name: 'asc',
    },
    select: platformSelect,
  })

  return NextResponse.json({ platforms })
}

export async function POST(request: NextRequest) {
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

  if (await platformNameExists(user.id, result.data.name)) {
    return jsonError('Platform already exists', 409)
  }

  const platform = await prisma.platform.create({
    data: {
      userId: user.id,
      name: result.data.name,
    },
    select: platformSelect,
  })

  return NextResponse.json({ platform }, { status: 201 })
}
