-- Add explicit registered flag to students for the registration-code flow.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS registered BOOLEAN NOT NULL DEFAULT false;
