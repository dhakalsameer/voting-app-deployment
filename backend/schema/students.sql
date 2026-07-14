-- Full students table schema for fresh databases.
-- Run after creating an empty database, BEFORE verification.sql and student_portal_auth.sql.
-- verification.sql adds: wallet_verified, eligible_to_vote
-- student_portal_auth.sql adds: password_hash

CREATE TABLE IF NOT EXISTS students (
  student_id      TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  wallet_address  TEXT,
  image_cid       TEXT,
  password_hash   VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast login lookups by student_id (the primary key already covers this,
-- but kept explicit for clarity in case the PK is ever changed).
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- Case-insensitive wallet lookup (used by /api/voters/me and /api/wallet/verify).
CREATE INDEX IF NOT EXISTS idx_students_wallet ON students(LOWER(wallet_address))
  WHERE wallet_address IS NOT NULL;
