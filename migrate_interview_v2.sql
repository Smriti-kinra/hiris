-- Part 1: Update Application Stages
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_stage_check;
ALTER TABLE applications ADD CONSTRAINT applications_stage_check CHECK (
  stage IN ('applied','under_review','technical_interview','behavioral_interview','final_review','offered','rejected')
);

-- Migrate data to new stages
UPDATE applications SET stage = 'under_review' WHERE stage = 'screening';
UPDATE applications SET stage = 'behavioral_interview' WHERE stage = 'hr_interview';
UPDATE applications SET stage = 'final_review' WHERE stage = 'accepted';

-- Part 2: Interview Management Tables

-- Main session table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type            VARCHAR(50) NOT NULL, -- 'technical' or 'behavioral'
  status          VARCHAR(20) DEFAULT 'ongoing', -- 'ongoing', 'completed'
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_secs   INTEGER,
  recording_url   TEXT,
  transcript      JSONB DEFAULT '[]'::jsonb,
  ai_summary      TEXT,
  interviewer_notes TEXT,
  recommendation  VARCHAR(50), -- 'strong_hire', 'hire', 'neutral', 'no_hire'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trait-wise evaluations
CREATE TABLE IF NOT EXISTS interview_evaluations (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  trait_name      VARCHAR(100) NOT NULL,
  score           INTEGER CHECK (score >= 0 AND score <= 10),
  is_ai           BOOLEAN DEFAULT FALSE,
  comments        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_int_sessions_app ON interview_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_int_eval_session ON interview_evaluations(session_id);
