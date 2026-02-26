-- ============================================================
-- Migration 001: Initial schema
-- ============================================================

-- Up Migration
-- node-pg-migrate runs everything above the "-- Down Migration" marker
-- when you call `npm run migrate:up`.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_audit_created_at   ON audit_records (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_flagged       ON audit_records (flagged)
  WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_submitted_by ON audit_records (submitted_by);

-- Down Migration

DROP INDEX  IF EXISTS idx_audit_submitted_by;
DROP INDEX  IF EXISTS idx_audit_flagged;
DROP INDEX  IF EXISTS idx_audit_created_at;
DROP TABLE  IF EXISTS audit_records;
DROP TABLE  IF EXISTS users;
