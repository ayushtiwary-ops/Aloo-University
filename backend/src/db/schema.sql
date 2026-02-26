-- ============================================================
-- AdmitGuard — PostgreSQL Schema
-- Run once:  psql $DATABASE_URL -f src/db/schema.sql
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit records ─────────────────────────────────────────────────────────
-- candidate_data  : full snapshot of form field values (JSONB for flexibility)
-- exception_fields: array of field IDs where valid exceptions were granted
-- rationale_map   : { fieldId: rationaleText } for each exception field
CREATE TABLE IF NOT EXISTS audit_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  candidate_data   JSONB       NOT NULL,
  exception_count  INT         NOT NULL DEFAULT 0,
  exception_fields JSONB       NOT NULL DEFAULT '[]',
  rationale_map    JSONB       NOT NULL DEFAULT '{}',
  flagged          BOOLEAN     NOT NULL DEFAULT FALSE,
  strict_valid     BOOLEAN     NOT NULL DEFAULT TRUE,
  soft_valid       BOOLEAN     NOT NULL DEFAULT TRUE,
  submitted_by     UUID        REFERENCES users(id) ON DELETE SET NULL
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_records (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_flagged     ON audit_records (flagged)
  WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_submitted_by ON audit_records (submitted_by);

-- ── Seed: default admin (password: ChangeMe123!)  ────────────────────────
-- Run separately in production after setting a strong password.
-- INSERT INTO users (email, password_hash, role)
-- VALUES ('admin@aloo.edu', '<bcrypt_hash_here>', 'admin');
