-- Migration 002: candidates table for student self-registration
-- Up Migration

CREATE TABLE IF NOT EXISTS candidates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  phone         TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates (email);

-- Down Migration

DROP INDEX  IF EXISTS idx_candidates_email;
DROP TABLE  IF EXISTS candidates;
