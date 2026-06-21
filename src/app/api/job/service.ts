import { scrapeJobReportFromLink } from '@/lib/service'

export class JobServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
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

export async function getJobReport(link: string) {
  try {
    const job = await scrapeJobReportFromLink(link)

    if (!job) {
      throw new JobServiceError('Unable to scrape job details', 502)
    }

    return job
  } catch (error) {
    if (error instanceof JobServiceError) {
      throw error
    }

    throw new JobServiceError(
      error instanceof Error ? error.message : 'Unable to scrape job details',
      getScrapeErrorStatus(error),
    )
  }
}
