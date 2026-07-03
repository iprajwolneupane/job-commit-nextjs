import {
  scrapeJobReportFromLink,
  UNSUPPORTED_JOB_LINK_ERROR,
  type ScrapedJobReport,
} from '@/lib/service'
import { prisma } from '@/lib/prisma'
import type { AuthenticatedUser } from '@/lib/auth'

export class JobServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

const JOB_REPORT_TIMEOUT_MS = 90000
const JOB_REPORT_MAX_DESCRIPTION_CHARS = 5000
const JOB_REPORT_MAX_CV_CONTEXT_CHARS = 3000
const JOB_REPORT_MATCH_COUNT = 5
const NVIDIA_CHAT_COMPLETIONS_URL =
  'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_CHAT_MODEL =
  process.env.NVIDIA_CHAT_MODEL?.trim() || 'meta/llama-3.1-8b-instruct'
const NVIDIA_EMBEDDING_URL = 'https://integrate.api.nvidia.com/v1/embeddings'
const NVIDIA_EMBEDDING_MODEL = 'nvidia/llama-nemotron-embed-1b-v2'
const EMBEDDING_DIMENSIONS = 768

type NvidiaEmbeddingResponse = {
  data?: Array<{
    embedding?: number[]
  }>
}

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type MatchedDocument = {
  id: bigint
  content: string | null
  metadata: unknown
  similarity: number
}

export type SkillMatchReport = {
  rating: 0 | 1 | 2 | 3 | 4 | 5
  summary: string
  matchedSkills: string[]
  missingSkills: string[]
  tips: string[]
}

function getScrapeErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 502
  }

  if (
    error.message === UNSUPPORTED_JOB_LINK_ERROR ||
    error.message === 'Could not find LinkedIn job id from this link' ||
    error.message === 'Could not find Reed job id from this link'
  ) {
    return 400
  }

  return 502
}

function getNvidiaApiKey() {
  const apiKey = process.env.NVIDIA_API_KEY?.trim()

  if (!apiKey) {
    throw new JobServiceError('NVIDIA_API_KEY is not configured', 500)
  }

  return apiKey
}

function getNoSkillsReport(): SkillMatchReport {
  return {
    rating: 0,
    summary: 'No profile skills are available to compare with this job.',
    matchedSkills: [],
    missingSkills: [],
    tips: ['Add skills to your profile or refill your profile from your CV.'],
  }
}

async function createEmbedding(input: string) {
  const response = await fetch(NVIDIA_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getNvidiaApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_EMBEDDING_MODEL,
      input: [input],
      input_type: 'query',
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
      truncate: 'END',
    }),
  })

  if (!response.ok) {
    throw new JobServiceError(await response.text(), 502)
  }

  const data = (await response.json()) as NvidiaEmbeddingResponse
  const embedding = data.data?.[0]?.embedding

  if (!embedding) {
    throw new JobServiceError('NVIDIA embedding response was empty', 502)
  }

  return embedding
}

async function getRelevantCvContext(userId: string, job: ScrapedJobReport) {
  const documentCount = await prisma.document.count({
    where: {
      userId,
    },
  })

  if (documentCount === 0) {
    return []
  }

  const embedding = await createEmbedding(
    [job.title, job.platform, job.description]
      .filter(Boolean)
      .join('\n')
      .slice(0, JOB_REPORT_MAX_DESCRIPTION_CHARS),
  )
  const matchedDocuments = await prisma.$queryRawUnsafe<MatchedDocument[]>(
    `SELECT id, content, metadata, similarity
     FROM public.match_documents($1::vector, $2, $3::jsonb)`,
    `[${embedding.join(',')}]`,
    JOB_REPORT_MATCH_COUNT,
    JSON.stringify({
      source: 'cv',
      userId,
    }),
  )

  return matchedDocuments
    .filter((document) => document.content)
    .map((document) => ({
      content: document.content ?? '',
      similarity: Number(document.similarity),
    }))
}

