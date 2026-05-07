-- ─── 001_add_columns.sql ──────────────────────────────────────────────────────
-- Adds columns that hiris_db is missing for the HIRIS React app,
-- updates the role constraint to include faculty,
-- migrates demo user emails to @hiris.demo format,
-- and inserts the faculty demo user.

-- 1. password_hash (nullable — filled in Phase 3 when real auth is added)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. title — displayed in the topbar next to the user's name
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(100);
UPDATE users SET title = 'Chief HR Officer' WHERE role = 'chro'   AND title IS NULL;
UPDATE users SET title = 'Hiring Manager'   WHERE role = 'hiring_manager' AND title IS NULL;

-- 3. portal — maps role → React route prefix (chro, hiring, faculty)
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal VARCHAR(20);
UPDATE users SET portal = CASE role
  WHEN 'chro'           THEN 'chro'
  WHEN 'hiring_manager' THEN 'hiring'
  WHEN 'faculty'        THEN 'faculty'
  ELSE NULL
END WHERE portal IS NULL;

-- 4. Expand role CHECK to include 'faculty'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('chro', 'hiring_manager', 'faculty', 'candidate'));

-- 5. Update demo user emails to @hiris.demo so they match the login page
UPDATE users SET email = 'smriti.kinra@hiris.demo'     WHERE name = 'Smriti Kinra'     AND email NOT LIKE '%hiris.demo';
UPDATE users SET email = 'sartajdeep.singh@hiris.demo'  WHERE name = 'Sartajdeep Singh' AND email NOT LIKE '%hiris.demo';

-- 6. Insert faculty demo user (Gracy Tanna)
INSERT INTO users (name, email, role, portal, title, org)
VALUES ('Gracy Tanna', 'gracy.tanna@hiris.demo', 'faculty', 'faculty', 'Faculty Member', 'Plaksha University')
ON CONFLICT (email) DO NOTHING;

-- 7. job_type on jobs (Full-time / Contract / Part-time)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'Full-time';
UPDATE jobs SET job_type = 'Contract'  WHERE title ILIKE '%Lab Technician%';
UPDATE jobs SET job_type = 'Full-time' WHERE job_type IS NULL;

-- 8. source on candidates (recruitment channel)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source VARCHAR(100);
UPDATE candidates SET source = 'LinkedIn' WHERE MOD(id, 3) = 0;
UPDATE candidates SET source = 'Referral' WHERE MOD(id, 3) = 1;
UPDATE candidates SET source = 'Naukri'   WHERE MOD(id, 3) = 2;
UPDATE candidates SET source = 'Indeed'   WHERE source IS NULL;

-- 9. deadline on headcount_requests (staggered by 2 weeks per request)
ALTER TABLE headcount_requests ADD COLUMN IF NOT EXISTS deadline DATE;
UPDATE headcount_requests
SET deadline = (CURRENT_DATE + (id * 14 || ' days')::INTERVAL)::DATE
WHERE deadline IS NULL;
