-- 1. Create orgs table
CREATE TABLE IF NOT EXISTS orgs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  industry VARCHAR(100),
  size VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- 3. Modify users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 4. Migrate existing data (Plaksha University)
INSERT INTO orgs (name, industry, size) 
VALUES ('Plaksha University', 'Higher Education', '51–200') 
ON CONFLICT (name) DO NOTHING;

UPDATE users SET org_id = (SELECT id FROM orgs WHERE name = 'Plaksha University') WHERE org = 'Plaksha University' AND org_id IS NULL;

-- 5. Insert default roles for Plaksha
INSERT INTO roles (org_id, name, permissions) 
SELECT id, 'CHRO', '{"can_request_jobs": false, "can_build_jd": false, "can_review_jd": true, "can_conduct_interview": true, "can_make_final_decision": true, "can_view_analytics": true, "can_manage_team": true, "can_manage_roles": true}'::jsonb 
FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT DO NOTHING;

INSERT INTO roles (org_id, name, permissions) 
SELECT id, 'Hiring Manager', '{"can_request_jobs": false, "can_build_jd": true, "can_review_jd": false, "can_conduct_interview": false, "can_make_final_decision": false, "can_view_analytics": true, "can_manage_team": false, "can_manage_roles": false}'::jsonb 
FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT DO NOTHING;

INSERT INTO roles (org_id, name, permissions) 
SELECT id, 'Faculty', '{"can_request_jobs": true, "can_build_jd": false, "can_review_jd": true, "can_conduct_interview": true, "can_make_final_decision": false, "can_view_analytics": false, "can_manage_team": false, "can_manage_roles": false}'::jsonb 
FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT DO NOTHING;

-- 6. Link existing users to these roles
UPDATE users SET role_id = (SELECT id FROM roles WHERE roles.name = 'CHRO' AND roles.org_id = users.org_id) WHERE role = 'chro' AND role_id IS NULL;
UPDATE users SET role_id = (SELECT id FROM roles WHERE roles.name = 'Hiring Manager' AND roles.org_id = users.org_id) WHERE role = 'hiring_manager' AND role_id IS NULL;
UPDATE users SET role_id = (SELECT id FROM roles WHERE roles.name = 'Faculty' AND roles.org_id = users.org_id) WHERE role = 'faculty' AND role_id IS NULL;
