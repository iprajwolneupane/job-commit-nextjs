import axios from 'axios'

const LINKEDIN_DOMAIN_REGEX = /(^|\.)linkedin\.com$/i
const LINKEDIN_JOB_VIEW_REGEX = /^\/jobs\/view\/(\d+)(?:\/.*)?$/i
const NUMERIC_ID_REGEX = /^\d+$/
const LINKEDIN_JOB_POSTING_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting'
const LINKEDIN_REQUEST_TIMEOUT_MS = 5000
const LINKEDIN_SCRAPE_RETRIES = 3
const LINKEDIN_RETRY_BACKOFF_MS = 1000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

export type ScrapedJobReport = {
  link: string
  platform: string
  title: string
  description: string
}

type LinkedInJobLink = {
  isLinkedIn: boolean
  jobId: string | null
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeDescription(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\bApply now\b/gi, '')
    .replace(/\bSave job\b/gi, '')
    .replace(/\bSign in to apply\b/gi, '')
    .replace(/\bCreate job alert\b/gi, '')
    .replace(/\bCookie policy\b/gi, '')
    .replace(/\bPrivacy policy\b/gi, '')
    .replace(/\bTerms and conditions\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\bShow\s+(more|less)\b/gi, '')
    .trim()
}

function getLinkedInJobLink(link: string): LinkedInJobLink {
  const url = new URL(link)
  const isLinkedIn = LINKEDIN_DOMAIN_REGEX.test(url.hostname)

  if (!isLinkedIn) {
    return { isLinkedIn: false, jobId: null }
  }

  const queryJobId = url.searchParams.get('currentJobId')

  if (queryJobId && NUMERIC_ID_REGEX.test(queryJobId)) {
    return { isLinkedIn: true, jobId: queryJobId }
  }

  return {
    isLinkedIn: true,
    jobId: url.pathname.match(LINKEDIN_JOB_VIEW_REGEX)?.[1] ?? null,
  }
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

async function parseLinkedInJobPosting(
  html: string,
  link: string,
): Promise<ScrapedJobReport | null> {
  const cheerio = await import('cheerio')
  const $ = cheerio.load(html)
  const title = normalizeText($('.topcard__title').first().text())
  const description = normalizeDescription(
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
  const { isLinkedIn, jobId } = getLinkedInJobLink(link)

  if (!isLinkedIn) {
    throw new Error('Only LinkedIn job links are supported for now')
  }

  if (!jobId) {
    throw new Error('Could not find LinkedIn job id from this link')
  }

  return scrapeLinkedInJobPosting(jobId, link)
}
