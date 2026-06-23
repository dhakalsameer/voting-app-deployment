-- Add candidate application workflow status.
-- 'pending'  → student submitted, awaiting admin review
-- 'approved' → admin approved, candidate is on-chain
-- 'rejected' → admin rejected

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Gender and year are pulled from the student's DB record to prevent manipulation
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS gender TEXT;

-- Backfill: existing candidates from before the application workflow are "approved"
UPDATE candidates SET status = 'approved' WHERE status IS NULL;

-- Add applied_by so we know which student submitted the application
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS applied_by TEXT REFERENCES students(student_id);

-- Timestamp for when the application was submitted
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- Index for fast pending lookups
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
