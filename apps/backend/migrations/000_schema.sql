-- ─────────────────────────────────────────────────────────────────────────────
-- HIRIS — Base Schema (000_schema.sql)
-- This file creates the full database from scratch and seeds demo data.
-- It is mounted into postgres via docker-entrypoint-initdb.d and runs
-- automatically on the FIRST startup of a blank postgres container.
--
-- Incremental migrations (001_*.sql, 002_*.sql …) run afterwards via
--   node migrate.js
-- and apply additive changes on top of this foundation.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Organisations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  industry    VARCHAR(100),
  size        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Roles (dynamic RBAC per org) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id                SERIAL PRIMARY KEY,
  org_id            INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  is_system         BOOLEAN NOT NULL DEFAULT FALSE,
  template_key      VARCHAR(80),
  permission_groups JSONB NOT NULL DEFAULT '[]',
  visible_stages    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  landing_portal    VARCHAR(40) NOT NULL DEFAULT 'hiring',
  home_path         VARCHAR(160),
  permissions       JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  role          VARCHAR(80),
  portal        VARCHAR(20),
  title         VARCHAR(100),
  org           VARCHAR(200),
  org_id        INTEGER REFERENCES orgs(id) ON DELETE SET NULL,
  role_id       INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  password_hash TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_org_id  ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ── Role audit logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  org_id        INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  role_id       INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(40) NOT NULL,
  before        JSONB,
  after         JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_audit_logs_org_role ON role_audit_logs(org_id, role_id, created_at DESC);

-- ── Jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id          SERIAL PRIMARY KEY,
  org_id      INTEGER REFERENCES orgs(id) ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  department  VARCHAR(100),
  status      VARCHAR(50)  DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'closed', 'draft')),
  job_type    VARCHAR(50)  DEFAULT 'Full-time',
  urgency     VARCHAR(20)  DEFAULT 'medium'
                CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  description TEXT,
  location    VARCHAR(200),
  manager_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  posted_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_manager_id ON jobs(manager_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org_id     ON jobs(org_id);

-- ── Headcount Requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS headcount_requests (
  id           SERIAL PRIMARY KEY,
  org_id       INTEGER REFERENCES orgs(id) ON DELETE SET NULL,
  job_id       INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  headcount    INTEGER  NOT NULL DEFAULT 1 CHECK (headcount > 0),
  urgency      VARCHAR(20) DEFAULT 'medium',
  deadline     DATE,
  notes        TEXT,
  status       VARCHAR(30) DEFAULT 'pending'
                 CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hcr_status       ON headcount_requests(status);
CREATE INDEX IF NOT EXISTS idx_hcr_requested_by ON headcount_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_hcr_org_id       ON headcount_requests(org_id);

-- ── Candidates ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id          SERIAL PRIMARY KEY,
  org_id      INTEGER REFERENCES orgs(id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(200),
  phone       VARCHAR(50),
  headline    TEXT,
  location    VARCHAR(200),
  resume_url  TEXT,
  source      VARCHAR(100),
  ai_score    NUMERIC(5,2),
  education   JSONB NOT NULL DEFAULT '[]',
  experience  JSONB NOT NULL DEFAULT '[]',
  skills      JSONB NOT NULL DEFAULT '[]',
  ai_summary  TEXT,
  chatbot_transcript JSONB NOT NULL DEFAULT '[]',
  custom_answers JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON candidates(org_id);

-- ── Applications (candidate ↔ job) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id           SERIAL PRIMARY KEY,
  org_id       INTEGER REFERENCES orgs(id) ON DELETE SET NULL,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  job_id       INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  stage        VARCHAR(30) DEFAULT 'applied'
                 CHECK (stage IN ('applied', 'screening', 'interview', 'offered', 'accepted', 'rejected')),
  applied_at   TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT,
  manager_notes TEXT,
  faculty_notes TEXT,
  eval_scores JSONB NOT NULL DEFAULT '{}',
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job       ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage     ON applications(stage);
CREATE INDEX IF NOT EXISTS idx_applications_org_id    ON applications(org_id);

-- ── Interviews ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at   TIMESTAMPTZ,
  round          VARCHAR(100),
  status         VARCHAR(30) DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled', 'pending')),
  notes          TEXT,
  calendly_link  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status      ON interviews(status);

-- ── Hiring Policies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hiring_policies (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  description TEXT,
  effective   DATE DEFAULT CURRENT_DATE,
  active      BOOLEAN DEFAULT TRUE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO DATA — Plaksha University
-- Passwords are set via `node seed-passwords.js` after first run.
-- ─────────────────────────────────────────────────────────────────────────────

-- Organisation
INSERT INTO orgs (name, industry, size)
VALUES ('Plaksha University', 'Higher Education', '51–200')
ON CONFLICT (name) DO NOTHING;

-- Default roles
INSERT INTO roles (org_id, name)
SELECT id, 'CHRO' FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT (org_id, name) DO NOTHING;

UPDATE roles SET
  description = 'Owns governance, analytics, policies, final interviews, role setup, and approvals.',
  is_system = TRUE,
  template_key = 'chro',
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
}'::jsonb
WHERE name = 'CHRO';

INSERT INTO roles (org_id, name)
SELECT id, 'Hiring Manager' FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT (org_id, name) DO NOTHING;

UPDATE roles SET
  description = 'Builds job descriptions, manages posted jobs, reviews early-stage candidates, and tracks requests.',
  is_system = TRUE,
  template_key = 'hiring-manager',
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
}'::jsonb
WHERE name = 'Hiring Manager';

INSERT INTO roles (org_id, name)
SELECT id, 'Recruiter' FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT (org_id, name) DO NOTHING;

UPDATE roles SET
  description = 'Coordinates candidate intake, screening, interview scheduling, and early pipeline movement.',
  is_system = TRUE,
  template_key = 'recruiter',
  permission_groups = '["requests","jobs","candidates","interviews"]'::jsonb,
  visible_stages = ARRAY['applied','under_review','technical_interview','behavioral_interview'],
  landing_portal = 'hiring',
  home_path = '/hiring/candidates',
  permissions = '{
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
WHERE name = 'Recruiter';

INSERT INTO roles (org_id, name)
SELECT id, 'Faculty' FROM orgs WHERE name = 'Plaksha University'
ON CONFLICT (org_id, name) DO NOTHING;

UPDATE roles SET
  description = 'Submits requests, reviews JDs, and conducts technical interviews.',
  is_system = TRUE,
  template_key = 'faculty',
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
}'::jsonb
WHERE name = 'Faculty';

-- Demo users (passwords set by seed-passwords.js)
INSERT INTO users (name, email, role, portal, title, org, org_id, role_id)
SELECT
  'Smriti Kinra',
  'smriti.kinra@hiris.demo',
  'chro',
  'chro',
  'Chief HR Officer',
  'Plaksha University',
  o.id,
  r.id
FROM orgs o
JOIN roles r ON r.org_id = o.id AND r.name = 'CHRO'
WHERE o.name = 'Plaksha University'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, role, portal, title, org, org_id, role_id)
SELECT
  'Sartajdeep Singh',
  'sartajdeep.singh@hiris.demo',
  'hiring_manager',
  'hiring',
  'Hiring Manager',
  'Plaksha University',
  o.id,
  r.id
