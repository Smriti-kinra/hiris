-- Part 1: Upgrade pipeline stages (interview → technical_interview + hr_interview)
ALTER TABLE applications DROP CONSTRAINT applications_stage_check;
ALTER TABLE applications ADD CONSTRAINT applications_stage_check CHECK (
  stage IN ('applied','screening','technical_interview','hr_interview','offered','accepted','rejected')
);

-- Migrate existing 'interview' rows to 'technical_interview'
UPDATE applications SET stage = 'technical_interview' WHERE stage = 'interview';

-- Part 2: Institutional values policy document table
CREATE TABLE IF NOT EXISTS policy_documents (
  id          SERIAL PRIMARY KEY,
  category    VARCHAR(100) NOT NULL DEFAULT 'institutional_values',
  title       VARCHAR(300) NOT NULL,
  filename    VARCHAR(300) NOT NULL,
  filepath    TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  version     INTEGER DEFAULT 1
);

-- Ensure uploads dir row-level index
CREATE INDEX IF NOT EXISTS idx_policy_docs_category ON policy_documents(category);
