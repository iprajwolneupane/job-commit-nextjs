import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { inflateRawSync, inflateSync } from 'node:zlib'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import axios from 'axios'
import { PDFParse } from 'pdf-parse'
import { prisma } from '@/lib/prisma'

const CV_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploaded-cv')
const CV_PUBLIC_DIR = '/uploaded-cv'
const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024
const CV_CHUNK_SIZE = 1000
const CV_CHUNK_OVERLAP = 120
const NVIDIA_EMBEDDING_URL = 'https://integrate.api.nvidia.com/v1/embeddings'
const NVIDIA_EMBEDDING_MODEL = 'nvidia/llama-nemotron-embed-1b-v2'
const EMBEDDING_DIMENSIONS = 768
const EMBEDDING_BATCH_SIZE = 16

type NvidiaEmbeddingResponse = {
  data?: Array<{
    embedding?: number[]
  }>
}

type ExtractedCvProfile = {
  username?: string
  linkedInUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  contactNumber?: string
  skills?: string[]
}

const CV_SKILL_PATTERNS = [
  { label: 'React.js', pattern: /\breact(?:\.js|js)?\b/i },
  { label: 'Next.js', pattern: /\bnext(?:\.js|js)?\b/i },
  { label: 'TypeScript', pattern: /\btypescript\b/i },
  { label: 'JavaScript', pattern: /\bjavascript\b/i },
  { label: 'Tailwind CSS', pattern: /\btailwind(?:\s+css)?\b/i },
  { label: 'HTML', pattern: /\bhtml5?\b/i },
  { label: 'CSS', pattern: /\bcss3?\b/i },
  { label: 'Node.js', pattern: /\bnode(?:\.js|js)?\b/i },
  { label: 'Express.js', pattern: /\bexpress(?:\.js|js)?\b/i },
  { label: 'NestJS', pattern: /\bnest(?:js|\.js)?\b/i },
  { label: 'Vue.js', pattern: /\bvue(?:\.js|js)?\b/i },
  { label: 'Angular', pattern: /\bangular\b/i },
  { label: 'Redux', pattern: /\bredux\b/i },
  { label: 'Zustand', pattern: /\bzustand\b/i },
  { label: 'TanStack Query', pattern: /\btanstack\s+query\b|\breact\s+query\b/i },
  { label: 'REST API', pattern: /\brest(?:ful)?\s+api(?:s)?\b/i },
  { label: 'GraphQL', pattern: /\bgraphql\b/i },
  { label: 'Prisma', pattern: /\bprisma\b/i },
  { label: 'PostgreSQL', pattern: /\bpostgres(?:ql)?\b/i },
  { label: 'MySQL', pattern: /\bmysql\b/i },
  { label: 'MongoDB', pattern: /\bmongodb\b/i },
  { label: 'Docker', pattern: /\bdocker\b/i },
  { label: 'Git', pattern: /\bgit\b/i },
  { label: 'GitHub', pattern: /\bgithub\b/i },
  { label: 'AWS', pattern: /\baws\b|\bamazon\s+web\s+services\b/i },
  { label: 'Firebase', pattern: /\bfirebase\b/i },
  { label: 'Supabase', pattern: /\bsupabase\b/i },
  { label: 'Figma', pattern: /\bfigma\b/i },
  { label: 'Jest', pattern: /\bjest\b/i },
  { label: 'Playwright', pattern: /\bplaywright\b/i },
  { label: 'Cypress', pattern: /\bcypress\b/i },
  { label: 'Vitest', pattern: /\bvitest\b/i },
  { label: 'Accessibility', pattern: /\baccessibility\b|\bwcag\b/i },
  { label: 'Responsive UI', pattern: /\bresponsive\s+(?:ui|design|web)\b/i },
  { label: 'Performance Optimization', pattern: /\bperformance(?:-|\s+)optim(?:ization|isation)\b/i },
] as const

const CV_SKILL_SECTION_HEADINGS =
  /^(technical\s+skills|skills|core\s+skills|key\s+skills|technologies|tech\s+stack|tools)$/i
