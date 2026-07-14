-- Add email column to students for registration code distribution.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email)
  WHERE email IS NOT NULL;
