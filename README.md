# Voting App — Deployment

Production-grade Docker deployment for the [Decentralized Voting System](https://github.com/dhakalsameer/Decentralized-Voting-System).

## Quick Start

```bash
# 1. Clone this repo
git clone https://github.com/dhakalsameer/voting-app-deployment.git
cd voting-app-deployment

# 2. Clone the app code
git clone https://github.com/dhakalsameer/Decentralized-Voting-System.git app

# 3. Configure environment
cp app/backend/.env.example .env.backend
cp app/election-frontend/.env.example .env.frontend
# Edit .env.backend with your DB URL, RPC URL, keys, etc.

# 4. Launch everything
docker compose up -d

# 5. Run database migrations
docker compose exec backend node scripts/migrate.js

# 6. Open http://localhost
```

## Architecture

```
User ─→ :80 ─→ nginx ─→ /api/*, /socket.io/* ─→ backend:5000
                │                                       │
                └→ /* (SPA)              PostgreSQL ────┘
                                             ↑
                                       postgres:5432
```

| Service | Port | Image |
|---------|------|-------|
| `frontend` | 80 | nginx:1.27-alpine + Vite build |
| `backend` | 5000 | node:20-alpine (Express 5) |
| `postgres` | 5432 | postgres:16-alpine |

## Environment Variables

Create `.env` in the repo root (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `RPC_URL` | Yes | Ethereum RPC endpoint (e.g. Alchemy) |
| `CONTRACT_ADDRESS_V3` | Yes | Deployed contract address on Sepolia |
| `PRIVATE_KEY` | Yes | Admin wallet private key |
| `JWT_SECRET` | Yes | Random 32+ char string |
| `VITE_CONTRACT_ADDRESS_V3` | Yes | Same as above for frontend |
| `BACKEND_PUBLIC_URL` | No | Public backend URL for CORS/media |
| `SMTP_*` | No | Gmail SMTP for email distribution |
| `PINATA_KEY` / `PINATA_SECRET` | No | Pinata IPFS credentials |

## CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on pushes to `main`:

1. Install dependencies & build frontend
2. Build Docker images for backend and frontend
3. Push images to GitHub Container Registry (`ghcr.io`)
4. Ready to pull on your VPS

## Production Checklist

- [ ] Set strong `POSTGRES_PASSWORD` and `JWT_SECRET`
- [ ] Configure `SMTP_*` for email delivery
- [ ] Set `BACKEND_PUBLIC_URL` to your domain
- [ ] Restrict nginx to HTTPS (add cert via Let's Encrypt / Caddy)
- [ ] Change `POSTGRES_USER` from default `election_admin`
- [ ] Set up monitoring (Dozzle, Grafana, or similar)
- [ ] Regular PostgreSQL backups (`pg_dump` via cron)