function parseSkillMatchReport(value: string): SkillMatchReport {
  const normalizedValue = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const parsed = JSON.parse(normalizedValue) as Partial<SkillMatchReport>
  const rating = parsed.rating

  if (
    rating !== 0 &&
    rating !== 1 &&
    rating !== 2 &&
    rating !== 3 &&
    rating !== 4 &&
    rating !== 5
  ) {
    throw new Error('Invalid rating from LLM')
  }

  return {
    rating,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    matchedSkills: Array.isArray(parsed.matchedSkills)
      ? parsed.matchedSkills.filter((skill): skill is string => typeof skill === 'string')
      : [],
    missingSkills: Array.isArray(parsed.missingSkills)
      ? parsed.missingSkills.filter((skill): skill is string => typeof skill === 'string')
      : [],
    tips: Array.isArray(parsed.tips)
      ? parsed.tips.filter((tip): tip is string => typeof tip === 'string').slice(0, 5)
      : [],
  }
}

async function buildSkillMatchReport({
  user,
  job,
  cvContext,
}: {
  user: AuthenticatedUser
  job: ScrapedJobReport
  cvContext: Array<{
    content: string
    similarity: number
  }>
}): Promise<SkillMatchReport> {
  if (user.skills.length === 0) {
    return getNoSkillsReport()
  }

  const cvContextText = cvContext
    .map((document, index) => {
      return `CV context ${index + 1} (similarity ${document.similarity.toFixed(3)}):\n${document.content}`
    })
    .join('\n\n')
    .slice(0, JOB_REPORT_MAX_CV_CONTEXT_CHARS)
  const response = await fetch(NVIDIA_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getNvidiaApiKey()}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(JOB_REPORT_TIMEOUT_MS),
    body: JSON.stringify({
      model: NVIDIA_CHAT_MODEL,
      temperature: 0.1,
      max_tokens: 450,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict technical recruiter and CV coach. Analyze how well the user profile skills match the job description. ' +
            'Use the user profile skills as the primary source. Use CV semantic-search context only as supporting evidence. ' +
            'Return ONLY valid JSON with this exact shape: {"rating":0,"summary":"","matchedSkills":[],"missingSkills":[],"tips":[]}. ' +
            'rating must be an integer only: 0, 1, 2, 3, 4, or 5. Be strict: 5 means almost perfect match, 3 means partial match, 1 means weak match, 0 means no usable skills. ' +
            'The tips array must contain 3 to 5 direct second-person CV/profile improvement actions for the user. ' +
            'Each tip must tell the user what to add, mention, rewrite, quantify, highlight, or remove from their CV/profile for this specific job. ' +
            'Do not write tips as a comparison paragraph. Do not use the words candidate, applicant, they, their, he, or she in tips. ' +
            'Bad tip: "While the candidate has experience with TanStack Query, they should improve cloud skills." ' +
            'Good tip: "Add a short project bullet showing how you used TanStack Query to manage server state in a production React app."',
        },
        {
          role: 'user',
          content: [
            `Your profile skills: ${user.skills.join(', ')}`,
            '',
            `Job title: ${job.title}`,
            `Platform: ${job.platform}`,
            '',
            'Job description:',
            job.description.slice(0, JOB_REPORT_MAX_DESCRIPTION_CHARS),
            '',
            'Semantic CV context from vector database:',
            cvContextText || 'No relevant CV context found.',
            '',
            'Task:',
            'Compare your profile skills with the job description. Give a strict match rating out of 5. In tips, write only actionable CV/profile edits addressed directly to you.',
          ].join('\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new JobServiceError(await response.text(), 502)
  }

  const data = (await response.json()) as NvidiaChatResponse
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new JobServiceError('NVIDIA chat response was empty', 502)
  }

  return parseSkillMatchReport(content)
}

export async function getJobReport(link: string, user: AuthenticatedUser) {
  try {
    const job = await scrapeJobReportFromLink(link)

    if (!job) {
      throw new JobServiceError('Unable to scrape job details', 502)
    }

    if (user.skills.length === 0) {
      return {
        skillMatch: getNoSkillsReport(),
        title: job.title,
      }
    }

    const cvContext = await getRelevantCvContext(user.id, job)
    const skillMatch = await buildSkillMatchReport({
      user,
      job,
      cvContext,
    })

    return {
      skillMatch,
      title: job.title,
    }
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
