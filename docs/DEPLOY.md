# Deploying Agent Control Plane

Architecture:

```
acp.<your-domain>   → Vercel        (Next.js dashboard, free)
api.<your-domain>   → Hostinger VPS (full backend via Docker + Caddy HTTPS)
<your-domain>       → your portfolio (unchanged)
```

Replace `<your-domain>` below with your real domain throughout.

---

## Part A — Backend on the Hostinger VPS

### 1. Point DNS at the VPS
In whatever manages your domain's DNS, add an **A record**:

| Type | Name | Value |
|------|------|-------|
| A    | `api` | `<your VPS public IP>` |

Find the VPS IP in the Hostinger panel (VPS → Overview). Wait a few minutes for DNS to propagate (`ping api.<your-domain>` should resolve to the IP).

### 2. SSH into the VPS
```bash
ssh root@<your VPS public IP>
```

### 3. Install Docker (Ubuntu — Hostinger's default)
```bash
curl -fsSL https://get.docker.com | sh
docker --version    # confirm
```
(Hostinger also offers a one-click "Ubuntu with Docker" VPS template — if you used it, skip this.)

### 4. Open the firewall for web traffic
```bash
ufw allow 80
ufw allow 443
ufw allow OpenSSH
ufw --force enable
```

### 5. Clone the repo
```bash
git clone https://github.com/saicharankarasala/Agents_Control_Plane.git
cd Agents_Control_Plane
```

### 6. Create the production `.env`
```bash
nano .env
```
Paste and fill in:
```bash
# Domain Caddy will get an HTTPS cert for
API_DOMAIN=api.<your-domain>

# Allow the dashboard's origin through CORS
CORS_ORIGINS=https://acp.<your-domain>
ENV=production

# Strong Postgres password (change this!)
POSTGRES_USER=acp
POSTGRES_PASSWORD=<make-a-long-random-password>
POSTGRES_DB=acp

# Your keys
ANTHROPIC_API_KEY=<your key>
JUDGE_MODEL=claude-haiku-4-5-20251001
CLERK_SECRET_KEY=<your key>
CLERK_PUBLISHABLE_KEY=<your key>
CLERK_JWT_ISSUER=https://present-barnacle-43.clerk.accounts.dev
EMBED_MODEL=BAAI/bge-small-en-v1.5
```

### 7. Launch the stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Caddy automatically fetches a Let's Encrypt SSL cert for `api.<your-domain>`.
Give it ~30s, then check:
```bash
curl https://api.<your-domain>/health     # {"status":"ok","env":"production"}
```

### 8. (Optional) Seed demo data
```bash
docker compose -f docker-compose.prod.yml exec api \
  python -c "import subprocess" 2>/dev/null
# from your laptop instead (simplest):
ACP_ENDPOINT=https://api.<your-domain> python seeds/generate_demo_data.py --n 40
```

### Useful ops commands
```bash
docker compose -f docker-compose.prod.yml logs -f api    # tail API logs
docker compose -f docker-compose.prod.yml ps             # status
docker compose -f docker-compose.prod.yml down           # stop
docker compose -f docker-compose.prod.yml up -d --build  # redeploy after git pull
```

---

## Part B — Frontend on Vercel

1. **New Project** → import `saicharankarasala/Agents_Control_Plane`
   (a separate project — your portfolio project is untouched).
2. **Root Directory** → `apps/web`.
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://api.<your-domain>
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = <your clerk publishable key>
   ```
4. **Deploy.**
5. **Domains** → add `acp.<your-domain>`. Since your domain is already on
   Vercel, it auto-creates the DNS record. Portfolio stays on the apex.

---

## Part C — Verify end-to-end
1. Open `https://acp.<your-domain>` → dashboard loads.
2. Overview shows seeded metrics; Runs table populated.
3. Open a run → trace waterfall renders.
4. Approvals → approve one → it disappears, audit log records it.

## Redeploying after code changes
```bash
# Backend (on the VPS)
cd Agents_Control_Plane && git pull && \
  docker compose -f docker-compose.prod.yml up -d --build

# Frontend: Vercel auto-deploys on every push to main.
```

## Notes
- Postgres/Redis/Qdrant are **not** exposed to the internet — only the API via
  Caddy on 443. Data persists in Docker named volumes across restarts.
- A Hostinger VPS with ~2 GB RAM comfortably runs this stack. `fastembed`
  downloads its embedding model (~90 MB) on first use.
