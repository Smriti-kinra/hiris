-- ─── 005_dynamic_role_system.sql ────────────────────────────────────────────
-- Moves HIRIS from persona-specific roles toward organisation-defined RBAC.
-- Roles keep permissions, pipeline visibility, and landing metadata per org.

-- Roles: metadata + configurable data visibility.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS template_key VARCHAR(80);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permission_groups JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS visible_stages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE roles ADD COLUMN IF NOT EXISTS landing_portal VARCHAR(40) NOT NULL DEFAULT 'hiring';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS home_path VARCHAR(160);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_roles_template_key ON roles(template_key);

-- Users: role is now a dynamic slug instead of a checked persona enum.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(org_id, role_id);

-- Organisation scoping for hiring data.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE SET NULL;
ALTER TABLE headcount_requests ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE SET NULL;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES orgs(id) ON DELETE SET NULL;

UPDATE jobs j
SET org_id = u.org_id
FROM users u
WHERE j.manager_id = u.id AND j.org_id IS NULL;

UPDATE headcount_requests hr
SET org_id = u.org_id
FROM users u
WHERE hr.requested_by = u.id AND hr.org_id IS NULL;

UPDATE headcount_requests hr
SET org_id = j.org_id
FROM jobs j
WHERE hr.job_id = j.id AND hr.org_id IS NULL;

UPDATE applications a
SET org_id = j.org_id
FROM jobs j
WHERE a.job_id = j.id AND a.org_id IS NULL;

UPDATE candidates c
SET org_id = a.org_id
FROM applications a
WHERE a.candidate_id = c.id AND c.org_id IS NULL AND a.org_id IS NOT NULL;

UPDATE jobs SET org_id = (SELECT id FROM orgs WHERE name = 'Plaksha University') WHERE org_id IS NULL;
UPDATE headcount_requests SET org_id = (SELECT id FROM orgs WHERE name = 'Plaksha University') WHERE org_id IS NULL;
UPDATE applications SET org_id = (SELECT id FROM orgs WHERE name = 'Plaksha University') WHERE org_id IS NULL;
UPDATE candidates SET org_id = (SELECT id FROM orgs WHERE name = 'Plaksha University') WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_headcount_requests_org_id ON headcount_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON candidates(org_id);
CREATE INDEX IF NOT EXISTS idx_applications_org_id ON applications(org_id);

-- Audit trail for role lifecycle and permission changes.
CREATE TABLE IF NOT EXISTS role_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(40) NOT NULL,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_audit_logs_org_role ON role_audit_logs(org_id, role_id, created_at DESC);

-- Seed/upgrade the demo organisation's default templates.
INSERT INTO roles (org_id, name, description, template_key, is_system, permission_groups, visible_stages, landing_portal, home_path, permissions)
SELECT id, 'Recruiter',
  'Coordinates candidate intake, screening, interview scheduling, and early pipeline movement.',
  'recruiter', TRUE, '["requests","jobs","candidates","interviews"]'::jsonb,
  ARRAY['applied','under_review','technical_interview','behavioral_interview'],
  'hiring', '/hiring/candidates',
  '{
    "can_request_jobs": false,
    "can_view_requests": true,
    "can_view_all_requests": false,
    "can_approve_requests": false,
    "can_view_jobs": true,
    "can_build_jd": false,
    "can_review_jd": false,
    "can_post_jobs": false,
    "can_view_candidates": true,
    "can_update_candidate_notes": true,
    "can_move_candidates": true,
    "can_view_interviews": true,
    "can_conduct_interview": false,
    "can_make_final_decision": false,
    "can_view_analytics": false,
    "can_view_policies": true,
    "can_manage_policies": false,
    "can_manage_team": false,
    "can_manage_roles": false,
    "is_admin": false
  }'::jsonb
FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT (org_id, name) DO NOTHING;

UPDATE roles SET
  description = 'Owns governance, analytics, policies, final interviews, role setup, and approvals.',
  template_key = 'chro',
  is_system = TRUE,
  permission_groups = '["requests","jobs","candidates","interviews","governance"]'::jsonb,
  visible_stages = ARRAY['applied','under_review','technical_interview','behavioral_interview','final_review','offered','rejected'],
  landing_portal = 'chro',
  home_path = '/chro',
  permissions = '{
    "can_request_jobs": false,
    "can_view_requests": true,
    "can_view_all_requests": true,
    "can_approve_requests": true,
    "can_view_jobs": true,
    "can_build_jd": false,
    "can_review_jd": true,
    "can_post_jobs": true,
    "can_view_candidates": true,
    "can_update_candidate_notes": true,
    "can_move_candidates": true,
    "can_view_interviews": true,
    "can_conduct_interview": true,
    "can_make_final_decision": true,
    "can_view_analytics": true,
    "can_view_policies": true,
    "can_manage_policies": true,
    "can_manage_team": true,
    "can_manage_roles": true,
    "is_admin": true
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'CHRO';

UPDATE roles SET
  description = 'Builds job descriptions, manages posted jobs, reviews early-stage candidates, and tracks requests.',
  template_key = 'hiring-manager',
  is_system = TRUE,
  permission_groups = '["requests","jobs","candidates"]'::jsonb,
  visible_stages = ARRAY['applied','under_review'],
  landing_portal = 'hiring',
  home_path = '/hiring',
  permissions = '{
    "can_request_jobs": false,
    "can_view_requests": true,
    "can_view_all_requests": true,
    "can_approve_requests": false,
    "can_view_jobs": true,
    "can_build_jd": true,
    "can_review_jd": false,
    "can_post_jobs": true,
    "can_view_candidates": true,
    "can_update_candidate_notes": true,
    "can_move_candidates": true,
    "can_view_interviews": true,
    "can_conduct_interview": false,
    "can_make_final_decision": false,
    "can_view_analytics": true,
    "can_view_policies": true,
    "can_manage_policies": false,
    "can_manage_team": false,
    "can_manage_roles": false,
    "is_admin": false
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'Hiring Manager';

UPDATE roles SET
  description = 'Submits requests, reviews JDs, and conducts technical interviews.',
  template_key = 'faculty',
  is_system = TRUE,
  permission_groups = '["requests","jobs","candidates","interviews"]'::jsonb,
  visible_stages = ARRAY['technical_interview'],
  landing_portal = 'faculty',
  home_path = '/faculty',
  permissions = '{
    "can_request_jobs": true,
    "can_view_requests": true,
    "can_view_all_requests": false,
    "can_approve_requests": false,
    "can_view_jobs": true,
    "can_build_jd": false,
    "can_review_jd": true,
    "can_post_jobs": false,
    "can_view_candidates": true,
    "can_update_candidate_notes": true,
    "can_move_candidates": false,
    "can_view_interviews": true,
    "can_conduct_interview": true,
    "can_make_final_decision": false,
    "can_view_analytics": false,
    "can_view_policies": true,
    "can_manage_policies": false,
    "can_manage_team": false,
    "can_manage_roles": false,
    "is_admin": false
  }'::jsonb,
  updated_at = NOW()
WHERE name = 'Faculty';

-- Keep legacy user slugs aligned with their dynamic role records.
UPDATE users u
SET role = COALESCE(r.template_key, LOWER(REPLACE(r.name, ' ', '-'))),
    portal = r.landing_portal,
    title = COALESCE(u.title, r.name)
FROM roles r
WHERE u.role_id = r.id;
