import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { inflateRawSync, inflateSync } from 'node:zlib'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import axios from 'axios'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
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

function jsonError(message: string, status: number) {
    return NextResponse.json({ message }, { status })
}

function requireEnv(value: string | undefined, name: string) {
    if (!value?.trim()) {
        throw new Error(`${name} is not configured`)
    }

    return value.trim()
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

async function getCvResponse(userId: string) {
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

function isPdfFile(file: File) {
    return file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf')
}

function hasPdfSignature(fileBuffer: Buffer) {
    return fileBuffer.subarray(0, 4).toString('utf8') === '%PDF'
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

function normalizeExtractedText(value: string) {
    return value
        .replace(/\u0000/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function getPdfTextSources(fileBuffer: Buffer) {
    const rawPdf = fileBuffer.toString('latin1')
    const sources = [rawPdf]
    const streamRegex =
        /<<([\s\S]*?)>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g

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

function decodePdfTextToken(token: string) {
    if (token.startsWith('<')) {
        return decodePdfHexString(token.slice(1, -1))
    }

    return decodePdfEscapedString(token.slice(1, -1))
}

function extractTextFromPdf(fileBuffer: Buffer) {
    const text = getPdfTextSources(fileBuffer)
        .flatMap(extractTextOperations)
        .join('\n')

    return normalizeExtractedText(text)
}

async function createCvChunks(text: string, metadata: Record<string, unknown>) {
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: CV_CHUNK_SIZE,
        chunkOverlap: CV_CHUNK_OVERLAP,
    })

    return textSplitter.createDocuments([text], [metadata])
}

async function createEmbeddings(texts: string[]) {
    const apiKey = requireEnv(process.env.NVIDIA_API_KEY, 'NVIDIA_API_KEY')
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

function toVectorLiteral(embedding: number[]) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected ${EMBEDDING_DIMENSIONS} embedding dimensions`)
    }

    return `[${embedding.join(',')}]`
}

async function replaceUserCvDocuments({
    userId,
    filename,
    cvUrl,
    chunks,
    embeddings,
}: {
    userId: string
    filename: string
    cvUrl: string
    chunks: Awaited<ReturnType<typeof createCvChunks>>
    embeddings: number[][]
}) {
    const uploadedAt = new Date().toISOString()

    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
            `DELETE FROM public.documents
       WHERE "userId" = $1
         AND metadata @> '{"source":"cv"}'::jsonb`,
            userId,
        )

        for (const [index, chunk] of chunks.entries()) {
            const metadata = {
                ...chunk.metadata,
                userId,
                source: 'cv',
                filename,
                url: cvUrl,
                chunkIndex: index,
                uploadedAt,
            }

            await tx.$executeRawUnsafe(
                `INSERT INTO public.documents ("userId", content, metadata, embedding)
         VALUES ($1, $2, $3::jsonb, $4::vector)`,
                userId,
                chunk.pageContent,
                JSON.stringify(metadata),
                toVectorLiteral(embeddings[index]),
            )
        }
    })
}

async function indexCvForUser({
    userId,
    filename,
    cvUrl,
    fileBuffer,
}: {
    userId: string
    filename: string
    cvUrl: string
    fileBuffer: Buffer
}) {
    const text = extractTextFromPdf(fileBuffer)

    if (!text) {
        throw new Error('No text could be extracted from this PDF')
    }

    const chunks = await createCvChunks(text, {
        userId,
        source: 'cv',
        filename,
        url: cvUrl,
    })

    if (chunks.length === 0) {
        throw new Error('No CV chunks could be created')
    }

    const embeddings = await createEmbeddings(
        chunks.map((chunk) => chunk.pageContent),
    )

    await replaceUserCvDocuments({
        userId,
        filename,
        cvUrl,
        chunks,
        embeddings,
    })

    return chunks.length
}

function getUploadErrorResponse(error: unknown) {
    if (
        error instanceof Error &&
        (error.message === 'NVIDIA_API_KEY is not configured' ||
            error.message === 'No text could be extracted from this PDF')
    ) {
        return jsonError(error.message, 422)
    }

    return jsonError('Could not index CV for search', 502)
}

export async function GET(request: NextRequest) {
    const user = await getCurrentUser(request)

    if (!user) {
        return jsonError('Unauthorized', 401)
    }

    const cv = await getCvResponse(user.id)

    return NextResponse.json({ cv })
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser(request)

    if (!user) {
        return jsonError('Unauthorized', 401)
    }

    let formData: FormData

    try {
        formData = await request.formData()
    } catch {
        return jsonError('Invalid form data', 400)
    }

    const file = formData.get('file')

    if (!(file instanceof File)) {
        return jsonError('Please upload a PDF file', 400)
    }

    if (!isPdfFile(file)) {
        return jsonError('Only PDF files are allowed', 400)
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
        return jsonError('PDF must be 10MB or smaller', 400)
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    if (!hasPdfSignature(fileBuffer)) {
        return jsonError('Invalid PDF file', 400)
    }

    const filename = getUserCvFilename(user.id)
    const cvUrl = getUserCvUrl(user.id)

    try {
        const documentCount = await indexCvForUser({
            userId: user.id,
            filename,
            cvUrl,
            fileBuffer,
        })

        await mkdir(CV_UPLOAD_DIR, { recursive: true })
        await writeFile(getUserCvPath(user.id), fileBuffer)

        const cv = await getCvResponse(user.id)

        return NextResponse.json({
            message: 'CV uploaded and indexed successfully',
            cv: {
                ...cv,
                documentCount,
            },
        })
    } catch (error) {
        return getUploadErrorResponse(error)
    }
}
