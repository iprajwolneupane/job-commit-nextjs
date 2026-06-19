DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ScrapeStatus'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."ScrapeStatus" AS ENUM (
            'PENDING',
            'SCRAPING',
            'COMPLETED',
            'FAILED',
            'SKIPPED'
        );
    END IF;
END;
$$;

ALTER TABLE public."AppliedJob"
ADD COLUMN IF NOT EXISTS "jobDescription" TEXT,
ADD COLUMN IF NOT EXISTS "scrapeStatus" public."ScrapeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "scrapedLink" TEXT,
ADD COLUMN IF NOT EXISTS "scrapedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "scrapeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "scrapeError" TEXT,
ADD COLUMN IF NOT EXISTS "lastScrapeAttemptAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS public."ScrappedJob" (
    "id" TEXT NOT NULL,
    "appliedJobId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "description" TEXT,
    "scrapeStatus" public."ScrapeStatus" NOT NULL DEFAULT 'PENDING',
    "scrapedLink" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "scrapeAttempts" INTEGER NOT NULL DEFAULT 0,
    "scrapeError" TEXT,
    "lastScrapeAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrappedJob_pkey" PRIMARY KEY ("id")
);

INSERT INTO public."ScrappedJob" (
    "id",
    "appliedJobId",
    "link",
    "title",
    "company",
    "description",
    "scrapeStatus",
    "scrapedLink",
    "scrapedAt",
    "scrapeAttempts",
    "scrapeError",
    "lastScrapeAttemptAt"
)
SELECT
    'scrapped_' || md5(job."id") AS "id",
    job."id" AS "appliedJobId",
    COALESCE(NULLIF(BTRIM(job."scrapedLink"), ''), job."link") AS "link",
    job."position" AS "title",
    job."company" AS "company",
    job."jobDescription" AS "description",
    job."scrapeStatus" AS "scrapeStatus",
    job."scrapedLink" AS "scrapedLink",
    job."scrapedAt" AS "scrapedAt",
    job."scrapeAttempts" AS "scrapeAttempts",
    job."scrapeError" AS "scrapeError",
    job."lastScrapeAttemptAt" AS "lastScrapeAttemptAt"
FROM public."AppliedJob" AS job
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "ScrappedJob_appliedJobId_key"
ON public."ScrappedJob"("appliedJobId");

CREATE INDEX IF NOT EXISTS "ScrappedJob_scrapeStatus_idx"
ON public."ScrappedJob"("scrapeStatus");

CREATE INDEX IF NOT EXISTS "ScrappedJob_scrapedAt_idx"
ON public."ScrappedJob"("scrapedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ScrappedJob_appliedJobId_fkey'
    ) THEN
        ALTER TABLE public."ScrappedJob"
        ADD CONSTRAINT "ScrappedJob_appliedJobId_fkey"
        FOREIGN KEY ("appliedJobId")
        REFERENCES public."AppliedJob"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END;
$$;

ALTER TABLE public."AppliedJob"
DROP COLUMN IF EXISTS "jobDescription",
DROP COLUMN IF EXISTS "scrapeStatus",
DROP COLUMN IF EXISTS "scrapedLink",
DROP COLUMN IF EXISTS "scrapedAt",
DROP COLUMN IF EXISTS "scrapeAttempts",
DROP COLUMN IF EXISTS "scrapeError",
DROP COLUMN IF EXISTS "lastScrapeAttemptAt";
