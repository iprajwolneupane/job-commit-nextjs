-- CreateEnum
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "AppliedJobResponseEnum" AS ENUM ('NORESPONSE', 'REJECTED', 'INTERVIEW', 'SCREENINGQUESTIONS', 'OFFER', 'ACCEPTED', 'NOTINTERESTED');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('PENDING', 'SCRAPING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedInUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "contactNumber" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppliedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "appliedDate" TIMESTAMP(3) NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "sendMailAt" TIMESTAMP(3) NOT NULL,
    "sentMail" BOOLEAN NOT NULL DEFAULT false,
    "response" "AppliedJobResponseEnum" NOT NULL DEFAULT 'NORESPONSE',
    "link" TEXT NOT NULL,

    CONSTRAINT "AppliedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrappedJob" (
    "id" TEXT NOT NULL,
    "appliedJobId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "description" TEXT,
    "scrapeStatus" "ScrapeStatus" NOT NULL DEFAULT 'PENDING',
    "scrapedLink" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "scrapeAttempts" INTEGER NOT NULL DEFAULT 0,
    "scrapeError" TEXT,
    "lastScrapeAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrappedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "embedding" vector(768),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_userId_key" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_id_email_idx" ON "User"("createdAt", "id", "email");

-- CreateIndex
CREATE INDEX "Platform_userId_idx" ON "Platform"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_userId_name_key" ON "Platform"("userId", "name");

-- CreateIndex
CREATE INDEX "AppliedJob_userId_idx" ON "AppliedJob"("userId");

-- CreateIndex
CREATE INDEX "AppliedJob_userId_platformId_idx" ON "AppliedJob"("userId", "platformId");

-- CreateIndex
CREATE INDEX "AppliedJob_userId_appliedDate_idx" ON "AppliedJob"("userId", "appliedDate");

-- CreateIndex
CREATE INDEX "AppliedJob_userId_response_idx" ON "AppliedJob"("userId", "response");

-- CreateIndex
CREATE INDEX "AppliedJob_userId_sendMailAt_idx" ON "AppliedJob"("userId", "sendMailAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScrappedJob_appliedJobId_key" ON "ScrappedJob"("appliedJobId");

-- CreateIndex
CREATE INDEX "ScrappedJob_scrapeStatus_idx" ON "ScrappedJob"("scrapeStatus");

-- CreateIndex
CREATE INDEX "ScrappedJob_scrapedAt_idx" ON "ScrappedJob"("scrapedAt");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_embedding_idx"
ON "documents"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

-- CreateIndex
CREATE INDEX "documents_metadata_idx"
ON "documents"
USING gin ("metadata")
WHERE "metadata" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedJob" ADD CONSTRAINT "AppliedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedJob" ADD CONSTRAINT "AppliedJob_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrappedJob" ADD CONSTRAINT "ScrappedJob_appliedJobId_fkey" FOREIGN KEY ("appliedJobId") REFERENCES "AppliedJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateFunction
DROP FUNCTION IF EXISTS public.match_documents(vector, integer, jsonb);

CREATE FUNCTION public.match_documents(
    query_embedding vector,
    match_count integer DEFAULT 10,
    filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM public.documents AS d
    WHERE d.embedding IS NOT NULL
      AND d.metadata @> filter
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
