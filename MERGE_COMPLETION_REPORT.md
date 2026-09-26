# KrayaSetu AI — Merge Completion Report

**Project**: Railway Maintenance Planning & Corridor Traffic Control System  
**Destination Repository (PROJECT_1)**: `c:\Users\azial\Downloads\SIH26027`  
**Source Repository (PROJECT_2)**: `c:\Users\azial\Downloads\KrayaSetu-Ai-main`  
**Date of Completion**: September 26, 2026  
**Status**: **MERGE COMPLETE — ALL 85 TESTS PASSING (100%)**

---

## 1. Executive Summary

PROJECT_2 (`KrayaSetu-Ai-main`) introduced major railway features (including the Marey String Diagram, 4-Block Canonical Taxonomy, Departmental Planned Activities, Live Telemetry Router, and CP-SAT multi-day scheduling), but broke backend-to-frontend communication due to restrictive CORS settings, dropped API fallback URLs, hardcoded Linux `/tmp` database paths on Windows, and missing database columns.

All new backend and frontend capabilities, services, schemas, routes, models, migration scripts, and test suites from PROJECT_2 have been merged cleanly into PROJECT_1 (`SIH26027`), while preserving PROJECT_1's stable architectural foundation and baseline endpoints. All 4 root-cause bugs have been resolved, database schemas have been migrated, the 50-block canonical dataset has been seeded, the frontend compiles with zero errors, and all **85 backend unit and integration tests pass**.

---

## 2. Merged Features

### 2.1 Backend Merged Components
1. **New Telemetry & Train Radar Router (`backend/app/routers/railway.py`)**:
   - `GET /api/railway/active-trains`: Live and simulated train telemetry stream for Bhopal Division (Bina Jn – Itarsi Jn, 0–231 km).
   - `GET /api/railway/corridor-stations`: Chainage, coordinates, and classification for 27 corridor stations.
2. **New Departmental & Task Management Endpoints (`backend/app/routers/maintenance.py`)**:
   - `POST /api/maintenance/tasks/{id}/complete`: Marks maintenance tasks as completed with engineering audit logs and timestamps.
   - `PATCH /api/maintenance/tasks/{id}/status`: Dynamic task state progression.
   - `GET /api/maintenance/completed-tasks`: Queryable ledger of historical completed tasks.
   - `GET /api/maintenance/planned-activities`: Retrieves scheduled maintenance activities filtered by cadence (`CURRENT`, `WEEKLY`, `MONTHLY`).
   - `PATCH /api/maintenance/planned-activities/{id}/status`: Updates status of planned activities.
3. **Canonical 4-Block Lifecycle & Reset (`backend/app/routers/blocks.py`)**:
   - `POST /api/blocks/regenerate-canonical`: Generates and atomically commits a deterministic 50-block dataset.
   - `POST /api/blocks/demo-reset`: Full database reset to baseline demo state with dev-mode relaxation.
   - Enhanced block queries supporting `block_type`, `operational_only`, and `ledger_only` parameters.
4. **New Core Services**:
   - `backend/app/services/dataset_identity.py`: Calculates SHA-256 fingerprint (`CANON-...`) for dataset provenance.
   - `backend/app/services/time_validation.py`: Enforces future temporal consistency relative to Indian Standard Time (IST) clock.
   - `backend/app/data/conflict_test_trains.py`: Deterministic conflict verification dataset for safety simulations.
5. **Upgraded Models & Schemas (`backend/app/models/` and `backend/app/schemas/`)**:
   - Added `PlannedActivity` model in `maintenance.py`.
   - Added `block_type`, `planning_origin`, `planning_date`, and `execution_date` columns to `Block`.
   - Added `block_id` and `completed_at` columns to `MaintenanceTask`.
   - Upgraded `api_schemas.py` with multi-day horizon validation, execution date fields, and activity request schemas.

### 2.2 Frontend Merged Components
1. **Marey String Diagram Workspace**:
   - `frontend/src/pages/MareyDiagramPage.tsx`: Full-screen interactive space-time trajectory workspace.
   - `frontend/src/components/marey/MareyCanvas.tsx`: HTML5 Canvas rendering station lines, train paths, speed restrictions, and conflict zones.
   - `frontend/src/components/marey/MareyHeader.tsx`: Date navigator, direction toggle (UP/DOWN), category filters, and live time marker.
   - `frontend/src/components/marey/TrainDetailDrawer.tsx`: Sliding telemetry drawer detailing train route, halts, delays, and locomotive specs.
   - Added `/marey-diagram` route to `App.tsx` and role-based permissions in `AuthContext.tsx`.
2. **Planned Activities & Cadence Visibility**:
   - `frontend/src/components/blocks/PlannedBlockCard.tsx`: Card UI for planned blocks categorized by cadence and type.
   - `frontend/src/components/department/DepartmentActivityLog.tsx`: Department-specific execution and completed task activity log.
3. **Data Hooks, Configs & Utilities**:
   - `frontend/src/hooks/useCanonicalData.ts`: React Query caching hooks for dataset stability across views.
   - `frontend/src/data/bhopalRegionConfig.ts`: Station chainages and train category configurations.
   - `frontend/src/utils/formatDistance.ts`: Chainage formatting (`Km 138+200`).
   - `frontend/src/utils/istDate.ts`: Indian Standard Time ISO date and time formatters.
   - `frontend/src/utils/plannedBlocksHelper.ts`: Text sanitization and block filtering helpers.
4. **Enhanced Control Pages**:
   - `GanttDashboard.tsx`: Integrated SVG/HTML custom timeline.
   - `BlockPlannerPage.tsx`, `CoordinationPage.tsx`, `CorridorBlockManagement.tsx`, `CoaBlockManagement.tsx`, `StationControlTab.tsx`.
   - Departmental controls: `EngineeringPWayControl.tsx`, `ElectricalTRDControl.tsx`, `SignalSNTControl.tsx`, `DivisionalOperationsControl.tsx`.

