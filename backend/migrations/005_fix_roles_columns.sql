-- Fix roles table by adding missing columns used by the Auth system and Job Posting Builder
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS visible_stages TEXT[] DEFAULT '{applied}';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permission_groups JSONB DEFAULT '[]';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS template_key VARCHAR(50);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS landing_portal VARCHAR(50) DEFAULT 'hiring';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS home_path VARCHAR(255);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update default roles with their landing portals
UPDATE roles SET landing_portal = 'chro', home_path = '/chro' WHERE name = 'CHRO';
UPDATE roles SET landing_portal = 'hiring', home_path = '/hiring' WHERE name = 'Hiring Manager';
UPDATE roles SET landing_portal = 'faculty', home_path = '/faculty' WHERE name = 'Faculty';
