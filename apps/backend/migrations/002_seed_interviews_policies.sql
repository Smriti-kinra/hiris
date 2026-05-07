-- ─── 002_seed_interviews_policies.sql ───────────────────────────────────────

-- Policies table
CREATE TABLE IF NOT EXISTS hiring_policies (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  description TEXT,
  effective   DATE DEFAULT CURRENT_DATE,
  active      BOOLEAN DEFAULT TRUE
);

INSERT INTO hiring_policies (title, category, description, effective) VALUES
  ('Interview Panel Composition', 'Interviewing', 'Every interview panel must include at least one faculty member, one hiring manager, and a neutral HR representative.', '2026-01-01'),
  ('Headcount Approval Threshold', 'Approvals', 'Any position requiring more than 2 headcount must be reviewed and approved by the CHRO before posting.', '2026-01-01'),
  ('Offer Letter Timeline', 'Offers', 'Offer letters must be issued within 5 business days of final-round approval.', '2026-01-01'),
  ('Diversity Shortlisting Rule', 'Diversity', 'At least 30% of shortlisted candidates for any role must be from underrepresented groups.', '2026-02-01'),
  ('Background Verification', 'Compliance', 'All selected candidates must complete a background check before their start date.', '2026-01-01'),
  ('Referral Bonus Cap', 'Compensation', 'Employee referral bonuses are capped at ₹50,000 per successful hire, paid 6 months after join date.', '2026-03-01')
ON CONFLICT DO NOTHING;

-- Seed scheduled interviews (safe subquery approach)
INSERT INTO interviews (application_id, scheduled_at, round, status, interviewer_id, notes)
SELECT
  a.id,
  NOW() + INTERVAL '3 days',
  'Technical Round 1',
  'scheduled',
  (SELECT id FROM users WHERE role = 'hiring_manager' ORDER BY id LIMIT 1),
  'Focus on ML fundamentals and research experience'
FROM applications a
JOIN candidates c ON c.id = a.candidate_id
WHERE c.name = 'Rahul Verma'
  AND NOT EXISTS (SELECT 1 FROM interviews i WHERE i.application_id = a.id);

INSERT INTO interviews (application_id, scheduled_at, round, status, interviewer_id, notes)
SELECT
  a.id,
  NOW() + INTERVAL '1 day',
  'HR Round',
  'scheduled',
  (SELECT id FROM users WHERE role = 'chro' LIMIT 1),
  'Culture fit and compensation discussion'
FROM applications a
JOIN candidates c ON c.id = a.candidate_id
WHERE c.name = 'Prateek Sharma'
  AND NOT EXISTS (SELECT 1 FROM interviews i WHERE i.application_id = a.id);

INSERT INTO interviews (application_id, scheduled_at, round, status, interviewer_id, notes)
SELECT
  a.id,
  NOW() - INTERVAL '2 days',
  'Technical Round 2',
  'completed',
  (SELECT id FROM users WHERE role = 'hiring_manager' ORDER BY id DESC LIMIT 1),
  'Strong performance. Recommend for final round.'
FROM applications a
JOIN candidates c ON c.id = a.candidate_id
WHERE c.name = 'Simran Bedi'
  AND NOT EXISTS (SELECT 1 FROM interviews i WHERE i.application_id = a.id);

INSERT INTO interviews (application_id, scheduled_at, round, status, interviewer_id, notes)
SELECT
  a.id,
  NOW() + INTERVAL '7 days',
  'Final Round',
  'scheduled',
  (SELECT id FROM users WHERE role = 'chro' LIMIT 1),
  'Leadership and vision assessment with CHRO'
FROM applications a
JOIN candidates c ON c.id = a.candidate_id
WHERE c.name = 'Karan Malhotra'
  AND NOT EXISTS (SELECT 1 FROM interviews i WHERE i.application_id = a.id);
