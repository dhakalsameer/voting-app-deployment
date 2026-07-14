# Decentralized Voting System — Deployment

Full project source + zero-cost deployment configs for **Vercel** (frontend), **Render** (backend), and **Neon** (PostgreSQL).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solidity 0.8.30, Foundry, Sepolia Testnet |
| Backend | Node.js, Express 5, Ethers.js, Socket.IO |
| Database | PostgreSQL (Neon serverless) |
| Frontend | React (Vite), Tailwind CSS, Recharts |
| Storage | IPFS (via Pinata), local file fallback |
| Auth | MetaMask signatures, JWT, Merkle proofs |

## Deploy

### 1. Database — Neon

1. Go to [neon.tech](https://neon.tech) → Sign up (GitHub) → Create project
2. Copy connection string: `postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/election?sslmode=require`

### 2. Backend — Render

1. Go to [render.com](https://render.com) → Sign up (GitHub) → **Blueprint**
2. Connect this repo (`dhakalsameer/voting-app-deployment`)
3. Upload [`render.yaml`](./render.yaml) as the blueprint
4. Fill in the secret env vars:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` |
| `CONTRACT_ADDRESS_V3` | `0xF9E3123055ba2409e1F841bFEb6620F2Ab6EcCe6` |
| `PRIVATE_KEY` | Admin wallet private key |
| `JWT_SECRET` | Random 32+ char string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |

5. After deploy, open **Shell** tab and run:
   ```bash
   node scripts/migrate.js
   ```

### 3. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up (GitHub) → **Add New Project**
2. Import `dhakalsameer/voting-app-deployment`
3. **Root Directory:** `election-frontend`
4. **Framework Preset:** Vite
5. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://voting-app-backend.onrender.com` |
| `VITE_CONTRACT_ADDRESS_V3` | `0xF9E3123055ba2409e1F841bFEb6620F2Ab6EcCe6` |

6. Deploy

### 4. Configure CORS

In Render dashboard → Environment → add:

```
CORS_ORIGIN=https://voting-app-frontend.vercel.app
```

## Project Structure

```
voting-app-deployment/
├── backend/           # Express API (Node.js)
│   ├── src/
│   │   ├── blockchain/   # Ethers.js sync engine
│   │   ├── controllers/  # Route handlers
│   │   └── routes/       # Express routes
│   ├── schema/           # SQL migrations
│   └── package.json
├── contracts/         # Solidity smart contracts
│   └── src/Election3.sol
├── election-frontend/ # React SPA (Vite)
│   └── src/
├── docs/              # Architecture diagrams
├── scripts/           # Deploy utilities
├── render.yaml        # Render Blueprint (backend + DB)
└── vercel.json        # Vercel config (frontend)
```

## Project Info

- **Smart Contract:** `Election3.sol` — Multi-phase voting with Merkle tree verification
- **Blockchain:** Sepolia Testnet (chain ID 11155111)
- **Original Repo:** [dhakalsameer/Decentralized-Voting-System](https://github.com/dhakalsameer/Decentralized-Voting-System)
