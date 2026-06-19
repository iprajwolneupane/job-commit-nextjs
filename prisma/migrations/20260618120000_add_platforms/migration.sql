CREATE TABLE IF NOT EXISTS public."Platform" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

INSERT INTO public."Platform" ("id", "userId", "name")
SELECT
    'platform_' || md5("userId" || ':' || normalized_platform) AS "id",
    "userId",
    normalized_platform AS "name"
FROM (
    SELECT DISTINCT
        "userId",
        COALESCE(NULLIF(BTRIM("platform"), ''), 'Unknown') AS normalized_platform
    FROM public."AppliedJob"
) AS existing_platforms
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE public."AppliedJob"
ADD COLUMN IF NOT EXISTS "platformId" TEXT;

UPDATE public."AppliedJob" AS job
SET "platformId" = platform."id"
FROM public."Platform" AS platform
WHERE platform."userId" = job."userId"
  AND platform."name" = COALESCE(NULLIF(BTRIM(job."platform"), ''), 'Unknown')
  AND job."platformId" IS NULL;

ALTER TABLE public."AppliedJob"
ALTER COLUMN "platformId" SET NOT NULL;

ALTER TABLE public."AppliedJob"
DROP COLUMN IF EXISTS "platform";

CREATE UNIQUE INDEX IF NOT EXISTS "Platform_userId_name_key"
ON public."Platform"("userId", "name");

CREATE INDEX IF NOT EXISTS "Platform_userId_idx"
ON public."Platform"("userId");

CREATE INDEX IF NOT EXISTS "AppliedJob_userId_platformId_idx"
ON public."AppliedJob"("userId", "platformId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Platform_userId_fkey'
    ) THEN
        ALTER TABLE public."Platform"
        ADD CONSTRAINT "Platform_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES public."User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'AppliedJob_platformId_fkey'
    ) THEN
        ALTER TABLE public."AppliedJob"
        ADD CONSTRAINT "AppliedJob_platformId_fkey"
        FOREIGN KEY ("platformId")
        REFERENCES public."Platform"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
    END IF;
END;
$$;
