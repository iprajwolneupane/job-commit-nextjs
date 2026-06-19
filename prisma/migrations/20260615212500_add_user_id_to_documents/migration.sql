ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS "userId" TEXT;

DELETE FROM public.documents
WHERE "userId" IS NULL;

ALTER TABLE public.documents
ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS documents_user_id_idx
ON public.documents ("userId");

CREATE INDEX IF NOT EXISTS documents_metadata_idx
ON public.documents
USING gin (metadata)
WHERE metadata IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_userId_fkey'
    ) THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT "documents_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES public."User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END;
$$;
