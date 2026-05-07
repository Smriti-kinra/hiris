CREATE TABLE IF NOT EXISTS public_job_links (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_file_id VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_file_id VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_answers JSONB DEFAULT '{}';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_chat_answers JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS candidate_summaries (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id)
);

CREATE TABLE IF NOT EXISTS generated_behavioral_questions (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  context TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
