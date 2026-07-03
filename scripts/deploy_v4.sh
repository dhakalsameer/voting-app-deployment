#!/usr/bin/env bash
set -euo pipefail

# Deploy Election3.sol (v4) with regCodeMerkleRoot to Sepolia
# Usage: bash scripts/deploy_v4.sh
# Run from repo root (forge uses the contracts/ subdir as root)

set -euo pipefail

RPC_URL="${RPC_URL:-https://eth-sepolia.g.alchemy.com/v2/95pRrhpYhS2hhiYfaqfDw}"
PRIVATE_KEY="${PRIVATE_KEY:-0x4c54307a0f284fb4493ecf28b1f3fc3e05623c4293672c7081077e8187749d63}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Deploying Election3 (v4 — regCodeMerkleRoot) to Sepolia..."
cd "$PROJECT_ROOT/contracts"
forge script script/DeployElection3.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast --legacy \
  --private-key "$PRIVATE_KEY"

echo "Done."
echo "Update CONTRACT_ADDRESS_V3 in: backend/.env, frontend config, contracts/.env"
