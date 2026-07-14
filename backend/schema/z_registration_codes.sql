-- Registration codes table for one-time student registration.
-- Run after students.sql (alphabetically z > s ensures this).

CREATE TABLE IF NOT EXISTS registration_codes (
  id         SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reg_codes_code     ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_reg_codes_student  ON registration_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_reg_codes_used     ON registration_codes(used);