const CV_SECTION_HEADING =
  /^(about\s+me|profile|summary|experience|work\s+experience|employment|projects|education|certifications|awards|languages|interests|contact|work\s+authorisation|work\s+authorization)$/i

export class CvServiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

function getUserCvFilename(userId: string) {
  return `${userId}.pdf`
}

function getUserCvPath(userId: string) {
  return path.join(CV_UPLOAD_DIR, getUserCvFilename(userId))
}

function getUserCvUrl(userId: string) {
  return `${CV_PUBLIC_DIR}/${getUserCvFilename(userId)}`
}

export async function getCvResponse(userId: string) {
  const filename = getUserCvFilename(userId)
  const filePath = getUserCvPath(userId)
  const documentCount = await prisma.document.count({
    where: {
      userId,
    },
  })

  try {
    const fileStat = await stat(filePath)

    if (!fileStat.isFile()) {
      return {
        exists: false,
        url: null,
        filename: null,
        size: null,
        updatedAt: null,
        documentCount,
      }
    }

    return {
      exists: true,
      url: getUserCvUrl(userId),
      filename,
      size: fileStat.size,
      updatedAt: fileStat.mtime.toISOString(),
      documentCount,
    }
  } catch {
    return {
      exists: false,
      url: null,
      filename: null,
      size: null,
      updatedAt: null,
      documentCount,
    }
  }
}

function decodePdfEscapedString(value: string) {
  return value.replace(/\\([nrtbf()\\]|\d{1,3})/g, (_, escapeValue: string) => {
    if (/^\d+$/.test(escapeValue)) {
      return String.fromCharCode(Number.parseInt(escapeValue, 8))
    }

    const replacements: Record<string, string> = {
      n: '\n',
      r: '\r',
      t: '\t',
      b: '\b',
      f: '\f',
      '(': '(',
      ')': ')',
      '\\': '\\',
    }

    return replacements[escapeValue] ?? escapeValue
  })
}

function decodePdfHexString(value: string) {
  const normalized = value.replace(/\s+/g, '')
  const bytes: number[] = []

  for (let index = 0; index < normalized.length; index += 2) {
    const byte = normalized.slice(index, index + 2)

    if (byte.length === 2) {
      bytes.push(Number.parseInt(byte, 16))
    }
  }

  return Buffer.from(bytes).toString('utf8')
}

function decodePdfTextToken(token: string) {
  if (token.startsWith('<')) {
    return decodePdfHexString(token.slice(1, -1))
  }

  return decodePdfEscapedString(token.slice(1, -1))
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isUsableExtractedText(value: string) {
  const visibleText = value.replace(/\s/g, '')
  const readableCharacters = value.match(/[\p{L}\p{N}]/gu) ?? []

  if (readableCharacters.length < 20 || visibleText.length === 0) {
    return false
  }

  return readableCharacters.length / visibleText.length >= 0.45
}

function getPdfTextSources(fileBuffer: Buffer) {
  const rawPdf = fileBuffer.toString('latin1')
  const sources = [rawPdf]
  const streamRegex = /<<([\s\S]*?)>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g

  for (const match of rawPdf.matchAll(streamRegex)) {
    const dictionary = match[1]
    const streamContent = match[2]

    if (!dictionary.includes('/FlateDecode')) {
      continue
    }

    const streamBuffer = Buffer.from(streamContent, 'latin1')

    try {
      sources.push(inflateSync(streamBuffer).toString('latin1'))
    } catch {
      try {
        sources.push(inflateRawSync(streamBuffer).toString('latin1'))
      } catch {
        // Ignore compressed streams this lightweight extractor cannot decode.
      }
    }
  }

  return sources
}

function extractTextOperations(source: string) {
  const textParts: string[] = []
  const stringToken = String.raw`\((?:\\.|[^\\)])*\)`
  const hexToken = String.raw`<[\dA-Fa-f\s]+>`
  const simpleTextRegex = new RegExp(
    `(${stringToken}|${hexToken})\\s*(?:Tj|'|")`,
    'g',
  )
  const arrayTextRegex = /\[([\s\S]*?)\]\s*TJ/g
  const tokenRegex = new RegExp(`${stringToken}|${hexToken}`, 'g')

  for (const match of source.matchAll(simpleTextRegex)) {
    textParts.push(decodePdfTextToken(match[1]))
  }

  for (const match of source.matchAll(arrayTextRegex)) {
    const tokens = match[1].match(tokenRegex) ?? []
    const text = tokens.map(decodePdfTextToken).join('')

    if (text) {
      textParts.push(text)
    }
  }

  return textParts
}

function extractPdfAnnotationText(source: string) {
  const textParts: string[] = []
  const uriRegex = /\/URI\s+(\((?:\\.|[^\\)])*\)|<[\dA-Fa-f\s]+>)/g

  for (const match of source.matchAll(uriRegex)) {
    textParts.push(decodePdfTextToken(match[1]))
  }

  return textParts
}

