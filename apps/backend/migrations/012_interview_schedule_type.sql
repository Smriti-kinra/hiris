-- Add explicit interview type to scheduled interview rows.
-- This avoids inferring behavior from display labels like "Final Interview".

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS interview_type VARCHAR(50);

UPDATE interviews
SET interview_type = CASE
  WHEN LOWER(COALESCE(round, '')) LIKE '%technical%' THEN 'technical'
  WHEN LOWER(COALESCE(round, '')) LIKE '%behavioral%' THEN 'behavioral'
  WHEN LOWER(COALESCE(round, '')) LIKE '%final%' THEN 'behavioral'
  ELSE interview_type
END
WHERE interview_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_interviews_app_type_status
  ON interviews(application_id, interview_type, status);
