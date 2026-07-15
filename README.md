# Decentralized Voting System

A production-grade, decentralized voting application built with a **Hybrid Web3 Architecture** — combining Ethereum smart contracts, a PostgreSQL cache layer, and IPFS storage.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Browser   │────▶│  MetaMask    │────▶│  Sepolia Testnet │
│  (React UI) │     │  (Wallet)    │     │  (Smart Contract)│
└──────┬──────┘     └──────────────┘     └────────┬─────────┘
       │                                          │
       │    ┌─────────────────┐                   │
       └───▶│  Node.js Backend │◀──────────────────┘
            │  (Express + WS)  │  Blockchain Events
            └────────┬─────────┘
                     │
            ┌────────▼─────────┐
            │   PostgreSQL     │
            │   (Cache Layer)  │
            └──────────────────┘
```

The smart contract enforces voting rules; the backend syncs on-chain events into PostgreSQL; the frontend reads from the cache for instant UI and writes votes directly to the contract via MetaMask.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solidity 0.8.30, Foundry, Sepolia Testnet |
| Backend | Node.js, Express 5, Ethers.js, Socket.IO |
| Database | PostgreSQL with event-driven sync |
| Frontend | React (Vite), Tailwind CSS, Recharts |
| Storage | IPFS (via Pinata), local file fallback |
| Auth | MetaMask signatures, JWT, Merkle proofs |

## Key Features

- **Wallet Authentication** — Login via MetaMask with signature verification
- **Multi-Position Voting** — President, Secretary, and up to 5 General Members in one transaction
- **Real-Time Sync** — Blockchain events polled every 10s; instant UI updates via Socket.IO
- **Role-Based Access** — Admin, Voter, and Candidate roles with on-chain enforcement
- **Three Merkle Trees** — Voter eligibility, identity verification, and registration codes
- **Female GM Minimum** — Smart contract enforces at least 2 female General Members
- **Election History** — Multi-cycle support; historical data never overwritten

## Smart Contract

The core contract is `Election3.sol` with four phases:

```
Created → Registration → Voting → Ended → (startNewElection → back to Created)
```

**Positions:** President (year 4), Secretary (years 3–4), General Member (any year)

Key functions: `registerCandidate`, `vote`, `castVote`, `startRegistration`, `startVoting`, `endElection`, `startNewElection`

## Setup

### Prerequisites

- Node.js 18+
- Foundry (forge, cast)
- PostgreSQL 14+
- MetaMask browser extension
- Sepolia testnet ETH (for deployment)

### 1. Smart Contracts

```bash
cd contracts
forge build

cp .env.example .env   # set PRIVATE_KEY and RPC_URL
forge script script/DeployElection3.s.sol --rpc-url $RPC_URL --broadcast --verify
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # configure DATABASE_URL, RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS_V3
npm install
npm run migrate        # runs all SQL schema files
npm start              # starts on port 5000
```

### 3. Frontend

```bash
cd election-frontend
cp .env.example .env   # set VITE_CONTRACT_ADDRESS_V3 and VITE_API_URL
npm install
npm run dev            # starts on port 5173
```

## Supabase Database URL (temp — remove after copying)

```
postgresql://postgres:ilSiwmS%401234@db.oxtlmevokehmhndnfwhi.supabase.co:5432/postgres
```

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RPC_URL` | Yes | Sepolia RPC endpoint |
| `PRIVATE_KEY` | Yes | Admin wallet private key |
| `CONTRACT_ADDRESS_V3` | Yes | Deployed contract address |
| `JWT_SECRET` | Yes | 32+ char random string for JWT signing |
| `CORS_ORIGIN` | No | Comma-separated origins (default `*`) |
| `SMTP_*` | No | Gmail SMTP for email distribution |
| `PINATA_KEY/SECRET` | No | Pinata API keys for IPFS |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_CONTRACT_ADDRESS_V3` | — | Contract address on Sepolia |
| `VITE_API_URL` | `http://localhost:5000` | Backend API URL |

## Database Schema

All migrations are in `backend/schema/` — run with `npm run migrate`. Key tables:

- `students` — voter/candidate profiles with wallet and auth data
- `candidates` — cached candidate data synced from chain
- `events` — blockchain event log
- `election_history` — snapshots of completed elections
- `registration_codes` — one-time codes for student portal registration
- `distribution_log` — Sepolia ETH distribution records

## Testing

```bash
cd contracts
forge test -vv

# Full e2e against Sepolia (requires .env)
node backend/scripts/test_e2e.mjs
```

## Deployment

The contract is deployed to **Sepolia Testnet** (chain ID 11155111).

```bash
# Deploy contract
cd contracts && forge script script/DeployElection3.s.sol --rpc-url $RPC_URL --broadcast

# Migrate database
cd backend && node scripts/migrate.js
```

## Project Structure

```
election/
├── backend/
│   ├── src/
│   │   ├── blockchain/     # Ethers.js provider + sync engine
│   │   ├── config/         # env loader
│   │   ├── controllers/    # Route handlers (10)
│   │   ├── middleware/      # JWT auth, admin check
│   │   ├── routes/         # Express route definitions
│   │   ├── services/       # Merkle, email, IPFS, reminders
│   │   └── server.js       # Entry point
│   ├── schema/             # 15 SQL migration files
│   └── scripts/            # Misc utilities
├── contracts/
│   ├── src/Election3.sol   # Main contract
│   ├── script/             # Foundry deploy scripts
│   └── test/               # Foundry tests (48+)
├── election-frontend/
│   └── src/
│       ├── components/     # React components
│       │   ├── admin/      # Admin dashboard (8 components)
│       │   └── ui/         # Reusable UI (10 components)
│       ├── context/        # AuthContext + SocketContext
│       ├── abi/            # Contract ABI
│       └── config.js       # Frontend config
├── docs/                   # Historical docs (v1, v2)
└── scripts/                # Deploy shell scripts
```

## Security

- **Double-vote prevention** — enforced on-chain via `votedInElection` mapping
- **Admin protection** — `onlyAdmin` modifier on all admin functions
- **Merkle proofs** — voter eligibility, identity, and registration codes verified on-chain
- **Wallet signing** — backend verifies MetaMask signatures to prevent API spoofing
- **Rate limiting** — 20 requests/15min on auth endpoints
- **Security headers** — helmet middleware (X-Content-Type-Options, X-Frame-Options, etc.)
- **CORS** — configurable origin restriction (default allow-all for zero-config deploys)

## License

MIT
