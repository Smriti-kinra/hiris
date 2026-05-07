-- Add visible_stages to roles table. This migration predates the dynamic
-- role system; keep it name-based so fresh databases do not depend on IDs.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS visible_stages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE roles
SET visible_stages = ARRAY['applied', 'under_review', 'technical_interview', 'behavioral_interview', 'final_review', 'offered', 'rejected']
WHERE name = 'CHRO' AND (visible_stages IS NULL OR array_length(visible_stages, 1) IS NULL);

UPDATE roles
SET visible_stages = ARRAY['applied', 'under_review']
WHERE name = 'Hiring Manager' AND (visible_stages IS NULL OR array_length(visible_stages, 1) IS NULL);

UPDATE roles
SET visible_stages = ARRAY['technical_interview']
WHERE name = 'Faculty' AND (visible_stages IS NULL OR array_length(visible_stages, 1) IS NULL);