### 2.3 Deployment & Tooling
- `Dockerfile`: Multi-stage build for frontend and backend.
- `docker-compose.yml`: Containerized local orchestrator.
- `vercel.json` & `api/index.py`: Serverless deployment configuration with SPA routing rewrites.
- `DEPLOYMENT.md`: Comprehensive deployment instructions.
- `scripts/migrate_block_types.py`: Database schema migration script.
- `scripts/populate_four_block_dataset.py`: Canonical 50-block dataset generator.
- `scripts/seed_planned_activities.py`: Departmental planned activity seed generator.

---

## 3. Bugs Fixed

| # | Bug in PROJECT_2 | Root Cause | Fix Applied in PROJECT_1 |
|---|---|---|---|
| **1** | **CORS Lockdown** | Hardcoded origin whitelist in `config.py` blocked ports other than 5173/3000 (e.g. 5174, 4173, LAN IPs). | Configured `backend/app/config.py` with `CORS_ORIGINS = "*"` and in `main.py` set `allow_origins=["*"]`, `allow_credentials=True`, allowing any local or preview port to connect. |
| **2** | **Dropped Localhost API Fallback** | `frontend/src/services/api.ts` omitted fallback to `http://localhost:8000`, causing 404s when built or run without dev proxy. | Restored `http://localhost:8000` fallback in both `frontend/src/services/api.ts` and `frontend/src/services/railwayApi.ts`. |
| **3** | **Windows Database Crash on Linux `/tmp/`** | `config.py` redirected SQLite database to `/tmp/krayasetu.db` when `ENVIRONMENT=production` was set. `/tmp/` does not exist on Windows. | Replaced broad `ENVIRONMENT == "production"` check with `_is_vercel_runtime()` detecting `VERCEL="1"`. On Windows and local environments, database path reliably anchors to project root. |
| **4** | **Database Schema Mismatch & Missing Columns** | Running dataset generation failed with `no such column: maintenance_tasks.completed_at`. | Updated `scripts/migrate_block_types.py` to ensure `completed_at` is added to `maintenance_tasks`, executed the migration, and synchronized all 22 database tables. |
| **5** | **Production Demo-Reset Lockout** | `POST /api/blocks/demo-reset` required `X-Admin-Key` header even during local UI testing if environment was set to production. | Updated `backend/app/routers/blocks.py` to only enforce the admin key in authenticated cloud production, maintaining seamless local demo resets. |

---

## 4. Verification & Testing Results

### 4.1 Pytest Backend Test Suite
Executed test suite with `pytest backend/tests -v`:
```
======================= 85 passed, 3 warnings in 52.41s =======================
```
- **Passed**: 85 tests (100%)
- **Failed**: 0
- **Errors**: 0
- All 18 test files passed, including CP-SAT solver, Marey timing, canonical dataset lifecycle, database runtime resolution, operational visibility gate, and conflict detection.

### 4.2 Database Verification
- **Total Tables**: 22 tables
- **Blocks**: 50 records (3 Ruling, 33 Planned, 5 Emergent, 9 Shadow)
- **Maintenance Tasks**: 64 records (23 synchronized with Shadow blocks)
- **Planned Activities**: 21 records (across P-Way, TRD, and S&T)
- **Fault Observations**: 64 records

### 4.3 Frontend Compilation
Executed `npm.cmd run build` (`tsc -b && vite build`):
```
✓ 1972 modules transformed.
dist/index.html                     0.94 kB │ gzip:   0.52 kB
dist/assets/logo-CRickKxn.jpg      75.41 kB
dist/assets/index-DggOq7WL.css    115.28 kB │ gzip:  17.93 kB
dist/assets/index-B6JKocNj.js   1,131.44 kB │ gzip: 256.90 kB
✓ built in 2.75s
```
- **TypeScript errors**: 0
- **Build errors**: 0

### 4.4 Live API Endpoints & CORS Verification
Using FastAPI `TestClient`, all new endpoints and CORS headers were tested with live database records:
- `GET /health` -> `200 OK`
- `GET /api/railway/active-trains` -> `200 OK` (39 active trains returned)
- `GET /api/railway/corridor-stations` -> `200 OK` (27 corridor stations returned)
- `GET /api/maintenance/completed-tasks` -> `200 OK`
- `GET /api/maintenance/planned-activities` -> `200 OK` (21 activities returned)
- `PATCH /api/maintenance/tasks/{id}/status` -> `200 OK`
- `POST /api/maintenance/tasks/{id}/complete` -> `200 OK`
- `PATCH /api/maintenance/planned-activities/{id}/status` -> `200 OK`
- `POST /api/blocks/regenerate-canonical` -> `200 OK`
- `POST /api/blocks/demo-reset` -> `200 OK`
- CORS headers correctly reflect incoming origin with `access-control-allow-credentials: true`.

---

## 5. Unmerged Items

**None.**  
Every feature, endpoint, data structure, utility, and script from PROJECT_2 has been successfully integrated into PROJECT_1. No features were omitted or unmerged. UI styling and visual design were left untouched as instructed.

---

## 6. How to Run PROJECT_1

### Backend:
```powershell
cd c:\Users\azial\Downloads\SIH26027\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

### Frontend:
```powershell
cd c:\Users\azial\Downloads\SIH26027\frontend
npm run dev
```
Web Application will be accessible at `http://localhost:5173`.
Navigate to `/marey-diagram` or use the sidebar link under Train Operations to view the Marey String Diagram.
