ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "question_indexes" json DEFAULT '[]'::json NOT NULL;
