-- ─────────────────────────────────────────────────────────────────────────────
-- 007_faculty_workflow.sql
-- Faculty interview workflow enhancements:
--   1. Add recording_path column to interview_sessions (safe no-op if exists)
--   2. Ensure applications.stage allows all required values
--   3. Add reviewer_notes table for per-session faculty notes
--   4. Add candidate_stage_history table for audit trail
--   5. Add performance indices for pipeline queries
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. recording_path on interview_sessions (Whisper stores file here)
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS recording_path TEXT;

-- 2. audio_transcript on interview_sessions (Whisper output)
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS audio_transcript TEXT;

-- 3. Reviewer notes table — per-session faculty notes, separate from interviewer_notes
--    (allows saving mid-interview without ending the session)
CREATE TABLE IF NOT EXISTS reviewer_notes (
  id            SERIAL PRIMARY KEY,
  session_id    INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  reviewer_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  candidate_id  INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  interview_id  INTEGER REFERENCES interviews(id) ON DELETE SET NULL,
  notes         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviewer_notes_session   ON reviewer_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_notes_candidate ON reviewer_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_notes_reviewer  ON reviewer_notes(reviewer_id);

-- 4. Candidate stage history for audit trail
CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id             BIGSERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id   INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  from_stage     VARCHAR(50),
  to_stage       VARCHAR(50) NOT NULL,
  changed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes          TEXT,
  changed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_app       ON candidate_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_candidate ON candidate_stage_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at ON candidate_stage_history(changed_at DESC);

-- 5. Performance indices for CHRO pipeline queries
CREATE INDEX IF NOT EXISTS idx_applications_stage_orgid ON applications(stage, org_id);
CREATE INDEX IF NOT EXISTS idx_interviews_app_status    ON interviews(application_id, status);
