import { type NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { getJobReportSchema } from '@/lib/schema'
import { scrapeJobReportFromLink } from '@/lib/service'

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status })
}

async function readRequestJson(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function getScrapeErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 502
  }

  if (
    error.message === 'Only LinkedIn job links are supported for now' ||
    error.message === 'Could not find LinkedIn job id from this link'
  ) {
    return 400
  }

  return 502
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)

  if (!user) {
    return jsonError('Unauthorized', 401)
  }

  const body = await readRequestJson(request)

  if (!body) {
    return jsonError('Invalid JSON body', 400)
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
    const job = await scrapeJobReportFromLink(result.data.link)

    if (!job) {
      return jsonError('Unable to scrape job details', 502)
    }

    return NextResponse.json({
      message: 'Job report generated',
      job,
    })
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to scrape job details',
      getScrapeErrorStatus(error),
    )
  }
}
