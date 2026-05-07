-- Interview workflow tables used by the AI interview routes and seed data.

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_stage_check;

UPDATE applications SET stage = 'under_review' WHERE stage = 'screening';
UPDATE applications SET stage = 'behavioral_interview' WHERE stage = 'interview';
UPDATE applications SET stage = 'behavioral_interview' WHERE stage = 'hr_interview';
UPDATE applications SET stage = 'final_review' WHERE stage = 'accepted';

ALTER TABLE applications ADD CONSTRAINT applications_stage_check CHECK (
  stage IN ('applied','under_review','technical_interview','behavioral_interview','final_review','offered','rejected')
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                  SERIAL PRIMARY KEY,
  application_id      INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type                VARCHAR(50) NOT NULL,
  status              VARCHAR(20) DEFAULT 'ongoing',
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  duration_secs       INTEGER,
  recording_url       TEXT,
  transcript          JSONB DEFAULT '[]'::jsonb,
  ai_summary          TEXT,
  interviewer_notes   TEXT,
  recommendation      VARCHAR(50),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_evaluations (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  trait_name      VARCHAR(100) NOT NULL,
  score           INTEGER CHECK (score >= 0 AND score <= 10),
  is_ai           BOOLEAN DEFAULT FALSE,
  comments        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_int_sessions_app ON interview_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_int_eval_session ON interview_evaluations(session_id);