function extractPdfMetadataText(source: string) {
  const textParts: string[] = []
  const creatorMatch = source.match(
    /<dc:creator>[\s\S]*?<rdf:li>([\s\S]*?)<\/rdf:li>[\s\S]*?<\/dc:creator>/i,
  )
  const titleMatch = source.match(
    /<dc:title>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>[\s\S]*?<\/dc:title>/i,
  )

  if (creatorMatch?.[1]) {
    textParts.push(creatorMatch[1].replace(/<[^>]+>/g, ' '))
  }

  if (titleMatch?.[1]) {
    textParts.push(titleMatch[1].replace(/<[^>]+>/g, ' '))
  }

  return textParts
}

function extractTextFromPdfFallback(fileBuffer: Buffer) {
  const rawPdf = fileBuffer.toString('latin1')
  const text = [
    ...getPdfTextSources(fileBuffer).flatMap(extractTextOperations),
    ...extractPdfAnnotationText(rawPdf),
    ...extractPdfMetadataText(rawPdf),
  ].join('\n')

  return normalizeExtractedText(text)
}

async function extractTextFromPdf(fileBuffer: Buffer) {
  let parser: PDFParse | undefined

  try {
    parser = new PDFParse({ data: fileBuffer })

    const result = await parser.getText()
    const parsedText = normalizeExtractedText(result.text)

    if (isUsableExtractedText(parsedText)) {
      return parsedText
    }
  } catch {
    // Fall back to the lightweight extractor below for PDFs pdf-parse cannot read.
  } finally {
    await parser?.destroy()
  }

  const fallbackText = extractTextFromPdfFallback(fileBuffer)

  if (isUsableExtractedText(fallbackText)) {
    return fallbackText
  }

  return ''
}

function extractNameFromCvText(text: string) {
  const ignoredLineRegex =
    /^(resume|curriculum vitae|cv|profile|summary|contact|experience|education|skills|projects)$/i
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)

  for (const line of lines) {
    if (
      ignoredLineRegex.test(line) ||
      /@/.test(line) ||
      /https?:\/\//i.test(line) ||
      /linkedin\.com|github\.com/i.test(line) ||
      /\d{4,}/.test(line)
    ) {
      continue
    }

    const normalizedLine = line
      .replace(/[^\p{L}\p{M} .'-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (
      normalizedLine.length >= 2 &&
      normalizedLine.length <= 50 &&
      normalizedLine.split(' ').length <= 5
    ) {
      return normalizedLine
    }
  }

  return undefined
}

