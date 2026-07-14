-- Remove FK constraint so codes can exist for student IDs that haven't registered yet.

ALTER TABLE registration_codes
DROP CONSTRAINT IF EXISTS fk_student;
