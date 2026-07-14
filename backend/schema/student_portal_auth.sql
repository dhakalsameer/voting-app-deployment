-- Student Portal Auth Migration
-- Adds password support for student login

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Index for fast login lookups by student_id
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
