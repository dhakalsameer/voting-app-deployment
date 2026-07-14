# Decentralized Voting System — Deployment

Full project source + zero-cost deployment for **Vercel** (frontend), **Render** (backend), and **Neon** (PostgreSQL).

## Deploy

### 1. Database — Neon (free, no credit card)

1. Go to [neon.tech](https://neon.tech) → Sign up (GitHub) → Create project
2. Copy the connection string: `postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/election?sslmode=require`

### 2. Backend — Render (free web service)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect `dhakalsameer/voting-app-deployment`
3. Configure:

| Field | Value |
|-------|-------|
| Root Directory | `backend` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Instance Type | **Free** ($0/mo) |

4. Add these environment variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_9WPYKCIemj7B@ep-fragrant-feather-atn1tm50.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/95pRrhpYhS2hhiYfaqfDw
CONTRACT_ADDRESS_V3=0xF9E3123055ba2409e1F841bFEb6620F2Ab6EcCe6
PRIVATE_KEY=0x4c54307a0f284fb4493ecf28b1f3fc3e05623c4293672c7081077e8187749d63
JWT_SECRET=59ed7542fc3f78c57a3dffc6eae4ad8b1e7467ef62cb33db93e4c964c20375e22d724df63a60746ad65e9001b6b21a82
CORS_ORIGIN=https://gu-it-voting.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sameerdhakal1234@gmail.com
SMTP_PASS=sxxk puiw rtki fdbc
SMTP_FROM=GU Election Committee <sameerdhakal1234@gmail.com>
PINATA_KEY=4776f3188c16583323c5
PINATA_SECRET=7b40ef23108de5d06916b37fab3daa8093fc6ab3912ab1cb441fb44f1ef74a7b
```

5. After deploy, open **Shell** tab and run:
   ```
   node scripts/migrate.js
   ```

### 3. Frontend — Vercel (free, no credit card)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import `dhakalsameer/voting-app-deployment`
2. **Root Directory:** `election-frontend`
3. **Framework Preset:** Vite
4. Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://voting-app-deployment.onrender.com` |
| `VITE_CONTRACT_ADDRESS_V3` | `0xF9E3123055ba2409e1F841bFEb6620F2Ab6EcCe6` |

5. Deploy

## Project Structure

```
├── backend/           # Express API (Node.js)
├── contracts/         # Solidity smart contracts
├── election-frontend/ # React SPA (Vite)
├── render.yaml        # Render Blueprint config
├── vercel.json        # Vercel config
```

**Contract:** `Election3.sol` on Sepolia (chain 11155111)
