-- Tracks Sepolia ETH distributions from the admin wallet to student voters.
-- Used by backend/scripts/distribute-sepolia.js for audit logging.

CREATE TABLE IF NOT EXISTS distribution_log (
  id              SERIAL PRIMARY KEY,
  student_id      TEXT NOT NULL REFERENCES students(student_id),
  wallet_address  TEXT NOT NULL,
  amount_eth      TEXT NOT NULL,
  tx_hash         TEXT,
  status          TEXT NOT NULL,        -- 'success', 'reverted', 'failed', 'dry-run'
  error           TEXT,
  distributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distribution_log_student
  ON distribution_log(student_id);

CREATE INDEX IF NOT EXISTS idx_distribution_log_wallet
  ON distribution_log(wallet_address);

CREATE INDEX IF NOT EXISTS idx_distribution_log_status
  ON distribution_log(status);

CREATE INDEX IF NOT EXISTS idx_distribution_log_tx_hash
  ON distribution_log(tx_hash)
  WHERE tx_hash IS NOT NULL;