FROM orgs o
JOIN roles r ON r.org_id = o.id AND r.name = 'Hiring Manager'
WHERE o.name = 'Plaksha University'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, role, portal, title, org, org_id, role_id)
SELECT
  'Gracy Tanna',
  'gracy.tanna@hiris.demo',
  'faculty',
  'faculty',
  'Faculty Member',
  'Plaksha University',
  o.id,
  r.id
FROM orgs o
JOIN roles r ON r.org_id = o.id AND r.name = 'Faculty'
WHERE o.name = 'Plaksha University'
ON CONFLICT (email) DO NOTHING;

-- Demo jobs
INSERT INTO jobs (org_id, title, department, status, job_type, urgency, location, manager_id)
SELECT u.org_id, 'Assistant Professor – Computer Science', 'Computer Science', 'active', 'Full-time', 'high', 'Plaksha University', u.id
FROM users u WHERE u.email = 'sartajdeep.singh@hiris.demo'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (org_id, title, department, status, job_type, urgency, location, manager_id)
SELECT u.org_id, 'Research Associate – Life Sciences', 'Life Sciences', 'active', 'Full-time', 'medium', 'Plaksha University', u.id
FROM users u WHERE u.email = 'sartajdeep.singh@hiris.demo'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (org_id, title, department, status, job_type, urgency, location, manager_id)
SELECT u.org_id, 'Lab Technician – Electrical Engineering', 'Electrical Engineering', 'active', 'Contract', 'low', 'Plaksha University', u.id
FROM users u WHERE u.email = 'sartajdeep.singh@hiris.demo'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (org_id, title, department, status, job_type, urgency, location, manager_id)
SELECT u.org_id, 'Product Designer – UX', 'Design', 'pending', 'Full-time', 'medium', 'Plaksha University', u.id
FROM users u WHERE u.email = 'sartajdeep.singh@hiris.demo'
ON CONFLICT DO NOTHING;

-- Demo headcount requests
INSERT INTO headcount_requests (org_id, job_id, requested_by, headcount, urgency, deadline, notes, status)
SELECT u.org_id, j.id, u.id, 2, 'high', CURRENT_DATE + 30, 'Urgent replacement for departing faculty.', 'pending'
FROM jobs j, users u WHERE j.title ILIKE '%Computer Science%' AND u.email = 'gracy.tanna@hiris.demo'
ON CONFLICT DO NOTHING;

