# Voting App — Deployment (Free Tier)

Zero-cost deployment for the [Decentralized Voting System](https://github.com/dhakalsameer/Decentralized-Voting-System) using **Vercel** (frontend), **Render** (backend), and **Neon** (PostgreSQL).

## Architecture

```
User ─→ Vercel CDN ─→ vite SPA
              │
              └→ /api/*, /socket.io/* ─→ Render Web Service ─→ Neon PostgreSQL
                                                    │
                                              Sepolia Testnet (Alchemy RPC)
```

## Deploy

### 1. Database — Neon

1. Go to [neon.tech](https://neon.tech) → Sign up (GitHub) → Create project
2. Copy the connection string: `postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/election?sslmode=require`

### 2. Backend — Render

1. Go to [render.com](https://render.com) → Sign up (GitHub) → **Blueprint**
2. Connect `dhakalsameer/Decentralized-Voting-System` repo
3. Upload this repo's [`render.yaml`](./render.yaml) as the blueprint
4. Fill in the secret env vars when prompted:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string (from step 1) |
| `RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` |
| `CONTRACT_ADDRESS_V3` | `0xF9E3123055ba2409e1F841bFEb6620F2Ab6EcCe6` |
| `PRIVATE_KEY` | Admin wallet private key |
| `SMTP_USER` | Gmail address (optional) |
| `SMTP_PASS` | Gmail app password (optional) |

5. After deploy, run migrations: open **Shell** tab and run `node scripts/migrate.js`
6. Note your backend URL: `https://voting-app-backend.onrender.com`

### 3. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up (GitHub) → **Add New Project**
2. Import `dhakalsameer/Decentralized-Voting-System`
3. **Root Directory:** `election-frontend`
4. **Framework Preset:** Vite
5. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://voting-app-backend.onrender.com` |
| `VITE_CONTRACT_ADDRESS_V3` | `0xF9E3123055ba2409e1F841bFEb6620F2Ab6EcCe6` |

6. Deploy → your app is live at `voting-app-frontend.vercel.app`

### 4. Configure CORS

In your Render dashboard → Environment → set:

```
CORS_ORIGIN=https://voting-app-frontend.vercel.app
```

## Production Checklist

- [ ] Set strong `JWT_SECRET` and DB password
- [ ] Configure `SMTP_*` for email delivery
- [ ] Add custom domain on Vercel + Render
- [ ] Set up Neon branching for zero-downtime schema changes
- [ ] Enable Render **Previews** for PR-based staging
