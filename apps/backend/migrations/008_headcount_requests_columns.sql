-- ─────────────────────────────────────────────────────────────────────────────
-- 008_headcount_requests_columns.sql
-- Add missing columns to headcount_requests for the JD Builder workflow
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE headcount_requests ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE headcount_requests ADD COLUMN IF NOT EXISTS jd_json JSONB;