INSERT INTO headcount_requests (org_id, job_id, requested_by, headcount, urgency, deadline, notes, status)
SELECT u.org_id, j.id, u.id, 1, 'medium', CURRENT_DATE + 60, 'Expansion of research programme.', 'approved'
FROM jobs j, users u WHERE j.title ILIKE '%Life Sciences%' AND u.email = 'gracy.tanna@hiris.demo'
ON CONFLICT DO NOTHING;

INSERT INTO headcount_requests (org_id, job_id, requested_by, headcount, urgency, deadline, notes, status)
SELECT u.org_id, j.id, u.id, 1, 'low', CURRENT_DATE + 90, 'Lab support for new semester.', 'under_review'
FROM jobs j, users u WHERE j.title ILIKE '%Lab Technician%' AND u.email = 'gracy.tanna@hiris.demo'
ON CONFLICT DO NOTHING;

-- Demo candidates
INSERT INTO candidates (org_id, name, email, phone, source, ai_score)
SELECT o.id, v.name, v.email, v.phone, v.source, v.ai_score
FROM orgs o
CROSS JOIN (VALUES
  ('Rahul Verma',    'rahul.verma@example.com',    '+91-9876543210', 'LinkedIn', 87.5),
  ('Prateek Sharma', 'prateek.sharma@example.com', '+91-9123456780', 'Referral', 74.0),
  ('Simran Bedi',    'simran.bedi@example.com',    '+91-9988776655', 'Naukri',   91.2),
  ('Karan Malhotra', 'karan.malhotra@example.com', '+91-9871234560', 'LinkedIn', 68.3),
  ('Ananya Gupta',   'ananya.gupta@example.com',   '+91-9765432100', 'Indeed',   82.0)
) AS v(name, email, phone, source, ai_score)
WHERE o.name = 'Plaksha University'
ON CONFLICT DO NOTHING;

-- Demo applications
INSERT INTO applications (org_id, candidate_id, job_id, stage, notes)
SELECT j.org_id, c.id, j.id, 'screening', 'Strong ML background'
FROM candidates c, jobs j
WHERE c.name = 'Rahul Verma' AND j.title ILIKE '%Computer Science%'
ON CONFLICT DO NOTHING;

INSERT INTO applications (org_id, candidate_id, job_id, stage, notes)
SELECT j.org_id, c.id, j.id, 'interview', 'Good research profile'
FROM candidates c, jobs j
WHERE c.name = 'Prateek Sharma' AND j.title ILIKE '%Life Sciences%'
ON CONFLICT DO NOTHING;

INSERT INTO applications (org_id, candidate_id, job_id, stage, notes)
SELECT j.org_id, c.id, j.id, 'offered', 'Excellent performance in technical rounds'
FROM candidates c, jobs j
WHERE c.name = 'Simran Bedi' AND j.title ILIKE '%Computer Science%'
ON CONFLICT DO NOTHING;

INSERT INTO applications (org_id, candidate_id, job_id, stage, notes)
SELECT j.org_id, c.id, j.id, 'screening', 'Shortlisted from campus placement'
FROM candidates c, jobs j
WHERE c.name = 'Karan Malhotra' AND j.title ILIKE '%Lab Technician%'
ON CONFLICT DO NOTHING;

INSERT INTO applications (org_id, candidate_id, job_id, stage, notes)
SELECT j.org_id, c.id, j.id, 'applied', NULL
FROM candidates c, jobs j
WHERE c.name = 'Ananya Gupta' AND j.title ILIKE '%Computer Science%'
ON CONFLICT DO NOTHING;

-- Demo hiring policies
INSERT INTO hiring_policies (title, category, description, effective) VALUES
  ('Interview Panel Composition', 'Interviewing',
   'Every panel must include at least one faculty member, one hiring manager, and a neutral HR representative.',
   '2026-01-01'),
  ('Headcount Approval Threshold', 'Approvals',
   'Any position requiring more than 2 headcount must be reviewed and approved by the CHRO before posting.',
   '2026-01-01'),
  ('Offer Letter Timeline', 'Offers',
   'Offer letters must be issued within 5 business days of final-round approval.',
   '2026-01-01'),
  ('Diversity Shortlisting Rule', 'Diversity',
   'At least 30% of shortlisted candidates for any role must be from underrepresented groups.',
   '2026-02-01'),
  ('Background Verification', 'Compliance',
   'All selected candidates must complete a background check before their start date.',
   '2026-01-01'),
  ('Referral Bonus Cap', 'Compensation',
   'Employee referral bonuses are capped at ₹50,000 per successful hire, paid 6 months after join date.',
   '2026-03-01')
ON CONFLICT DO NOTHING;
