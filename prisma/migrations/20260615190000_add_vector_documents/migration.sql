CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(768)
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON public.documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

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
