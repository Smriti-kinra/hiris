-- Part 1: Candidate file tracking
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_path TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_path TEXT;

-- Part 2: AI-generated questions per candidate
CREATE TABLE IF NOT EXISTS candidate_questions (
  id              SERIAL PRIMARY KEY,
  candidate_id    INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  interview_type  VARCHAR(50) NOT NULL DEFAULT 'behavioral',
  questions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_context  TEXT,
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cq_candidate ON candidate_questions(candidate_id);

-- Part 3: Extend interview_sessions for recording
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS recording_path TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS audio_transcript TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS ai_traits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb;

-- Seed resume/CV paths for all existing candidates
UPDATE candidates SET resume_path = 'uploads/seeded_resume.pdf' WHERE resume_path IS NULL;
UPDATE candidates SET cv_path     = 'uploads/seeded_cv.pdf'     WHERE cv_path IS NULL;