function normalizeUrl(value: string) {
  const trimmedValue = value.trim().replace(/[),.;\]]+$/, '')

  if (!trimmedValue) return undefined

  return /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`
}

function extractUrl(value: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = value.match(pattern)?.[0]

    if (match) {
      return normalizeUrl(match)
    }
  }

  return undefined
}

function normalizeSkill(value: string) {
  return value
    .replace(/^[\-•·*|/\\]+/, '')
    .replace(/[\-•·*|/\\]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function addSkill(skills: string[], value: string) {
  const skill = normalizeSkill(value)

  if (
    !skill ||
    skill.length > 50 ||
    /https?:\/\//i.test(skill) ||
    /@/.test(skill) ||
    /\d{4}/.test(skill)
  ) {
    return
  }

  if (
    skills.some(
      (existingSkill) => existingSkill.toLowerCase() === skill.toLowerCase(),
    )
  ) {
    return
  }

  skills.push(skill)
}

function extractSkillSectionCandidates(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const candidates: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    if (!CV_SKILL_SECTION_HEADINGS.test(lines[index])) {
      continue
    }

    for (
      let sectionIndex = index + 1;
      sectionIndex < lines.length;
      sectionIndex += 1
    ) {
      const line = lines[sectionIndex]

      if (
        CV_SKILL_SECTION_HEADINGS.test(line) ||
        CV_SECTION_HEADING.test(line)
      ) {
        break
      }

      candidates.push(line)

      if (candidates.length >= 40) {
        break
      }
    }
  }

  return candidates.flatMap((candidate) =>
    candidate
      .split(/[,;|•·]/)
      .map(normalizeSkill)
      .filter((skill) => skill.length >= 2),
  )
}

function extractSkillsFromCvText(text: string) {
  const skills: string[] = []

  for (const { label, pattern } of CV_SKILL_PATTERNS) {
    if (pattern.test(text)) {
      addSkill(skills, label)
    }
  }

  for (const candidate of extractSkillSectionCandidates(text)) {
    addSkill(skills, candidate)
  }

  return skills.slice(0, 30)
}

function extractProfileFromCvText(text: string): ExtractedCvProfile {
  return {
    username: extractNameFromCvText(text),
    linkedInUrl: extractUrl(text, [
      /https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s<>"']+/i,
      /(?:www\.)?linkedin\.com\/in\/[^\s<>"']+/i,
    ]),
    githubUrl: extractUrl(text, [
      /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9-]+[^\s<>"']*/i,
      /(?:www\.)?github\.com\/[A-Za-z0-9-]+[^\s<>"']*/i,
    ]),
    portfolioUrl: extractUrl(text, [
      /https?:\/\/(?![^/\s]*linkedin\.com)(?![^/\s]*github\.com)[^\s<>"']+\.[^\s<>"']+/i,
      /www\.(?!linkedin\.com)(?!github\.com)[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s<>"']*)?/i,
    ]),
    contactNumber: text.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/)?.[0]?.trim(),
    skills: extractSkillsFromCvText(text),
  }
}

async function createEmbeddings(texts: string[]) {
  const apiKey = process.env.NVIDIA_API_KEY?.trim()

  if (!apiKey) {
    throw new CvServiceError('NVIDIA_API_KEY is not configured', 422)
  }

  const embeddings: number[][] = []

  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const input = texts.slice(index, index + EMBEDDING_BATCH_SIZE)
    const response = await axios.post<NvidiaEmbeddingResponse>(
      NVIDIA_EMBEDDING_URL,
      {
        model: NVIDIA_EMBEDDING_MODEL,
        input,
        input_type: 'passage',
        dimensions: EMBEDDING_DIMENSIONS,
        encoding_format: 'float',
        truncate: 'END',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    )

    const batchEmbeddings =
      response.data.data?.map((item) => item.embedding).filter(Boolean) ?? []

    if (batchEmbeddings.length !== input.length) {
      throw new Error('NVIDIA embedding response did not match input count')
    }

    embeddings.push(...(batchEmbeddings as number[][]))
  }

  return embeddings
}

async function replaceUserCvDocuments({
  userId,
  filename,
  cvUrl,
  text,
}: {
  userId: string
  filename: string
  cvUrl: string
  text: string
}) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CV_CHUNK_SIZE,
    chunkOverlap: CV_CHUNK_OVERLAP,
  })
  const chunks = await textSplitter.createDocuments(
    [text],
    [
      {
        userId,
        source: 'cv',
        filename,
        url: cvUrl,
      },
    ],
  )

  if (chunks.length === 0) {
    throw new Error('No CV chunks could be created')
  }

  const embeddings = await createEmbeddings(
    chunks.map((chunk) => chunk.pageContent),
  )
  const uploadedAt = new Date().toISOString()

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `DELETE FROM public.documents
       WHERE "userId" = $1
         AND metadata @> '{"source":"cv"}'::jsonb`,
      userId,
    )

    for (const [index, chunk] of chunks.entries()) {
      await tx.$executeRawUnsafe(
        `INSERT INTO public.documents ("userId", content, metadata, embedding)
         VALUES ($1, $2, $3::jsonb, $4::vector)`,
        userId,
        chunk.pageContent,
        JSON.stringify({
          ...chunk.metadata,
          userId,
          source: 'cv',
          filename,
          url: cvUrl,
          chunkIndex: index,
          uploadedAt,
        }),
        `[${embeddings[index].join(',')}]`,
      )
    }
  })

  return chunks.length
}

async function applyExtractedProfile(userId: string, profile: ExtractedCvProfile) {
  const data = {
    ...(profile.username ? { username: profile.username } : {}),
    ...(profile.linkedInUrl ? { linkedInUrl: profile.linkedInUrl } : {}),
    ...(profile.githubUrl ? { githubUrl: profile.githubUrl } : {}),
    ...(profile.portfolioUrl ? { portfolioUrl: profile.portfolioUrl } : {}),
    ...(profile.contactNumber ? { contactNumber: profile.contactNumber } : {}),
    ...(profile.skills && profile.skills.length > 0
      ? { skills: profile.skills }
      : {}),
  }

  if (Object.keys(data).length === 0) {
    return null
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      linkedInUrl: true,
      githubUrl: true,
      portfolioUrl: true,
      contactNumber: true,
      skills: true,
    },
  })
}

function hasPdfSignature(fileBuffer: Buffer) {
  return fileBuffer.subarray(0, 4).toString('utf8') === '%PDF'
}

export async function uploadCvForUser(userId: string, file: File) {
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    throw new CvServiceError('Only PDF files are allowed', 400)
  }

  if (file.size > MAX_CV_SIZE_BYTES) {
    throw new CvServiceError('PDF must be 10MB or smaller', 400)
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  if (!hasPdfSignature(fileBuffer)) {
    throw new CvServiceError('Invalid PDF file', 400)
  }

  const filename = getUserCvFilename(userId)
  const cvUrl = getUserCvUrl(userId)
  const text = await extractTextFromPdf(fileBuffer)

  if (!text) {
    throw new CvServiceError('No text could be extracted from this PDF', 422)
  }

  try {
    const documentCount = await replaceUserCvDocuments({
      userId,
      filename,
      cvUrl,
      text,
    })

    await mkdir(CV_UPLOAD_DIR, { recursive: true })
    await writeFile(getUserCvPath(userId), fileBuffer)

    return {
      message: 'CV uploaded and indexed successfully',
      cv: {
        ...(await getCvResponse(userId)),
        documentCount,
      },
      profile: await applyExtractedProfile(userId, extractProfileFromCvText(text)),
    }
  } catch (error) {
    if (error instanceof CvServiceError) {
      throw error
    }

    throw new CvServiceError('Could not index CV for search', 502)
  }
}

export async function refillProfileFromStoredCv(userId: string) {
  let fileBuffer: Buffer

  try {
    fileBuffer = await readFile(getUserCvPath(userId))
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new CvServiceError('Please upload a CV before refilling profile', 404)
    }

    throw error
  }

  if (!hasPdfSignature(fileBuffer)) {
    throw new CvServiceError('Stored CV is not a valid PDF file', 422)
  }

  const text = await extractTextFromPdf(fileBuffer)

  if (!text) {
    throw new CvServiceError('No text could be extracted from this PDF', 422)
  }

  const profile = await applyExtractedProfile(
    userId,
    extractProfileFromCvText(text),
  )

  if (!profile) {
    throw new CvServiceError(
      'No profile details could be extracted from this CV',
      422,
    )
  }

  return {
    message: 'Profile refilled from CV',
    profile,
  }
}
