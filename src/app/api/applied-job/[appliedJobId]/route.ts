import { NextResponse } from 'next/server'
import * as z from 'zod'
import { withAuth } from '@/lib/auth'
import { updateAppliedJobSchema } from '@/lib/schema'
import {
  AppliedJobServiceError,
  deleteAppliedJob,
  getAppliedJob,
  updateAppliedJob,
} from '../service'

type AppliedJobRouteContext = {
  params: Promise<{
    appliedJobId: string
  }>
}

export const GET = withAuth<AppliedJobRouteContext>(
  async (_request, context, user) => {
    const { appliedJobId } = await context.params
    const appliedJob = await getAppliedJob(appliedJobId, user.id)

    if (!appliedJob) {
      return NextResponse.json(
        { message: 'Applied job not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ appliedJob })
  },
)

export const PUT = withAuth<AppliedJobRouteContext>(
  async (request, context, user) => {
    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { message: 'Invalid JSON body' },
        { status: 400 },
      )
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

    try {
      const appliedJob = await updateAppliedJob({
        appliedJobId,
        userId: user.id,
        values: result.data,
      })

      return NextResponse.json({ appliedJob })
    } catch (error) {
      if (error instanceof AppliedJobServiceError) {
        return NextResponse.json(
          { message: error.message },
          { status: error.status },
        )
      }

      throw error
    }
  },
)

export const DELETE = withAuth<AppliedJobRouteContext>(
  async (_request, context, user) => {
    const { appliedJobId } = await context.params
    const deleted = await deleteAppliedJob(appliedJobId, user.id)

    if (!deleted) {
      return NextResponse.json(
        { message: 'Applied job not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ message: 'Applied job deleted' })
  },
)
