-- Add visible_stages to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS visible_stages TEXT[];

-- Update CHRO (Role ID 1)
UPDATE roles 
SET visible_stages = ARRAY['behavioral_interview', 'final_review', 'offered', 'rejected'] 
WHERE id = 1;

-- Update Hiring Manager (Role ID 2)
UPDATE roles 
SET visible_stages = ARRAY['applied', 'under_review'] 
WHERE id = 2;

-- Update Faculty (Role ID 3)
UPDATE roles 
SET visible_stages = ARRAY['technical_interview'] 
WHERE id = 3;
