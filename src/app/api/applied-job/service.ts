import {
  endOfDay,
  endOfMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { ChatOpenAI } from '@langchain/openai'
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
      ${
        appliedDateFilter.gte
          ? Prisma.sql`AND aj."appliedDate" >= ${appliedDateFilter.gte}`
          : Prisma.empty
      }
      ${
        appliedDateFilter.lte
          ? Prisma.sql`AND aj."appliedDate" <= ${appliedDateFilter.lte}`
          : Prisma.empty
      }
      ${
        response
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

function createLlmClient() {
  const apiKey = process.env.NVIDIA_API_KEY

  if (!apiKey) {
    throw new AppliedJobServiceError('NVIDIA_API_KEY is not configured', 500)
  }

  return new ChatOpenAI({
    apiKey,
    model: 'deepseek-ai/deepseek-v4-flash',
    temperature: 0.7,
    maxTokens: 700,
    streaming: true,
    configuration: {
      baseURL: 'https://integrate.api.nvidia.com/v1',
    },
  })
}

function getChunkText(content: unknown) {
  if (typeof content === 'string') return content

  if (!Array.isArray(content)) return ''

  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (
        typeof part === 'object' &&
        part !== null &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return part.text
      }

      return ''
    })
    .join('')
}

export function buildFollowUpEmailStream(
  appliedJob: NonNullable<Awaited<ReturnType<typeof getAppliedJobForGeneration>>>,
  profile: AuthenticatedUser,
) {
  const llm = createLlmClient()
  const profileContext = [
    profile.username ? `Name: ${profile.username}` : null,
    profile.email ? `Email: ${profile.email}` : null,
    profile.contactNumber ? `Contact: ${profile.contactNumber}` : null,
    profile.linkedInUrl ? `LinkedIn: ${profile.linkedInUrl}` : null,
    profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
    profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : null,
  ].filter(Boolean)
  const jobContext = [
    `Applied position: ${appliedJob.position}`,
    `Applied company: ${appliedJob.company}`,
    `Scraped title: ${appliedJob.scrappedJob?.title ?? 'Not available'}`,
    `Scraped company: ${appliedJob.scrappedJob?.company ?? 'Not available'}`,
    `Job link: ${appliedJob.scrappedJob?.scrapedLink ?? appliedJob.scrappedJob?.link ?? appliedJob.link}`,
    '',
    'Job description:',
    appliedJob.scrappedJob?.description ?? 'No description available.',
  ].join('\n')
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const responseStream = await llm.stream([
          {
            role: 'system',
            content:
              'You are an expert career coach and professional copywriter. Write a concise, warm, and highly professional follow-up email for a job application based on the provided context. ' +
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
        ])

        for await (const chunk of responseStream) {
          const text = getChunkText(chunk.content)

          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
