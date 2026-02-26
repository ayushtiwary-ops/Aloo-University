-- Migration 004: simplify audit_records — flatten candidate columns, drop candidate system
-- Up Migration

-- 1. Drop candidates table and its FK constraint on audit_records
DROP TABLE IF EXISTS candidates CASCADE;

-- 2. Drop now-orphaned candidate_id column
ALTER TABLE audit_records DROP COLUMN IF EXISTS candidate_id;

-- 3. Rename columns
ALTER TABLE audit_records RENAME COLUMN candidate_data TO data;
ALTER TABLE audit_records RENAME COLUMN created_at     TO submitted_at;

-- 4. Add flat candidate columns
ALTER TABLE audit_records
  ADD COLUMN IF NOT EXISTS candidate_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone          TEXT NOT NULL DEFAULT '';

-- 5. Back-fill from existing JSONB (safe for any existing rows)
UPDATE audit_records SET
  candidate_name = COALESCE(data->>'fullName',  data->>'full_name',  ''),
  email          = COALESCE(data->>'email',                          ''),
  phone          = COALESCE(data->>'phone',                          '')
WHERE candidate_name = '';

-- 6. Drop obsolete columns
ALTER TABLE audit_records DROP COLUMN IF EXISTS exception_fields;
ALTER TABLE audit_records DROP COLUMN IF EXISTS rationale_map;

-- 7. Rebuild indexes
DROP INDEX IF EXISTS idx_audit_created_at;
DROP INDEX IF EXISTS idx_audit_candidate_id;

CREATE INDEX IF NOT EXISTS idx_audit_submitted_at
  ON audit_records (submitted_at DESC);

-- idx_audit_flagged (partial) already exists from migration 001 — recreate to be safe
DROP INDEX IF EXISTS idx_audit_flagged;
CREATE INDEX IF NOT EXISTS idx_audit_flagged
  ON audit_records (flagged)
  WHERE flagged = TRUE;

-- Down Migration

-- Partial revert (restore column names only — data loss on dropped columns is expected)
ALTER TABLE audit_records RENAME COLUMN submitted_at TO created_at;
ALTER TABLE audit_records RENAME COLUMN data         TO candidate_data;
ALTER TABLE audit_records DROP COLUMN IF EXISTS candidate_name;
ALTER TABLE audit_records DROP COLUMN IF EXISTS email;
ALTER TABLE audit_records DROP COLUMN IF EXISTS phone;
DROP INDEX IF EXISTS idx_audit_submitted_at;
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_records (created_at DESC);
