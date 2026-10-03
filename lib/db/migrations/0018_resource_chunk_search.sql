CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("content", ''))) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_chunk_search_vector_index" ON "ResourceChunk" USING gin ("search_vector");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_chunk_user_subject_index" ON "ResourceChunk" ("user_id", "subject_id");
