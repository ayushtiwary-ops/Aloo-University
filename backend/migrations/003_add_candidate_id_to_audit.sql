-- Migration 003: link audit records to candidates
-- Up Migration

ALTER TABLE audit_records
  ADD COLUMN IF NOT EXISTS candidate_id UUID
    REFERENCES candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_candidate_id
  ON audit_records (candidate_id)
  WHERE candidate_id IS NOT NULL;

-- Down Migration

DROP INDEX  IF EXISTS idx_audit_candidate_id;
ALTER TABLE audit_records DROP COLUMN IF EXISTS candidate_id;
