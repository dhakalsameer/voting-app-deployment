-- Run once against your PostgreSQL database to add wallet verification columns.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS eligible_to_vote BOOLEAN NOT NULL DEFAULT false;

-- Migrate legacy is_verified values if that column exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'is_verified'
  ) THEN
    UPDATE students
    SET wallet_verified = COALESCE(wallet_verified, is_verified)
    WHERE wallet_verified = false AND is_verified = true;
  END IF;
END $$;
