-- Add org_id to core tables to support multi-tenancy
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE headcount_requests ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;

-- Backfill data to the primary organization (Plaksha University)
DO $$
DECLARE
    primary_org_id INTEGER;
BEGIN
    SELECT id INTO primary_org_id FROM orgs WHERE name = 'Plaksha University' LIMIT 1;
    
    IF primary_org_id IS NOT NULL THEN
        UPDATE jobs SET org_id = primary_org_id WHERE org_id IS NULL;
        UPDATE candidates SET org_id = primary_org_id WHERE org_id IS NULL;
        UPDATE applications SET org_id = primary_org_id WHERE org_id IS NULL;
        UPDATE headcount_requests SET org_id = primary_org_id WHERE org_id IS NULL;
    END IF;
END $$;
