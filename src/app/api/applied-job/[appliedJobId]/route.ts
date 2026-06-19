import { NextResponse, type NextRequest } from 'next/server'
import * as z from 'zod'
import { ScrapeStatus } from '@/generated/prisma/enums'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateAppliedJobSchema } from '@/lib/schema'

const appliedJobSelect = {
  id: true,
  userId: true,
  platformId: true,
  appliedDate: true,
  platform: {
    select: {
      id: true,
      name: true,
    },
  },
  company: true,
  position: true,
  sendMailAt: true,
  sentMail: true,
  response: true,
  link: true,
} as const

function getSendMailAt(appliedDate: Date) {
  return new Date(appliedDate.getTime() + 3 * 24 * 60 * 60 * 1000)
}

async function userOwnsPlatform(userId: string, platformId: string) {
  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId,
    },
    select: {
      id: true,
    },
  })

  return Boolean(platform)
}

type AppliedJobRouteContext = {
  params: Promise<{
    appliedJobId: string
  }>
}

export async function GET(
  request: NextRequest,
  context: AppliedJobRouteContext,
) {
  const user = await getCurrentUser(request)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { appliedJobId } = await context.params
  const appliedJob = await prisma.appliedJob.findFirst({
    where: {
      id: appliedJobId,
      userId: user.id,
    },
    select: appliedJobSelect,
  })

  if (!appliedJob) {
    return NextResponse.json(
      { message: 'Applied job not found' },
      { status: 404 },
    )
  }

  return NextResponse.json({ appliedJob })
}

export async function PUT(
  request: NextRequest,
  context: AppliedJobRouteContext,
) {
  const user = await getCurrentUser(request)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = updateAppliedJobSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid applied job details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  const { appliedJobId } = await context.params
  const existingAppliedJob = await prisma.appliedJob.findFirst({
    where: {
      id: appliedJobId,
      userId: user.id,
    },
    select: {
      id: true,
      link: true,
      sentMail: true,
    },
  })

  if (!existingAppliedJob) {
    return NextResponse.json(
      { message: 'Applied job not found' },
      { status: 404 },
    )
  }

  if (result.data.sentMail === false) {
    return NextResponse.json(
      { message: 'Sent mail status cannot be reverted' },
      { status: 400 },
    )
  }

  if (
    result.data.platformId &&
    !(await userOwnsPlatform(user.id, result.data.platformId))
  ) {
    return NextResponse.json({ message: 'Platform not found' }, { status: 404 })
  }

  const updateData = {
    ...result.data,
    ...(result.data.appliedDate
      ? { sendMailAt: getSendMailAt(result.data.appliedDate) }
      : {}),
  }
  const linkChanged =
    typeof result.data.link === 'string' &&
    result.data.link !== existingAppliedJob.link

  const appliedJob = await prisma.$transaction(async (tx) => {
    const updatedAppliedJob = await tx.appliedJob.update({
      where: {
        id: existingAppliedJob.id,
      },
      data: updateData,
      select: appliedJobSelect,
    })

    if (linkChanged) {
      await tx.scrappedJob.deleteMany({
        where: {
          appliedJobId: existingAppliedJob.id,
        },
      })

      await tx.scrappedJob.create({
        data: {
          appliedJobId: existingAppliedJob.id,
          link: result.data.link!,
          scrapeStatus: ScrapeStatus.PENDING,
        },
      })
    }

    return updatedAppliedJob
  })

  return NextResponse.json({ appliedJob })
}

export async function DELETE(
  request: NextRequest,
  context: AppliedJobRouteContext,
) {
  const user = await getCurrentUser(request)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { appliedJobId } = await context.params
  const result = await prisma.appliedJob.deleteMany({
    where: {
      id: appliedJobId,
      userId: user.id,
    },
  })

  if (result.count === 0) {
    return NextResponse.json(
      { message: 'Applied job not found' },
      { status: 404 },
    )
  }

  return NextResponse.json({ message: 'Applied job deleted' })
}
