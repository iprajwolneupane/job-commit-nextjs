import axios from 'axios'

const LINKEDIN_DOMAIN_REGEX = /(^|\.)linkedin\.com$/i
const LINKEDIN_JOB_VIEW_REGEX = /^\/jobs\/view\/(\d+)(?:\/.*)?$/i
const REED_DOMAIN_REGEX = /(^|\.)reed\.co\.uk$/i
const REED_JOB_VIEW_REGEX = /^\/jobs\/[^/]+\/(\d+)(?:\/.*)?$/i
const NUMERIC_ID_REGEX = /^\d+$/
const LINKEDIN_JOB_POSTING_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting'
const LINKEDIN_REQUEST_TIMEOUT_MS = 5000
const LINKEDIN_SCRAPE_RETRIES = 3
const LINKEDIN_RETRY_BACKOFF_MS = 1000
const REED_JOB_POSTING_URL = 'https://www.reed.co.uk/api/1.0/jobs'
const REED_REQUEST_TIMEOUT_MS = 5000
export const SUPPORTED_SCRAPE_PLATFORMS = ['LinkedIn', 'Reed'] as const
export const UNSUPPORTED_JOB_LINK_ERROR =
  'Only LinkedIn and Reed job links are supported for now'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

type SupportedScrapePlatform = (typeof SUPPORTED_SCRAPE_PLATFORMS)[number]

export type ScrapedJobReport = {
  link: string
  platform: string
  title: string
  description: string
}

type ScrapeJobLink = {
  platform: SupportedScrapePlatform | null
  jobId: string | null
}

type ReedJobPostingResponse = {
  employerId: number
  employerName: string
  jobId: number
  jobTitle: string
  locationName: string
  minimumSalary: number | null
  maximumSalary: number | null
  yearlyMinimumSalary: number | null
  yearlyMaximumSalary: number | null
  currency: string
  salaryType: string
  salary: string
  datePosted: string
  expirationDate: string
  externalUrl: string | null
  jobUrl: string
  partTime: boolean
  fullTime: boolean
  contractType: string
  jobDescription: string
  applicationCount: number
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeDescriptionText(value: string) {
  return normalizeText(
    value
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\bApply now\b/gi, '')
      .replace(/\bSave job\b/gi, '')
      .replace(/\bSign in to apply\b/gi, '')
      .replace(/\bCreate job alert\b/gi, '')
      .replace(/\bCookie policy\b/gi, '')
      .replace(/\bPrivacy policy\b/gi, '')
      .replace(/\bTerms and conditions\b/gi, '')
      .replace(/\bShow\s+(more|less)\b/gi, ''),
  )
}

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code: string) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  )
}

function getLastNumericPathSegment(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (NUMERIC_ID_REGEX.test(segments[index])) {
      return segments[index]
    }
  }

  return null
}

export async function sanitizeJobDescription(value: string) {
  const cheerio = await import('cheerio')
  const html = decodeEscapedUnicode(value)
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, '\n')

  const $ = cheerio.load(html)
  $('script, style, noscript').remove()

  return normalizeDescriptionText($.root().text())
}

export function isSupportedScrapePlatform(platformName: string) {
  return SUPPORTED_SCRAPE_PLATFORMS.some(
    (platform) => platform.toLowerCase() === platformName.toLowerCase(),
  )
}

function getScrapeJobLink(link: string): ScrapeJobLink {
  const url = new URL(link)
  const isLinkedIn = LINKEDIN_DOMAIN_REGEX.test(url.hostname)

  if (isLinkedIn) {
    const queryJobId = url.searchParams.get('currentJobId')

    if (queryJobId && NUMERIC_ID_REGEX.test(queryJobId)) {
      return { platform: 'LinkedIn', jobId: queryJobId }
    }

    return {
      platform: 'LinkedIn',
      jobId: url.pathname.match(LINKEDIN_JOB_VIEW_REGEX)?.[1] ?? null,
    }
  }

  const isReed = REED_DOMAIN_REGEX.test(url.hostname)

  if (isReed) {
    const pathJobId = url.pathname.match(REED_JOB_VIEW_REGEX)?.[1] ?? null
    const queryJobId =
      url.searchParams.get('jobId') ?? url.searchParams.get('jobid')

    if (pathJobId) {
      return { platform: 'Reed', jobId: pathJobId }
    }

    if (queryJobId && NUMERIC_ID_REGEX.test(queryJobId)) {
      return { platform: 'Reed', jobId: queryJobId }
    }

    return {
      platform: 'Reed',
      jobId: getLastNumericPathSegment(url.pathname),
    }
  }

  return { platform: null, jobId: null }
}

async function fetchLinkedInJobPostingHtml(jobId: string) {
  const response = await axios.get<string>(
    `${LINKEDIN_JOB_POSTING_URL}/${jobId}`,
    {
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: LINKEDIN_REQUEST_TIMEOUT_MS,
    },
  )

  return response.data
}

function getReedApiKey() {
  const apiKey = process.env.REED_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('REED_API_KEY is not configured')
  }

  return apiKey
}

async function parseReedJobPosting(
  data: ReedJobPostingResponse,
): Promise<ScrapedJobReport | null> {
  const title = normalizeText(data.jobTitle)
  const description = await sanitizeJobDescription(data.jobDescription)

  if (!title || !description) {
    return null
  }

  return {
    link: data.jobUrl,
    platform: 'Reed',
    title,
    description,
  }
}

async function fetchReedJobPosting(
  jobId: string,
): Promise<ScrapedJobReport | null> {
  const response = await axios.get<ReedJobPostingResponse>(
    `${REED_JOB_POSTING_URL}/${jobId}`,
    {
      headers: {
        Accept: 'application/json',
      },
      timeout: REED_REQUEST_TIMEOUT_MS,
      auth: {
        username: getReedApiKey(),
        password: '',
      },
    },
  )

  return parseReedJobPosting(response.data)
}

async function parseLinkedInJobPosting(
  html: string,
  link: string,
): Promise<ScrapedJobReport | null> {
  const cheerio = await import('cheerio')
  const $ = cheerio.load(html)
  const title = normalizeText($('.topcard__title').first().text())
  const description = await sanitizeJobDescription(
    $('.description__text, .show-more-less-html__markup').first().text(),
  )

  if (!title || !description) {
    return null
  }

  return {
    link,
    platform: 'LinkedIn',
    title,
    description,
  }
}

async function scrapeLinkedInJobPosting(jobId: string, link: string) {
  for (let attempt = 1; attempt <= LINKEDIN_SCRAPE_RETRIES; attempt += 1) {
    try {
      const html = await fetchLinkedInJobPostingHtml(jobId)
      const jobDetails = await parseLinkedInJobPosting(html, link)

      if (jobDetails) {
        return jobDetails
      }
    } catch {
      if (attempt === LINKEDIN_SCRAPE_RETRIES) {
        return null
      }
    }

    await sleep(LINKEDIN_RETRY_BACKOFF_MS * attempt)
  }

  return null
}

export async function scrapeJobReportFromLink(link: string) {
  const { platform, jobId } = getScrapeJobLink(link)

  if (!platform) {
    throw new Error(UNSUPPORTED_JOB_LINK_ERROR)
  }

  if (!jobId) {
    throw new Error(`Could not find ${platform} job id from this link`)
  }

  if (platform === 'Reed') {
    return fetchReedJobPosting(jobId)
  }

  return scrapeLinkedInJobPosting(jobId, link)
}
