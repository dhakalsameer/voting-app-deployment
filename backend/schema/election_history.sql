-- Election history snapshots — stores results per election round
-- Safe to run repeatedly (all statements use IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS election_history (
  id                SERIAL PRIMARY KEY,
  election_number   INTEGER NOT NULL,
  candidate_name    TEXT NOT NULL,
  candidate_position TEXT,
  vote_count        INTEGER NOT NULL DEFAULT 0,
  candidate_year    TEXT,
  candidate_gender  TEXT,
  candidate_photo   TEXT,
  snapshot_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_history_number ON election_history(election_number);

-- Add columns for existing tables (safe to re-run)
ALTER TABLE election_history ADD COLUMN IF NOT EXISTS candidate_year   TEXT;
ALTER TABLE election_history ADD COLUMN IF NOT EXISTS candidate_gender TEXT;
ALTER TABLE election_history ADD COLUMN IF NOT EXISTS candidate_photo  TEXT;
ALTER TABLE election_history ADD COLUMN IF NOT EXISTS blockchain_id    INTEGER;
ALTER TABLE election_history ADD COLUMN IF NOT EXISTS is_winner        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE election_history ADD COLUMN IF NOT EXISTS wallet_address   TEXT;

CREATE INDEX IF NOT EXISTS idx_election_history_winner ON election_history(election_number, is_winner);

-- Prevent duplicate blockchain_ids within the same election (backfill uses ON CONFLICT against this)
CREATE UNIQUE INDEX IF NOT EXISTS idx_election_history_number_bc
  ON election_history(election_number, blockchain_id)
  WHERE blockchain_id IS NOT NULL;
