-- Enforce one wallet per student: each wallet_address can only appear once.
-- Run this AFTER cleaning up any duplicate wallet_address values.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_wallet_unique
  ON students(LOWER(wallet_address))
  WHERE wallet_address IS NOT NULL;
