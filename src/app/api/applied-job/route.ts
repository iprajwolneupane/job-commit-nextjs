import { NextResponse, type NextRequest } from 'next/server'
import * as z from 'zod'
import {
  endOfDay,
  endOfMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { AppliedJobResponseEnum } from '@/generated/prisma/enums'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { appliedJobResponseValues, createAppliedJobSchema } from '@/lib/schema'

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

function parseDateFilter(value: string | null, boundary: 'start' | 'end') {
  if (!value) return undefined

  const parsed = parseISO(value)

  if (!isValid(parsed)) return undefined

  return boundary === 'start' ? startOfDay(parsed) : endOfDay(parsed)
}

function getAppliedDateFilter(fromDate?: Date, toDate?: Date) {
  if (fromDate || toDate) {
    return {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    }
  }

  const now = new Date()

  return {
    gte: startOfMonth(now),
    lte: endOfMonth(now),
  }
}

function sanitizeSearch(value: string | null) {
  return (value ?? '').toLowerCase().replace(/\s+/g, '')
}

function isAppliedJobResponse(
  value: string | null,
): value is (typeof appliedJobResponseValues)[number] {
  return appliedJobResponseValues.includes(
    value as (typeof appliedJobResponseValues)[number],
  )
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const fromDate = parseDateFilter(
    request.nextUrl.searchParams.get('fromDate'),
    'start',
  )
  const toDate = parseDateFilter(
    request.nextUrl.searchParams.get('toDate'),
    'end',
  )
  const query = sanitizeSearch(request.nextUrl.searchParams.get('query'))
  const responseParam = request.nextUrl.searchParams.get('response')
  const response = isAppliedJobResponse(responseParam)
    ? responseParam
    : undefined
  const appliedDateFilter = getAppliedDateFilter(fromDate, toDate)

  const appliedJobs = await prisma.appliedJob.findMany({
    where: {
      userId: user.id,
      ...(response ? { response } : {}),
      appliedDate: appliedDateFilter,
    },
    orderBy: {
      appliedDate: 'desc',
    },
    select: appliedJobSelect,
  })

  const filteredAppliedJobs = query
    ? appliedJobs.filter((job) => {
        const company = sanitizeSearch(job.company)
        const position = sanitizeSearch(job.position)

        return company.includes(query) || position.includes(query)
      })
    : appliedJobs

  return NextResponse.json({ appliedJobs: filteredAppliedJobs })
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

  if (!(await userOwnsPlatform(user.id, result.data.platformId))) {
    return NextResponse.json({ message: 'Platform not found' }, { status: 404 })
  }

  const appliedJob = await prisma.appliedJob.create({
    data: {
      userId: user.id,
      appliedDate: result.data.appliedDate,
      platformId: result.data.platformId,
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
