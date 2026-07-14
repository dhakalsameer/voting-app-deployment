-- Candidates table — created only if missing, then ensure all columns
-- used by candidateController.js / resultsRoutes.js exist.
-- Safe to run repeatedly (all statements use IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS candidates (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  vote_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns used by candidateController.js (INSERT) and Results.jsx frontend.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS student_id    TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS position      TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS image_cid     TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS blockchain_id INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS vote_count    INTEGER NOT NULL DEFAULT 0;

-- Wallet address of the on-chain candidate (set by blockchain sync)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS wallet_address TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_blockchain_id ON candidates(blockchain_id)
  WHERE blockchain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position);
