import { NextResponse } from 'next/server'
import * as z from 'zod'
import { withAuth } from '@/lib/auth'
import { createAppliedJobSchema } from '@/lib/schema'
import {
  AppliedJobServiceError,
  createAppliedJob,
  listAppliedJobs,
} from './service'

export const GET = withAuth(async (request, _context, user) => {
  const appliedJobs = await listAppliedJobs(user.id, {
    fromDate: request.nextUrl.searchParams.get('fromDate'),
    toDate: request.nextUrl.searchParams.get('toDate'),
    query: request.nextUrl.searchParams.get('query'),
    response: request.nextUrl.searchParams.get('response'),
  })

  return NextResponse.json({ appliedJobs })
})

export const POST = withAuth(async (request, _context, user) => {
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

  try {
    const appliedJob = await createAppliedJob(user.id, result.data)

    return NextResponse.json({ appliedJob }, { status: 201 })
  } catch (error) {
    if (error instanceof AppliedJobServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
})
