import { NextResponse, type NextRequest } from 'next/server'
import * as z from 'zod'
import { AppliedJobResponseEnum } from '@/generated/prisma/enums'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAppliedJobSchema } from '@/lib/schema'

const appliedJobSelect = {
  id: true,
  userId: true,
  appliedDate: true,
  platform: true,
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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const appliedJobs = await prisma.appliedJob.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      appliedDate: 'desc',
    },
    select: appliedJobSelect,
  })

  return NextResponse.json({ appliedJobs })
}

export async function POST(request: NextRequest) {
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

  const result = createAppliedJobSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid applied job details',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  const appliedJob = await prisma.appliedJob.create({
    data: {
      userId: user.id,
      appliedDate: result.data.appliedDate,
      platform: result.data.platform,
      company: result.data.company,
      position: result.data.position,
      sendMailAt: getSendMailAt(result.data.appliedDate),
      response: result.data.response ?? AppliedJobResponseEnum.NORESPONSE,
      link: result.data.link,
    },
    select: appliedJobSelect,
  })

  return NextResponse.json({ appliedJob }, { status: 201 })
}
