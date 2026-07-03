import { NextResponse } from 'next/server'
import * as z from 'zod'
import { withAuth } from '@/lib/auth'
import { getJobReportSchema } from '@/lib/schema'
import { JobServiceError, getJobReport } from '../service'

export const POST = withAuth(async (request, _context, user) => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = getJobReportSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        message: 'Invalid job link',
        errors: z.flattenError(result.error).fieldErrors,
      },
      { status: 400 },
    )
  }

  try {
    const report = await getJobReport(result.data.link, user)

    return NextResponse.json({
      message: 'Job report generated',
      report: report.skillMatch,
      title: report.title,
    })
  } catch (error) {
    if (error instanceof JobServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      )
    }

    throw error
  }
})
