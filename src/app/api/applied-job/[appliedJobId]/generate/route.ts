import { NextResponse } from 'next/server'
import { ScrapeStatus } from '@/generated/prisma/enums'
import { withAuth } from '@/lib/auth'
import {
  AppliedJobServiceError,
  buildFollowUpEmailStream,
  getAppliedJobForGeneration,
} from '../../service'

type AppliedJobGenerateRouteContext = {
  params: Promise<{
    appliedJobId: string
  }>
}

export const GET = withAuth<AppliedJobGenerateRouteContext>(
  async (_request, context, user) => {
    const { appliedJobId } = await context.params
    const appliedJob = await getAppliedJobForGeneration(appliedJobId, user.id)

    if (!appliedJob) {
      return NextResponse.json(
        { message: 'Applied job not found' },
        { status: 404 },
      )
    }

    if (!appliedJob.scrappedJob) {
      return NextResponse.json(
        { message: 'Scraped job data not found' },
        { status: 404 },
      )
    }

    if (appliedJob.scrappedJob.scrapeStatus !== ScrapeStatus.COMPLETED) {
      return NextResponse.json(
        { message: 'Scraped job data is not ready yet' },
        { status: 409 },
      )
    }

    try {
      return new Response(buildFollowUpEmailStream(appliedJob, user), {
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Accel-Buffering': 'no',
        },
      })
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
