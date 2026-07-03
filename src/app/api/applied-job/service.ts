import {
  endOfDay,
  endOfMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import {
  AppliedJobResponseEnum,
  ScrapeStatus,
} from '@/generated/prisma/enums'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { enqueueScrapeJob } from '@/lib/queues/scrape-job.queue'
import type { AuthenticatedUser } from '@/lib/auth'
import type {
  CreateAppliedJobValues,
  UpdateAppliedJobValues,
} from '@/lib/schema'
import { appliedJobResponseValues } from '@/lib/schema'

const appliedJobListSelect = {
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
  scrappedJob: {
    select: {
      scrapeStatus: true,
    },
  },
} as const

const FOLLOW_UP_EMAIL_TIMEOUT_MS = 90000
const FOLLOW_UP_EMAIL_MAX_JOB_DESCRIPTION_CHARS = 1200
const FOLLOW_UP_EMAIL_MAX_TOKENS = 320
const NVIDIA_CHAT_COMPLETIONS_URL =
  'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_CHAT_MODEL =
  process.env.NVIDIA_CHAT_MODEL?.trim() || 'meta/llama-3.1-8b-instruct'

const appliedJobDetailSelect = {
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

type AppliedJobListItem = Prisma.AppliedJobGetPayload<{
  select: typeof appliedJobListSelect
}>

type AppliedJobListResponseItem = Omit<AppliedJobListItem, 'scrappedJob'> & {
  hasEmailData: boolean
}

type AppliedJobListParams = {
  fromDate: string | null
  toDate: string | null
  query: string | null
  response: string | null
}

export class AppliedJobServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export function isAppliedJobResponse(
  value: string | null,
): value is (typeof appliedJobResponseValues)[number] {
  return appliedJobResponseValues.includes(
    value as (typeof appliedJobResponseValues)[number],
  )
}

function getSendMailAt(appliedDate: Date) {
  return new Date(appliedDate.getTime() + 3 * 24 * 60 * 60 * 1000)
}

function sanitizeSearch(value: string | null) {
  return (value ?? '').toLowerCase().replace(/\s+/g, '')
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

function serializeAppliedJob(job: AppliedJobListItem) {
  const { scrappedJob, ...appliedJob } = job

  return {
    ...appliedJob,
    hasEmailData: scrappedJob?.scrapeStatus === ScrapeStatus.COMPLETED,
  }
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

function searchAppliedJobs({
  userId,
  appliedDateFilter,
  response,
  query,
}: {
  userId: string
  appliedDateFilter: { gte?: Date; lte?: Date }
  response?: (typeof appliedJobResponseValues)[number]
  query: string
}) {
  const searchPattern = `%${query}%`

  return prisma.$queryRaw<AppliedJobListResponseItem[]>(Prisma.sql`
    SELECT
      aj."id",
      aj."userId",
      aj."platformId",
      aj."appliedDate",
      json_build_object(
        'id', p."id",
        'name', p."name"
      ) AS "platform",
      aj."company",
      aj."position",
      aj."sendMailAt",
      aj."sentMail",
      aj."response",
      aj."link",
      COALESCE(
        sj."scrapeStatus" = ${ScrapeStatus.COMPLETED}::"ScrapeStatus",
        false
      ) AS "hasEmailData"
    FROM "AppliedJob" AS aj
    INNER JOIN "Platform" AS p
      ON p."id" = aj."platformId"
    LEFT JOIN "ScrappedJob" AS sj
      ON sj."appliedJobId" = aj."id"
    WHERE aj."userId" = ${userId}
      ${appliedDateFilter.gte
      ? Prisma.sql`AND aj."appliedDate" >= ${appliedDateFilter.gte}`
      : Prisma.empty
    }
      ${appliedDateFilter.lte
      ? Prisma.sql`AND aj."appliedDate" <= ${appliedDateFilter.lte}`
      : Prisma.empty
    }
      ${response
      ? Prisma.sql`AND aj."response" = ${response}::"AppliedJobResponseEnum"`
      : Prisma.empty
    }
      AND (
        regexp_replace(lower(aj."company"), '[[:space:]]+', '', 'g') LIKE ${searchPattern}
        OR regexp_replace(lower(aj."position"), '[[:space:]]+', '', 'g') LIKE ${searchPattern}
      )
    ORDER BY aj."appliedDate" DESC
  `)
}

export async function listAppliedJobs(userId: string, params: AppliedJobListParams) {
  const fromDate = parseDateFilter(params.fromDate, 'start')
  const toDate = parseDateFilter(params.toDate, 'end')
  const query = sanitizeSearch(params.query)
  const response = isAppliedJobResponse(params.response)
    ? params.response
    : undefined
  const appliedDateFilter = getAppliedDateFilter(fromDate, toDate)

  if (query) {
    return searchAppliedJobs({
      userId,
      appliedDateFilter,
      response,
      query,
    })
  }

  const appliedJobs = await prisma.appliedJob.findMany({
    where: {
      userId,
      ...(response ? { response } : {}),
      appliedDate: appliedDateFilter,
    },
    orderBy: {
      appliedDate: 'desc',
    },
    select: appliedJobListSelect,
  })

  return appliedJobs.map(serializeAppliedJob)
}

export async function createAppliedJob(
  userId: string,
  values: CreateAppliedJobValues,
) {
  if (!(await userOwnsPlatform(userId, values.platformId))) {
    throw new AppliedJobServiceError('Platform not found', 404)
  }

  const appliedJob = await prisma.appliedJob.create({
    data: {
      userId,
      appliedDate: values.appliedDate,
      platformId: values.platformId,
      company: values.company,
      position: values.position,
      sendMailAt: getSendMailAt(values.appliedDate),
      response: values.response ?? AppliedJobResponseEnum.NORESPONSE,
      link: values.link,
    },
    select: appliedJobListSelect,
  })

  await enqueueScrapeJob(appliedJob.id)

  return appliedJob
}

export function getAppliedJob(appliedJobId: string, userId: string) {
  return prisma.appliedJob.findFirst({
    where: {
      id: appliedJobId,
      userId,
    },
    select: appliedJobDetailSelect,
  })
}

export async function updateAppliedJob({
  appliedJobId,
  userId,
  values,
}: {
  appliedJobId: string
  userId: string
  values: UpdateAppliedJobValues
}) {
  const existingAppliedJob = await prisma.appliedJob.findFirst({
    where: {
      id: appliedJobId,
      userId,
    },
    select: {
      id: true,
      link: true,
    },
  })

  if (!existingAppliedJob) {
    throw new AppliedJobServiceError('Applied job not found', 404)
  }

  if (values.sentMail === false) {
    throw new AppliedJobServiceError('Sent mail status cannot be reverted', 400)
  }

  if (values.platformId && !(await userOwnsPlatform(userId, values.platformId))) {
    throw new AppliedJobServiceError('Platform not found', 404)
  }

  const linkChanged =
    typeof values.link === 'string' && values.link !== existingAppliedJob.link
  const updateData = {
    ...values,
    ...(values.appliedDate ? { sendMailAt: getSendMailAt(values.appliedDate) } : {}),
  }

  const appliedJob = await prisma.$transaction(async (tx) => {
    const updatedAppliedJob = await tx.appliedJob.update({
      where: {
        id: existingAppliedJob.id,
      },
      data: updateData,
      select: appliedJobDetailSelect,
    })

    if (linkChanged) {
      await tx.scrappedJob.upsert({
        where: {
          appliedJobId: existingAppliedJob.id,
        },
        create: {
          appliedJobId: existingAppliedJob.id,
          link: values.link!,
          scrapeStatus: ScrapeStatus.PENDING,
        },
        update: {
          link: values.link!,
          title: null,
          company: null,
          description: null,
          scrapeStatus: ScrapeStatus.PENDING,
          scrapedLink: null,
          scrapedAt: null,
          scrapeAttempts: 0,
          scrapeError: null,
          lastScrapeAttemptAt: null,
        },
      })
    }

    return updatedAppliedJob
  })

  if (linkChanged) {
    await enqueueScrapeJob(appliedJob.id)
  }

  return appliedJob
}

export async function deleteAppliedJob(appliedJobId: string, userId: string) {
  const result = await prisma.appliedJob.deleteMany({
    where: {
      id: appliedJobId,
      userId,
    },
  })

  return result.count > 0
}

export function getAppliedJobForGeneration(appliedJobId: string, userId: string) {
  return prisma.appliedJob.findFirst({
    where: {
      id: appliedJobId,
      userId,
    },
    select: {
      id: true,
      company: true,
      position: true,
      link: true,
      scrappedJob: {
        select: {
          id: true,
          link: true,
          title: true,
          company: true,
          description: true,
          scrapeStatus: true,
          scrapedLink: true,
          scrapedAt: true,
        },
      },
    },
  })
}

type ChatStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

function getNvidiaApiKey() {
  const apiKey = process.env.NVIDIA_API_KEY?.trim()

  if (!apiKey) {
    throw new AppliedJobServiceError('NVIDIA_API_KEY is not configured', 500)
  }

  return apiKey
}

function getChatStreamText(line: string) {
  const trimmedLine = line.trim()

  if (!trimmedLine.startsWith('data:')) {
    return ''
  }

  const data = trimmedLine.slice(5).trim()

  if (!data || data === '[DONE]') {
    return ''
  }

  const parsed = JSON.parse(data) as ChatStreamChunk

  if (parsed.error?.message) {
    throw new Error(parsed.error.message)
  }

  return (
    parsed.choices
      ?.map((choice) => choice.delta?.content ?? '')
      .join('') ?? ''
  )
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function buildFollowUpEmailStream(
  appliedJob: NonNullable<Awaited<ReturnType<typeof getAppliedJobForGeneration>>>,
  profile: AuthenticatedUser,
) {
  const apiKey = getNvidiaApiKey()
  const profileContext = [
    profile.username ? `Name: ${profile.username}` : null,
    profile.email ? `Email: ${profile.email}` : null,
    profile.contactNumber ? `Contact: ${profile.contactNumber}` : null,
    profile.linkedInUrl ? `LinkedIn: ${profile.linkedInUrl}` : null,
    profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
    profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : null,
    profile.skills.length > 0 ? `Skills: ${profile.skills.join(', ')}` : null,
  ].filter(Boolean)
  const jobContext = [
    `Applied position: ${appliedJob.position}`,
    `Applied company: ${appliedJob.company}`,
    `Scraped title: ${appliedJob.scrappedJob?.title ?? 'Not available'}`,
    `Scraped company: ${appliedJob.scrappedJob?.company ?? 'Not available'}`,
    `Job link: ${appliedJob.scrappedJob?.scrapedLink ?? appliedJob.scrappedJob?.link ?? appliedJob.link}`,
    '',
    'Job description:',
    (appliedJob.scrappedJob?.description ?? 'No description available.').slice(
      0,
      FOLLOW_UP_EMAIL_MAX_JOB_DESCRIPTION_CHARS,
    ),
  ].join('\n')
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        abortController.abort()
      }, FOLLOW_UP_EMAIL_TIMEOUT_MS)

      try {
        const response = await fetch(NVIDIA_CHAT_COMPLETIONS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
          body: JSON.stringify({
            model: NVIDIA_CHAT_MODEL,
            temperature: 0.7,
            max_tokens: FOLLOW_UP_EMAIL_MAX_TOKENS,
            stream: true,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert career coach and professional copywriter. Write a concise, warm, and highly professional follow-up email for a job application based on the provided context. ' +
                  'Write a clear subject line: Reply to the existing email thread or use something direct like: Following up: [Job Title] Interview - [Your Name].' +
                  'Keep it brief and direct: Skip the essay. State immediately in the first paragraph that you are checking on your application status.' +
                  'Reiterate your interest: Use just one or two sentences to remind them why you are excited about the role.' +
                  `Be polite, not demanding: Use soft language like, "I'm checking in to see if there is an update, " rather than demanding to know your status.` +
                  `Offer more information: Ask if they need any additional materials, references, or work samples to help them make their decision.` +
                  'Incorporate specific details from the job context (like the company name and role) naturally. ' +
                  'Explicitly mention that the applicant has attached their CV for convenience. ' +
                  "The tone should be enthusiastic yet respectful of the hiring manager's time. " +
                  'Structure: The first line must be exactly "Subject: <subject text>". Then add one blank line, followed by the email body with a greeting, a brief 2-3 sentence body, and a professional sign-off. ' +
                  'Use the applicant profile details exactly as provided in the sign-off/contact section. The sign-off/contact section must use one line per available value. ' +
                  'Format email and URLs as plain text that will be clickable in email clients. Use this exact style when values are available: "Email: jane@example.com", "Portfolio: https://example.com", "GitHub: https://github.com/jane", and "LinkedIn: https://linkedin.com/in/jane". ' +
                  'Keep contact number as plain text like "Contact: +1 555 000 0000". Do not use markdown links, HTML anchors, shortened display text, hidden hyperlinks, or square brackets. Do not invent missing profile values. ' +
                  'Never return placeholders such as [Name], [Your Name], [Email], [Phone], [LinkedIn], [GitHub], or [Portfolio]. If a profile value is not provided, omit that line entirely. ' +
                  'Strict Constraints: Return ONLY the raw email content. Do not include markdown code fences (```), formatting tags, labels other than "Subject:", placeholders, or conversational meta-text.',

              },
              {
                role: 'user',
                content: [
                  ...(profileContext.length > 0
                    ? ['Applicant profile:', profileContext.join('\n'), '']
                    : []),
                  'Job context:',
                  jobContext,
                  '',
                  'Request:',
                  'I have already applied to this position and I am waiting for a response. Write a polite follow-up email asking for an update. Keep it specific to the role and company, warm, and concise.',
                ].join('\n'),
              },
            ],
          }),
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        if (!response.body) {
          throw new Error('NVIDIA did not return a response stream')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let pendingText = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          pendingText += decoder.decode(value, { stream: true })
          const lines = pendingText.split(/\r?\n/)
          pendingText = lines.pop() ?? ''

          for (const line of lines) {
            const text = getChatStreamText(line)

            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        }

        pendingText += decoder.decode()

        for (const line of pendingText.split(/\r?\n/)) {
          const text = getChatStreamText(line)

          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }

        controller.close()
      } catch (error) {
        const streamError = isAbortError(error)
          ? new Error(
            `NVIDIA did not start streaming within ${FOLLOW_UP_EMAIL_TIMEOUT_MS / 1000} seconds`,
          )
          : error

        console.error('Failed to stream follow up email', streamError)
        controller.error(streamError)
      } finally {
        clearTimeout(timeoutId)
      }
    },
  })
}
