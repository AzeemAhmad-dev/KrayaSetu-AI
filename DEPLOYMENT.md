# KRAYASETU AI — PRODUCTION DEPLOYMENT CHECKLIST & GUIDE
**Smart India Hackathon Problem Statement 26027**
**West Central Railway (WCR) — Bhopal Division**
**Release Candidate (RC-1)**

---

## 1. Pre-Deployment Verification Checklist

- [x] **Canonical Database Verified:** Single database file at `<root>/krayasetu.db` with 50 blocks and 64 maintenance tasks.
- [x] **Absolute Path Anchoring:** `backend/app/config.py` anchors SQLite URI to absolute project root regardless of process working directory.
- [x] **Database Isolation:** All secondary test and scratch databases removed.
- [x] **CORS Configuration:** Replaced wildcard credentials with explicit `CORS_ORIGINS`.
- [x] **Demo Reset Endpoint Protected:** `/api/blocks/demo-reset` enforces `X-Admin-Key` authorization when `ENVIRONMENT=production`.
- [x] **IST Timezone Invariance:** Standardized date generation on `getISTDateString()` in `frontend/src/utils/istDate.ts` and `datetime.now(timezone.utc)` in Python backend.
- [x] **API Base URL Uniformity:** Both `api.ts` and `railwayApi.ts` resolve to `VITE_API_BASE_URL` or relative `/api`. Zero localhost fallbacks in production builds.
- [x] **Test Baseline:** 55/55 tests passing (51 pytest + 4 infrastructure visual checks).
- [x] **Frontend Compilation:** `tsc -b && vite build` completes in <1s with 0 errors.

---

## 2. Deployment Architecture Options

### Option A: Containerized Deployment (Recommended for Cloud / On-Prem VMs)
The provided `Dockerfile` is a multi-stage container that builds the React frontend and packages the FastAPI application with timezone data (`tzdata`) set to `Asia/Kolkata`.

```bash
# 1. Clone repository on target server
git clone <repository_url>
cd "KRAYASETU AI"

# 2. Configure production environment
cp .env.example .env
# Edit .env with your domain and secrets:
# ENVIRONMENT=production
# ADMIN_API_KEY=<strong_random_token>
# CORS_ORIGINS=https://krayasetu.railways.gov.in

# 3. Build and launch container
docker compose up --build -d

# 4. Verify deployment health
curl -f http://localhost:8000/api/health
```

### Option B: Split Cloud Deployment (e.g., Vercel Frontend + Render/Railway Backend)
1. **Backend Deployment (Render/Railway/VM):**
   - Root directory: repository root
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 1`
   - Environment Variables:
     - `ENVIRONMENT=production`
     - `ADMIN_API_KEY=<strong_random_token>`
     - `DATABASE_URL=sqlite:///./krayasetu.db` (or managed PostgreSQL URI)
     - `CORS_ORIGINS=https://your-frontend.vercel.app`
2. **Frontend Deployment (Vercel):**
   - Root directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_API_BASE_URL=https://your-backend-url.onrender.com`

---

## 3. Post-Deployment Smoke Test Script

Run this quick command to verify that all major systems are responding correctly:

```bash
# 1. Verify Health
curl http://localhost:8000/api/health

# 2. Verify Corridors (Should return 5 active corridors)
curl http://localhost:8000/api/corridors

# 3. Verify Active Blocks (Should return 50 blocks)
curl http://localhost:8000/api/blocks

# 4. Verify Telemetry Stream
curl "http://localhost:8000/api/railway/active-trains?mode=LIVE"

# 5. Verify Demo Reset Security (Should return 403 Forbidden without key)
curl -X POST http://localhost:8000/api/blocks/demo-reset
```

---

## 4. Disaster Recovery & Rollback

### Rollback Database
If test state is mutated during live demonstrations:
```bash
# In development/eval mode:
curl -X POST http://localhost:8000/api/blocks/demo-reset

# In production mode (using configured ADMIN_API_KEY):
curl -X POST http://localhost:8000/api/blocks/demo-reset -H "X-Admin-Key: <ADMIN_API_KEY>"
```

### Physical Database Backup
```bash
# Create timestamped copy
cp krayasetu.db krayasetu_backup_$(date +%Y%m%d_%H%M%S).db
```
