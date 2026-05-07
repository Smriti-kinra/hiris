-- ─── 006_candidate_profile_columns.sql ───────────────────────────────────────
-- Columns used by the shared candidate profile and interview review surfaces.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS chatbot_transcript JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS faculty_notes TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS eval_scores JSONB NOT NULL DEFAULT '{}'::jsonb;
