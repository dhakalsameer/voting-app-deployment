-- Election history snapshots — stores results per election round
-- Safe to run repeatedly (all statements use IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS election_history (
  id                SERIAL PRIMARY KEY,
  election_number   INTEGER NOT NULL,
  candidate_name    TEXT NOT NULL,
  candidate_position TEXT,
  vote_count        INTEGER NOT NULL DEFAULT 0,
  snapshot_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_history_number ON election_history(election_number);
