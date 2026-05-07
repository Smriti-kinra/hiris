-- ─────────────────────────────────────────────────────────────────────────────
-- HIRIS — Archive Module (011_archive_module.sql)
-- Creates tables for employee lifecycle, expired job archive, and workforce
-- intelligence. All tables include org_id for multi-tenancy.
-- Run via: psql -d hiris_db -f 011_archive_module.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Employee Profiles ─────────────────────────────────────────────────────────
-- Created when a candidate is hired (offered → accepted). Tracks full lifecycle.
CREATE TABLE IF NOT EXISTS employee_profiles (
  id              SERIAL PRIMARY KEY,
  org_id          INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  candidate_id    INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
  application_id  INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  name            VARCHAR(200) NOT NULL,
  email           VARCHAR(200),
  department      VARCHAR(100),
  role            VARCHAR(200),
  manager_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  employment_type VARCHAR(50) DEFAULT 'Full-time',
  salary_band     VARCHAR(100),
  hire_date       DATE,
  exit_date       DATE,
  status          VARCHAR(30) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'resigned', 'terminated', 'retired', 'on_leave')),
  ai_score        NUMERIC(5,2),
  attrition_risk  VARCHAR(20) DEFAULT 'low'
                    CHECK (attrition_risk IN ('low', 'medium', 'high', 'critical')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_org_id     ON employee_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_employee_status     ON employee_profiles(status);
CREATE INDEX IF NOT EXISTS idx_employee_department ON employee_profiles(department);
CREATE INDEX IF NOT EXISTS idx_employee_hire_date  ON employee_profiles(hire_date);

-- ── Employee Lifecycle Events ──────────────────────────────────────────────────
-- Immutable audit log: promotions, reviews, warnings, exits, salary changes.
CREATE TABLE IF NOT EXISTS employee_lifecycle_events (
  id              SERIAL PRIMARY KEY,
  org_id          INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id     INTEGER REFERENCES employee_profiles(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL
                    CHECK (event_type IN (
                      'hired', 'promoted', 'salary_change', 'performance_review',
                      'warning', 'transfer', 'leave_started', 'leave_ended',
                      'resignation_notice', 'termination_notice', 'exited', 'rehired'
                    )),
  event_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  title           VARCHAR(200),
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_employee ON employee_lifecycle_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_type     ON employee_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_org      ON employee_lifecycle_events(org_id);

-- ── Employee Exit History ──────────────────────────────────────────────────────
-- Detailed exit records with reason, type, and rehire eligibility.
CREATE TABLE IF NOT EXISTS employee_exit_history (
  id                SERIAL PRIMARY KEY,
  org_id            INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id       INTEGER REFERENCES employee_profiles(id) ON DELETE CASCADE,
  exit_type         VARCHAR(30) NOT NULL
                      CHECK (exit_type IN ('voluntary', 'involuntary', 'retirement', 'contract_end', 'layoff')),
  exit_date         DATE NOT NULL,
  notice_given      BOOLEAN DEFAULT false,
  notice_period_days INTEGER DEFAULT 0,
  exit_reason       TEXT,
  final_role        VARCHAR(200),
  final_department  VARCHAR(100),
  final_salary_band VARCHAR(100),
  tenure_days       INTEGER,
  rehire_eligible   BOOLEAN DEFAULT true,
  exit_interview_notes TEXT,
  recorded_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exit_employee ON employee_exit_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_org      ON employee_exit_history(org_id);

-- ── Expired Job Archive ────────────────────────────────────────────────────────
-- Snapshot of closed/expired job postings for historical reference.
CREATE TABLE IF NOT EXISTS expired_job_archive (
  id              SERIAL PRIMARY KEY,
  org_id          INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  job_id          INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  title           VARCHAR(200) NOT NULL,
  department      VARCHAR(100),
  job_type        VARCHAR(50),
  description     TEXT,
  jd_json         JSONB DEFAULT '{}',
  location        VARCHAR(200),
  posted_at       TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ DEFAULT NOW(),
  close_reason    VARCHAR(30) DEFAULT 'expired'
                    CHECK (close_reason IN ('expired', 'filled', 'cancelled', 'budget_freeze')),
  total_applicants INTEGER DEFAULT 0,
  total_hired      INTEGER DEFAULT 0,
  total_rejected   INTEGER DEFAULT 0,
  requested_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  archived_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expired_job_org    ON expired_job_archive(org_id);
CREATE INDEX IF NOT EXISTS idx_expired_job_dept   ON expired_job_archive(department);
CREATE INDEX IF NOT EXISTS idx_expired_job_closed ON expired_job_archive(closed_at);

-- ── Workforce Insights Cache ───────────────────────────────────────────────────
-- Pre-computed AI analytics snapshots. Refreshed on demand.
CREATE TABLE IF NOT EXISTS workforce_insights_cache (
  id              SERIAL PRIMARY KEY,
  org_id          INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  insight_type    VARCHAR(80) NOT NULL,
  data            JSONB NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(org_id, insight_type)
);

CREATE INDEX IF NOT EXISTS idx_insights_org_type ON workforce_insights_cache(org_id, insight_type);

-- ── Headcount requests: add missing columns ────────────────────────────────────
-- Add 'posted' and 'closed' to the status check without breaking existing data
ALTER TABLE headcount_requests
  DROP CONSTRAINT IF EXISTS headcount_requests_status_check;

ALTER TABLE headcount_requests
  ADD CONSTRAINT headcount_requests_status_check
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'posted', 'closed'));

-- ── start_date column (may already exist from prior migration) ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='headcount_requests' AND column_name='start_date'
  ) THEN
    ALTER TABLE headcount_requests ADD COLUMN start_date DATE;
  END IF;
END$$;
