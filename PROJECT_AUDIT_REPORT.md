# Comprehensive Software Audit Report: SIH26027 vs. KrayaSetu-Ai-main
**Smart India Hackathon Problem Statement 26027 (SIH PS 26027)**  
*Smart Railway Maintenance Block Planning & Operational Decision Support for Bhopal Division (West Central Railway - WCR)*

---

### Executive Overview & Scope
This audit investigates two versions of the KrayaSetu AI software repository:
1. **PROJECT_1 (`SIH26027`)**: The original finalized baseline codebase. Its backend services, mathematical optimization models, and standard web interface operate with predictable consistency.
2. **PROJECT_2 (`KrayaSetu-Ai-main`)**: An edited branch modified by your teammate. It introduces significant operational additions—including multi-day Marey time-distance string charts, 50 pre-populated railway possession blocks classified into four real-world railway categories (Ruling, Planned, Emergent, Shadow), departmental task clearance logging, and containerized deployment blueprints. However, architectural changes made during this refactoring (specifically strict CORS origin blocking, the removal of API localhost fallbacks, production environment checks redirecting SQLite to Linux `/tmp/` paths, and unmigrated database columns) cause the backend to fail or become unreachable during ordinary user execution—even while the frontend application appears to start and load normally.

This report documents every API route, database table, backend service, frontend page, UI component, and button across both systems in clear, plain English.

---

## 1. Tech Stack Summary (for each project)

### 1.1 PROJECT_1 (`SIH26027`) — Baseline Version

#### Languages, Frameworks, and Libraries
* **Backend Language & Framework**: Python 3.12, FastAPI 0.115.0 (modern asynchronous REST framework), Uvicorn 0.30.0 (ASGI server).
* **Database & ORM**: SQLite (`krayasetu.db` anchored at repository root) managed via SQLAlchemy 2.0.30 (Object Relational Mapper). Data validation is handled via Pydantic 2.9.0.
* **Mathematical Optimization & AI**:
  * **Google OR-Tools CP-SAT (9.10.0)**: Used as the core constraint programming solver for scheduling maintenance blocks within available train headway gaps while respecting crew capacity and track availability.
  * **Scikit-Learn (1.5.0), Joblib (1.4.0), Pandas (2.2.0), NumPy (2.0.0)**: Used for duration estimation and priority scoring heuristics.
* **Frontend Core**: React 19.2.8, TypeScript 6.0.2, Vite 8.3.0 (fast frontend build tool and dev server), React Router DOM 7.18.3 (client-side routing).
* **UI & Visualization Libraries**:
  * **Tailwind CSS 4.3.3**: Utility-first responsive CSS styling.
  * **Lucide React (1.45.0)**: System iconography.
  * **TanStack React Query (5.102.8)**: Server state management and asynchronous data fetching.
  * **DHTMLX Gantt (10.0.3)**: Third-party interactive JavaScript timeline and Gantt chart engine.
  * **HTML5 Canvas**: Custom procedural rendering for schematic track maps, station yards, and platform loop lines.
* **End-to-End & Backend Testing**:
  * **Pytest (8.0.0)**: Backend unit and API route tests (16 test cases).
  * **Playwright (1.63.0)**: Browser-level end-to-end acceptance automation.
  * **Oxlint (1.81.0)**: High-speed JavaScript/TypeScript linter.

#### How the Project is Started and Run
1. **Backend Server**:
   ```powershell
   # Run directly using Uvicorn or the provided script:
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
   # OR:
   python scripts/run_backend.py
   ```
   * The API starts at `http://localhost:8000`. Swagger documentation is served at `http://localhost:8000/docs`.
   * CORS allows all origins (`allow_origins=["*"]`), meaning any web browser on any port or IP address can connect.
2. **Frontend Application**:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   * The frontend starts at `http://localhost:5173`.
   * Vite provides an internal reverse-proxy: any request to `/api/*` is automatically forwarded to `http://127.0.0.1:8000`.
   * If `VITE_API_BASE_URL` is omitted, the frontend code falls back to `http://localhost:8000` when not running under the Vite development server.

#### Folder Structure Overview
```text
SIH26027/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy database table models (network, trains, maintenance, events)
│   │   ├── routers/           # FastAPI route controllers (network, trains, maintenance, blocks, scenarios, events, planning)
│   │   ├── schemas/           # Pydantic request and response schemas
│   │   ├── services/          # Business logic (CP-SAT optimizer, AI assessor, conflict engine, priority scoring)
│   │   ├── config.py          # Application settings and environment parsing
│   │   ├── database.py        # SQLAlchemy database engine and session factory
│   │   └── main.py            # FastAPI entry point, CORS middleware, route mounting
│   ├── tests/                 # Backend automated test suite (5 test files)
│   └── venv/                  # Local Python virtual environment
├── data/                      # Canonical railway JSON datasets (network topology, maintenance rules, timetables)
├── frontend/
│   ├── src/
│   │   ├── components/        # UI components (blocks, corridor, department, layout, network, station)
│   │   ├── context/           # React context (AuthContext for client-side demo roles)
│   │   ├── pages/             # 15 distinct role-based workspace screens
│   │   ├── services/          # api.ts (backend API fetch client)
│   │   ├── types/             # TypeScript data contracts
│   │   ├── App.tsx            # Main application router and protected routes
│   │   ├── GanttDashboard.tsx # DHTMLX Gantt timeline view
│   │   └── main.tsx           # React root bootstrap
│   ├── package.json
│   └── vite.config.ts
├── ml_pipeline/               # Standalone machine learning scripts (clustering, duration models)
├── scripts/                   # Seeding, timetable generation, and backend startup scripts
├── tests/                     # Playwright acceptance tests
├── contracts.ts               # Shared TypeScript domain contracts
├── krayasetu.db               # SQLite database file
├── package.json               # Playwright and npm build scripts
└── requirements.txt           # Python dependency specification
```

---

### 1.2 PROJECT_2 (`KrayaSetu-Ai-main`) — Teammate's Edited Version

#### Languages, Frameworks, and Libraries
* **Backend Language & Framework**: Python 3.12, FastAPI 0.115.0, Uvicorn 0.30.0.
* **Database & ORM**: SQLite (`krayasetu.db`) via SQLAlchemy 2.0.30 and Pydantic 2.9.0.
* **Additional Python Dependency**:
  * **`tzdata>=2024.1`**: Added to support explicit Indian Standard Time (`Asia/Kolkata`) timezone conversions using Python's `zoneinfo` module.
* **Mathematical Optimization & AI**: Google OR-Tools CP-SAT (9.10.0), Scikit-Learn (1.5.0), Joblib, Pandas, NumPy.
* **Frontend Core**: React 19.2.8, TypeScript 6.0.2, Vite 8.3.0, React Router DOM 7.18.3, TanStack React Query 5.102.8, Tailwind CSS 4.3.3, Lucide React icons.
* **Key Frontend Architectural Change**:
  * **DHTMLX Gantt Abandoned**: While `dhtmlx-gantt` remains listed in `package.json`, its implementation was completely stripped from `GanttDashboard.tsx`. It was replaced with a custom-engineered HTML/SVG timeline with multi-lane resource allocation (Track, Crew, Machine, Train) and dynamic zoom levels.
* **Deployment Additions**:
  * **Docker & Docker Compose**: Added multi-stage `Dockerfile` and `docker-compose.yml`.
  * **Vercel Serverless Hosting Configuration**: Added `vercel.json` rewrites and `api/index.py` serverless function wrapper.

#### How the Project is Started and Run
1. **Local Direct Execution (Intended by Teammate)**:
   ```powershell
   # Backend:
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   # Frontend:
   cd frontend
   npm run dev
   ```
2. **Containerized Execution**:
   ```bash
   docker compose up --build -d
   ```
3. **Serverless Execution (Vercel)**:
   Routes `/api/*` to `api/index.py`, which imports the FastAPI `app` object.

#### Folder Structure Overview
PROJECT_2 retains the core folder layout of PROJECT_1 but introduces **39 new files**, modifies **74 files**, and adds new functional subsystems:
```text
KrayaSetu-Ai-main/
├── api/
│   └── index.py               # NEW: Vercel serverless function entry point
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   └── conflict_test_trains.py # NEW: Conflict-testing passenger train dataset
│   │   ├── routers/
│   │   │   └── railway.py     # NEW: 990-line Live Telemetry & Train Radar API router
│   │   └── services/
│   │       ├── dataset_identity.py # NEW: SHA-256 fingerprint generator for canonical blocks
│   │       └── time_validation.py  # NEW: Strict future planning window and timezone validation
│   └── tests/                 # EXPANDED: 18 test files (up from 5 in PROJECT_1)
├── frontend/src/
│   ├── components/
│   │   ├── blocks/
│   │   │   └── PlannedBlockCard.tsx    # NEW: Structured card/row renderer for the 4 block types
│   │   ├── department/
│   │   │   └── DepartmentActivityLog.tsx # NEW: Immutable task and approval audit table
│   │   └── marey/             # NEW: Complete Marey Time-Distance diagram visualization
│   │       ├── MareyCanvas.tsx         # 884-line HTML5 Canvas drawing train trajectories
│   │       ├── MareyHeader.tsx         # Date navigator, filters, time-of-day clock
│   │       └── TrainDetailDrawer.tsx   # Slide-out drawer with telemetry and timetable logs
│   ├── data/
│   │   └── bhopalRegionConfig.ts       # NEW: Station chainages (0-231 km) and train categories
│   ├── hooks/
│   │   └── useCanonicalData.ts         # NEW: React Query hooks with cache retention
│   ├── pages/
│   │   └── MareyDiagramPage.tsx        # NEW: Full-screen Marey String Diagram workspace
│   ├── services/
│   │   └── railwayApi.ts      # NEW: API client for train telemetry and radar polling
│   └── utils/
│       ├── formatDistance.ts  # NEW: Metric chainage formatter
│       ├── istDate.ts         # NEW: Indian Standard Time (IST) date utilities
│       └── plannedBlocksHelper.ts # NEW: Remark sanitizer and block filter utilities
├── scripts/
│   ├── migrate_block_types.py          # NEW: Database migration script for block columns
│   ├── populate_four_block_dataset.py  # NEW: Generates 50 blocks across the 4 railway types
│   └── seed_planned_activities.py      # NEW: Seeds 21 departmental planned activities
├── scratch_check_db.py        # NEW: Teammate's database inspection utility
├── Dockerfile                 # NEW: Multi-stage Docker packaging configuration
├── docker-compose.yml         # NEW: Local container orchestrator
├── DEPLOYMENT.md              # NEW: Production deployment manual
└── vercel.json                # NEW: Vercel serverless rewrite rules
```

---

## 2. Backend Inventory — PROJECT_1 (`SIH26027`)

### 2.1 Complete API Routes / Endpoints Inventory
PROJECT_1 registers **52 active routes** across 7 domain routers and top-level execution endpoints. In PROJECT_1, routers are mounted twice: once with the `/api` prefix (for the React frontend) and once at the server root without a prefix (ensuring backward compatibility with legacy test scripts).

| HTTP Method | Route URL | Purpose & Description | Input Data Taken | Output Data Returned |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Root service health status | None | JSON object with service name, docs path, health status (`200 OK`). |
| **GET** | `/health` | Server liveness check | None | System status, division, zone, and operational mode. |
| **GET** | `/api/health` | Canonical system health check | None | JSON confirming status `HEALTHY`, division `Bhopal Division`, zone `WCR`. |
| **POST** | `/plan` | Stateless CP-SAT optimization | JSON body (`ScheduleRequest`): tasks, trains, resources, horizon | JSON with scheduled jobs, timestamps, assigned resources, delay metrics. |
| **POST** | `/macro-plan` | High-level monthly/weekly macro bucket planner | JSON body (`ScheduleRequest`) | Grouped candidate work packages assigned to multi-day possession windows. |
| **POST** | `/override` | Dispatcher priority override acknowledgment | JSON body (`OverrideRequest`): `work_id`, `override_type`, parameters | JSON echoing back override status, target work ID, and applied parameters. |
| **GET** | `/api/summary` | Division-wide infrastructure summary | None | Active corridors count, stations count, total track km, active speed restrictions. |
| **GET** | `/api/corridors` | Lists all 5 Bhopal Division corridors | None | Array of corridor objects (ID, code, name, track configuration, route km). |
| **GET** | `/api/corridors/{id}` | Detailed corridor dossier | Path param: `corridor_id` (e.g. `CORR-01`) | Full corridor profile with all constituent railway sections, stations, and track lines. |
| **GET** | `/api/stations` | Lists all stations in the division | Query param: `major_only` (boolean flag) | Array of stations with junction categories, loop lines, platforms, and GPS coords. |
| **GET** | `/api/stations/{code}` | Station Master infrastructure detail | Path param: `station_code` (e.g. `BPL`) | Station layout, platforms, siding tracks, interlocking cabin details. |
| **GET** | `/api/trains` | Master train directory | Query param: `service_type` (optional filter) | Array of trains (number, name, category, origin, destination, max speed). |
| **GET** | `/api/train-movements` | Live simulated train positions | None | Array of active train movements (current km, section, track, delay in minutes). |
| **GET** | `/api/trains/{number}` | Train operational profile | Path param: `train_number` (e.g. `12002`) | Train metadata and scheduled stopping timetable across Bhopal Division. |
| **GET** | `/api/trains/{number}/live` | Live telemetry tracking for single train | Path param: `train_number` | Current GPS position, speed in km/h, next signal aspect, and delay minutes. |
| **GET** | `/api/maintenance/faults` | Lists track defect/fault reports | Query param: `status` (optional) | Array of reported track, OHE, and signal faults with AI severity ratings. |
| **POST** | `/api/maintenance/faults` | Logs a new maintenance defect | JSON body (`FaultCreateRequest`): reporter, description, location, corridor | Created fault record with unique ID and initial AI classification. |
| **POST** | `/api/maintenance/assess` | Triggers AI severity assessment for a fault | JSON body: `{"fault_id": "FLT-001"}` | Updated fault record with AI urgency, required possession duration, and impact. |
| **POST** | `/api/maintenance/approve` | Engineer validation of AI fault assessment | JSON body (`HumanDecisionRequest`): `fault_id`, `decision`, notes | Approved maintenance task record ready for scheduling, linked to fault. |
| **GET** | `/api/maintenance/tasks` | Lists approved maintenance tasks | None | Array of tasks requiring possession blocks (department, duration, equipment). |
| **GET** | `/api/maintenance/crews` | Department crew gang directory | None | Array of maintenance gangs (gang size, home base, duty hour limitations). |
| **GET** | `/api/maintenance/equipment` | Heavy track machinery registry | None | Array of heavy machines (tamping machines, ballast cleaners, tower wagons). |
| **GET** | `/api/blocks` | Retrieves all maintenance blocks | Query params: `status`, `corridor_id`, `department_id`, `section_id` | Array of scheduled or proposed possession blocks with start/end windows. |
| **GET** | `/api/blocks/coordination` | Multi-department joint block proposals | None | Groups of co-located tasks bundled under shared traffic and power blocks. |
| **GET** | `/api/blocks/{block_id}` | Detailed block dossier | Path param: `block_id` | Single block record with track names, section km, and underlying task list. |
| **GET** | `/api/blocks/{block_id}/explanation` | AI reasoning behind block approval/timing | Path param: `block_id` | Plain-text explanation of train headway gaps, conflicts, and safety buffers. |
| **POST** | `/api/blocks/check-conflict` | Real-time train conflict detection | JSON body (`BlockProposalRequest`): section, track, date, start_time, end_time | Conflict analysis: overlapping trains, VIP train delays, and suggested alternate slots. |
| **POST** | `/api/blocks/propose` | Submits a proposed maintenance block | JSON body (`BlockProposalRequest`) | Saved block proposal in `PROPOSED` or `PENDING_APPROVAL` status. |
| **POST** | `/api/blocks/propose-from-schedule` | Promotes an optimizer slot to a proposed block | JSON body: task data, selected start/end times, corridor, section | Created block record saved to database in `PENDING_APPROVAL` status. |
| **POST** | `/api/blocks/optimize` | Runs CP-SAT solver over pending tasks | JSON body: tasks, corridor filter, planning horizon start/end | Optimized block schedule, list of deferred tasks, and passenger delay KPIs. |
| **POST** | `/api/blocks/approve` | Legacy block approval endpoint | JSON body: `{"block_id": "BLK-001"}` | Updated block marked `APPROVED`. |
| **POST** | `/api/blocks/{id}/submit` | Submits block for operational clearance | Path param: `block_id` | Block status moved to `PENDING_APPROVAL`, audit log generated. |
| **POST** | `/api/blocks/{id}/approve` | Sanctions block for execution | Path param: `block_id`, optional JSON body with approval notes | Block status moved to `APPROVED`, corridor traffic possession granted. |
| **POST** | `/api/blocks/{id}/reject` | Denies clearance for a proposed block | Path param: `block_id`, JSON body with rejection reason | Block status moved to `REJECTED`, explanation recorded in audit log. |
| **POST** | `/api/blocks/{id}/defer` | Postpones block to future planning cycle | Path param: `block_id`, JSON body with deferral notes | Block status moved to `DEFERRED`. |
| **POST** | `/api/blocks/{id}/select` | Marks block as chosen for next shift | Path param: `block_id` | Block status moved to `SELECTED`. |
| **POST** | `/api/blocks/{id}/replan` | Re-opens block for re-optimization | Path param: `block_id` | Block status reset to `PLANNED` or `PROPOSED` for rescheduling. |
| **POST** | `/api/blocks/demo-reset` | Resets blocks database to initial state | None | Re-seeds database with clean demonstration data (`200 OK`). |
| **POST** | `/api/demo/reset` | Alias for demo-reset | None | Re-seeds database with clean demonstration data (`200 OK`). |
| **GET** | `/api/scenarios` | Lists operational scenarios | None | Returns active scenario name (e.g. "Morning Peak Traffic") and available presets. |
| **POST** | `/api/scenarios/apply` | Switches active railway operational scenario | JSON body: `{"scenario_id": "SCN-FOG-HEAVY"}` | Applies scenario train delays, TSR speed restrictions, and track density. |
| **GET** | `/api/events` | Audit trail of all system actions | Query params: `limit` (int), `entity` (string filter) | Array of immutable event log records (timestamp, actor, role, action, reason). |
| **GET** | `/api/planning/priorities` | S-R-C-A-O task priority ranking | Query params: `corridor_id`, `priority`, `limit` | Ranked priority list of maintenance tasks with mathematical score breakdown. |
| **GET** | `/api/planning/priorities/{id}` | Single task priority calculation detail | Path param: `task_id` | Five-factor score metrics: Severity, Risk, Criticality, Age, Opportunity. |
| **GET** | `/api/planning/infrastructure-mapping/{id}`| Spatial mapping for maintenance task | Path param: `task_id` | Returns exact station, corridor, section, track, and km chainage for the task. |
| **GET** | `/api/planning/candidates` | Pre-computed candidate block bundles | Query param: `corridor_id` (optional) | Array of candidate bundled blocks ready for CP-SAT scheduling. |
| **GET** | `/api/planning/candidates/{id}` | Single candidate bundle detail | Path param: `candidate_id` | Detailed list of grouped tasks bundled within this candidate block. |
| **GET** | `/api/planning/priorities/{id}/explanation` | Formula explanation for task score | Path param: `task_id` | Human-readable explanation of why task received its priority score. |
| **GET** | `/api/planning/priority-explanation/{id}` | Alias for priority explanation | Path param: `task_id` | Human-readable explanation of why task received its priority score. |
| **GET** | `/api/planning/candidates/{id}/explanation` | Bundling rationale for candidate block | Path param: `candidate_id` | Human-readable explanation of why tasks were geographically bundled. |
| **GET** | `/api/planning/dashboard-summary` | Executive summary metrics for planners | None | Total backlog tasks, pending blocks, approved blocks, and average score. |

---

### 2.2 Database Models & Tables Inventory
The database contains **21 relational tables** representing the physical railway and maintenance domain of Bhopal Division:

1. `divisions` (1 record): Stores railway administrative division metadata (`id="BPL"`, name="Bhopal Division", zone="West Central Railway", headquarters="Bhopal").
2. `corridors` (5 records): Stores the 5 active operational corridors:
   * `CORR-01`: Itarsi Jn – Bhopal Jn (Double line spine, 25kV AC electrified).
   * `CORR-02`: Bhopal Jn – Bina Jn (Double line trunk corridor).
   * `CORR-03`: Khandwa Jn – Itarsi Jn (Double line feeder).
   * `CORR-04`: Bina Jn – Guna Jn (Single line branch with crossing loops).
   * `CORR-05`: Guna Jn – Gwalior Jn (Single line connecting corridor).
3. `sections` (71 records): Individual block sections bounded by consecutive stations. Stores start km, end km, running running speed limits, and gradients.
4. `stations` (72 records): Physical railway stations. Stores station telegraph codes (`BPL`, `ET`, `BINA`, `RKMP`, etc.), category (A1, A, B, D), platform counts, loop line capacities, and coordinates.
5. `corridor_stations` (76 records): Sequential chainage mapping each station to its parent corridor with precise kilometer markers.
6. `tracks` (169 records): Physical railway tracks within sections and yards (UP Main, DOWN Main, Single Line, Common Loop, Goods Loop).
7. `assets` (0 records seeded, table present): Physical railway infrastructure assets (points, turnouts, OHE masts, transformers, track circuits).
8. `departments` (3 records): The three core engineering departments:
   * `PWAY`: Permanent Way / Civil Engineering (tracks, rails, ballast, sleepers).
   * `TRD`: Traction Distribution / Electrical (25kV overhead catenary, substations).
   * `SNT`: Signal & Telecommunication (signals, points, axle counters, interlocking).
9. `work_types` (14 records): Standard railway maintenance work classifications (e.g. Deep Screening, Rail Replacement, OHE Inspection, Point Overhaul). Stores default duration, required protection, and machinery needs.
10. `crews` (0 records seeded, table present): Departmental maintenance gangs and duty roster boundaries.
11. `equipment` (6 records): Heavy track machines stationed in Bhopal Division (e.g. Plasser 09-32 CSM Tamper, Unimat Point Tamper, Ballast Cleaning Machine BCM-80, 8-Wheeler Tower Wagon).
12. `fault_observations` (50 records): Track defects and anomalies reported by train drivers, trackmen, or inspection rakes. Stores reporter, description, urgency, and AI severity.
13. `maintenance_tasks` (50 records): Formal engineering tasks generated from verified faults. Stores priority tier (P1 to P4), work type, required equipment, and execution status (`BACKLOG`, `PLANNED`, `IN_PROGRESS`, `COMPLETED`).
14. `blocks` (0 records in default seeded database): Physical possession blocks on the track network. In PROJECT_1, blocks are created dynamically when the user runs the optimizer or proposes a new block from the UI.
15. `operational_restrictions` (0 records seeded, table present): Temporary Speed Restrictions (TSR) and caution orders currently active on track sections.
16. `trains` (14 records): Representative Indian Railways scheduled passenger trains (e.g., 20171 Vande Bharat Express, 12002 Bhopal Shatabdi, 12156 Shaan-e-Bhopal Express, 12616 Grand Trunk Express) and freight trains.
17. `train_schedules` (50 records): Timetable stopping patterns and arrival/departure times at stations across Bhopal Division.
18. `train_movements` (29 records): Simulated real-time positions of trains operating along corridors.
19. `train_events` (0 records seeded, table present): Operational logs of train delays, holds, and dispatch actions.
20. `scenarios` (5 records): Pre-configured operational stress-tests (e.g. "Normal Day Operations", "Heavy Fog Caution Order", "Peak Freight Evacuation", "Substation Power Failure").
21. `event_logs` (970 records): Immutable system audit trail capturing user decisions, approvals, and overrides with timestamp and actor username.

---

### 2.3 Backend Services & Utilities Inventory
All backend intelligence resides in `backend/app/services/`:

1. `optimizer.py`: Core mathematical scheduling engine. Translates pending maintenance tasks, track geography, crew availability, and train timetables into a Google OR-Tools CP-SAT integer programming model. Maximizes maintenance work completed while minimizing passenger train delays and respecting track possession safety headways.
2. `ai_assessor.py`: Natural Language Processing (NLP) and rule-based diagnostic service. Analyzes free-text fault descriptions (e.g., "Severe rail fracture near km 42") using keyword heuristics and TF-IDF classifiers to assign severity ratings (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and predict duration.
3. `conflict_engine.py`: Spatial-temporal collision detector. Compares a requested maintenance block against moving trains within a 15-minute safety buffer. Detects conflicts and computes alternative non-conflicting time windows.
4. `priority_service.py`: Implements the Indian Railways **S-R-C-A-O** multi-factor scoring formula:
   $$\text{Score} = (\text{Severity} \times 0.35) + (\text{Escalation Risk} \times 0.25) + (\text{Criticality} \times 0.20) + (\text{Age} \times 0.10) + (\text{Opportunity} \times 0.10)$$
5. `candidate_generator.py`: Spatial bundling heuristic. Identifies co-located maintenance tasks within 12 km that can be safely grouped under a single shared track and power possession.
6. `explanation_service.py`: Generates transparent, human-readable explanations of why the AI solver scheduled or deferred specific maintenance blocks.
7. `movement_engine.py`: Simulates continuous train progression along railway corridors according to timetable velocities and signal aspects.
8. `delay_simulator.py`: Injects secondary cascading delays when trains are held at outer signals due to active maintenance possessions.
9. `freight_generator.py`: Dynamically generates unscheduled freight paths based on division freight loading targets.
10. `scenario_service.py`: Manages operational scenario switching, adjusting train delays and track speeds across the database.
11. `event_logger.py`: Standardized utility that records tamper-evident records into the `event_logs` database table.

---

### 2.4 Authentication & Session Logic
* **Architecture**: **100% Client-Side Demonstration Registry**.
* **How It Works**: There is **no backend authentication** in PROJECT_1. No `/api/login` route exists, and no JSON Web Tokens (JWT) or server cookies are issued.
* **Mechanism**: Login credentials and role permissions are hardcoded in the frontend file `frontend/src/context/AuthContext.tsx` under `DEMO_ACCOUNTS_REGISTRY`. When a user types a username (e.g. `COA-001`) and demo password (`demo123`), the frontend simply checks the local JavaScript dictionary, stores the active role in the browser's `localStorage`, and permits navigation to protected routes.

---

## 3. Backend Inventory — PROJECT_2 (`KrayaSetu-Ai-main`)

### 3.1 Complete API Routes / Endpoints Inventory
PROJECT_2 expands the backend surface to **60 active routes** (adding 8 brand new endpoints):

| HTTP Method | Route URL | Origin | Purpose & Description | Input Data | Output Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/railway/active-trains` | **NEW** | Real-time train telemetry stream for Bhopal Division | Query: `mode` (LIVE/DEMO), `category`, `direction`, `reference_date`, `reference_time` | Synchronized array of trains with live GPS km, speed, status, halts, and historical track points. |
| **GET** | `/api/railway/corridor-stations` | **NEW** | Stations metadata for the 231 km corridor | None | Array of 27 stations between Bina Jn and Itarsi Jn with exact chainages and coordinates. |
| **POST** | `/api/maintenance/tasks/{id}/complete` | **NEW** | Marks a departmental maintenance task as completed | Path: `task_id`, JSON body: `completed_by`, `notes` | Updated task marked `COMPLETED`, timestamped, logged in audit trail. |
| **PATCH** | `/api/maintenance/tasks/{id}/status` | **NEW** | Updates the lifecycle status of a task | Path: `task_id`, JSON body: `status`, `notes`, `actor` | Updated task record reflecting new operational state. |
| **GET** | `/api/maintenance/completed-tasks` | **NEW** | Historical ledger of completed tasks | Query: `corridor_id`, `station_code`, `department_id`, `period` | Filtered list of finished tasks with completion notes and responsible engineer. |
| **GET** | `/api/maintenance/planned-activities`| **NEW** | Retrieves scheduled pre-planned activities | Query: `department_id`, `cadence` (`CURRENT`, `WEEKLY`, `MONTHLY`) | List of scheduled engineering activities from `planned_activities` table. |
| **PATCH** | `/api/maintenance/planned-activities/{id}/status`| **NEW**| Updates status of a planned activity | Path: `activity_id`, JSON body: `status`, `notes`, `actor` | Updated planned activity record. |
| **POST** | `/api/blocks/regenerate-canonical` | **NEW** | Atomically regenerates the canonical 50-block dataset | Query: `seed` (optional deterministic integer) | Returns new dataset fingerprint, block type distribution (3 Ruling, 33 Planned, 5 Emergent, 9 Shadow). |

*All 52 baseline endpoints from PROJECT_1 remain present.* In addition, existing endpoints were upgraded with new query filters:
* `/api/blocks`: Added `block_type`, `operational_only`, and `ledger_only` parameters.
* `/api/maintenance/faults`: Added `department_id` filtering.
* `/api/events`: Added `department_id` filtering.

---

### 3.2 Database Models & Tables Inventory
PROJECT_2 expands the database from 21 tables to **22 tables** and adds crucial columns:
* **NEW Table**: `planned_activities` (21 records seeded): Stores pre-planned departmental maintenance activities categorized by planning cadences: `CURRENT` (Due today/now), `WEEKLY` (Next 7 days), and `MONTHLY` (30-day window).
* **ALTERED Table `blocks`** (50 records pre-populated in PROJECT_2 vs 0 in PROJECT_1):
  * Added column `block_type` (VARCHAR 30): Classifies blocks into `RULING` (long-term master program), `PLANNED` (regular maintenance), `EMERGENT` (urgent critical intervention), or `SHADOW` (multi-department synchronized block).
  * Added column `planning_origin` (VARCHAR 100): Tracks the administrative authority or division program that scheduled the possession.
  * Added column `planning_date` (VARCHAR 20): Date when the block was formally requisitioned.
  * Added column `execution_date` (VARCHAR 20): Planned date for physical track possession.
* **ALTERED Table `maintenance_tasks`** (64 records vs 50 in PROJECT_1):
  * Added column `block_id` (VARCHAR 50): Foreign key linking underlying tasks directly to their parent possession block (enabling multi-task Shadow blocks).

---

### 3.3 Backend Services & Utilities Inventory
PROJECT_2 contains all 11 services from PROJECT_1 plus **2 new backend services**:
1. `dataset_identity.py` (**NEW**): Computes a deterministic 12-character SHA-256 fingerprint (e.g. `CANON-7B93F12A`) over all blocks and tasks in the SQLite database. Ensures strict data provenance across UI reloads.
2. `time_validation.py` (**NEW**): Indian Standard Time (IST) calendar and planning window engine. Enforces that any proposed or generated future block window must be in the future relative to the current wall-clock time (`START < END` and `END > NOW`), automatically advancing expired slots to the next valid daytime window.

---

### 3.4 Discrepancy Analysis: Missing, Broken, Disconnected, or Commented-Out Backend Code

While PROJECT_2's Python code is logically well-written (unit tests pass in isolation), several severe architectural bugs break communication between the frontend and backend:

#### 1. The CORS Lockdown Bug (Primary Reason Backend Appears "Dead")
* **In PROJECT_1**: `main.py` configured CORS to allow all incoming origins: `allow_origins=["*"]`. Any frontend port or host could reach the API.
* **In PROJECT_2**: The teammate changed this in `config.py` and `main.py` to a hardcoded whitelist:
  ```python
  CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
  ```
* **Why it breaks**: If Vite starts the frontend on port **5174** (which happens automatically if port 5173 is in use by another program or PROJECT_1), or if the user opens the app via an IP address (`http://192.168.x.x:5173`) or runs a preview server on port **4173**, the browser's security system blocks every single API call with a `CORS Preflight Blocked` error. The frontend receives zero data, making the backend appear completely unresponsive.

#### 2. Removal of the Localhost Fallback URL
* **In PROJECT_1 (`frontend/src/services/api.ts`)**:
  ```typescript
  const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "/api" : "http://localhost:8000")).trim();
  ```
* **In PROJECT_2 (`frontend/src/services/api.ts`)**:
  ```typescript
  const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || "/api").trim();
  ```
* **Why it breaks**: The teammate deleted the fallback to `http://localhost:8000`. If you compile the app (`npm run build`) and run `npm run preview`, or run the frontend without Vite's development proxy, requests are sent to `/api` on the frontend web port (e.g. `http://localhost:4173/api/summary`), which returns `404 Not Found` or loads HTML instead of JSON.

#### 3. Production Environment Database Redirect to Linux `/tmp/`
* In `backend/app/config.py`, lines 40-78: If `ENVIRONMENT=production` is set in `.env` (as instructed in the teammate's new `DEPLOYMENT.md`), the code assumes it is running on a Linux cloud server and forces SQLite to look for `/tmp/krayasetu.db`. On Windows computers, `/tmp` does not exist, causing the backend to crash with a `FileNotFoundError` upon launch.

#### 4. The Production "Demo Reset" Lockout
* In `backend/app/routers/blocks.py`, the teammate added security requiring a secret `X-Admin-Key` header to reset demo blocks when running in production mode. However, the frontend has no password prompt or interface to input this key. As a result, clicking the "Reset Demo" button in production mode permanently fails with a `403 Forbidden` error.

#### 5. Database Schema Desynchronization
* If PROJECT_2 is started using PROJECT_1's database file without manually running `python scripts/migrate_block_types.py`, the backend crashes on startup with `sqlite3.OperationalError: no such column: blocks.block_type` because SQLite does not automatically add new table columns on startup.

---

### 3.5 Why the App "Still Runs" Despite Backend Failures
Users are often baffled that the web app still loads, renders rich railway maps, and lets them click around even when the backend is completely offline. This occurs due to four specific frontend design choices:

1. **Authentication is Completely Fake & Client-Side**:
   As noted in Section 2.4, there is no backend login API. The login screen checks a static JavaScript dictionary in the browser. You can enter `COA-001` and `demo123`, and the app will log you in without sending a single network packet to the backend.
2. **Silent `.catch()` Error Handlers**:
   Throughout the frontend code, nearly all data fetch calls are wrapped in silent fallback handlers. For example:
   * `api.getBlocks().catch(() => [])`
   * `api.getTrainMovements().catch(() => [])`
   * `api.getPlanningDashboardSummary().catch(() => null)`
   When the backend fails, the app does not crash or display a red screen—it simply replaces the missing data with empty lists (`[]`) and continues rendering.
3. **Hardcoded Geography, Track Maps, and Yards**:
   The entire physical rail network is drawn from static coordinates stored inside the frontend itself:
   * Station names, Hindi translations, and kilometer markings are hardcoded in `bhopalRegionConfig.ts`.
   * The interactive corridor schematic (`DetailedCorridorMapCanvas.tsx`) renders from pre-calculated geometric points on an HTML5 canvas.
   * Station layouts (platforms, sidings, turnouts) in `StationSchematicCanvas.tsx` are drawn procedurally from local mathematical coordinates.
4. **Independent Procedural Drawing in the Marey Diagram**:
   The new `MareyCanvas.tsx` draws the 24-hour time grid and 27 corridor station reference lines mathematically. Even when the train telemetry API fails, the grid and stations render cleanly, making the screen look functional.

---

## 4. Frontend Inventory — PROJECT_1 (`SIH26027`)

### 4.1 Pages / Screens Inventory (15 Screens)
1. **`LoginPage.tsx`**: System access gate. Users choose a railway role persona or enter credentials to enter the system.
2. **`DivisionalOperationsControl.tsx`**: Master command desk for the Chief of Block Operations (COA). Displays division-wide KPIs, AI decision support alerts, priority task queues, and block sanctioning summaries.
3. **`BlockPlannerPage.tsx`**: Constrained planning workspace. Planners inspect conflicting train movements, execute the CP-SAT optimization engine, examine timetable schedules, and promote candidate slots into official block proposals.
4. **`CoordinationPage.tsx`**: Joint multi-department clearinghouse. Where Civil (P.Way), Electrical (TRD), and Signal (S&T) engineers review shared possession windows (Shadow Blocks), resolve inter-departmental conflicts, and approve/reject blocks.
5. **`ControlDashboard.tsx`**: Network overview screen displaying active trains, division summary cards, and the interactive railway schematic map.
6. **`CorridorsPage.tsx`**: Directory of Bhopal Division's 5 railway corridors with track configurations, operational statuses, and route lengths.
7. **`CorridorDetailPage.tsx`**: Deep-dive operational dashboard for a single selected corridor (e.g. Itarsi–Bhopal). Features sub-tabs for infrastructure assets, corridor maps, and block management.
8. **`StationMasterPage.tsx`**: Station jurisdiction dashboard. Shows station yard schematic diagrams, physical platforms, and loop line occupancies.
9. **`EngineeringPWayControl.tsx`**: Dedicated workspace for Permanent Way (Track) engineers. Displays track maintenance schedules, rail defect logs, and tamping machine rosters.
10. **`ElectricalTRDControl.tsx`**: Dedicated workspace for Traction Distribution engineers. Displays 25kV OHE power feeding zones, substations, and power isolation cut requests.
11. **`SignalSNTControl.tsx`**: Dedicated workspace for Signal & Telecom engineers. Displays electronic interlocking states, point machine testing schedules, and axle counter telemetry.
12. **`TrainPilotWorkspacePage.tsx`**: Locomotive Pilot (driver) reporting console. Drivers submit en-route defect observations (e.g. track jerks, OHE sparks, signal flickering) directly from the cab.
13. **`MaintenancePage.tsx`**: Departmental work task registry. Lists all engineering work orders across the division with AI duration and risk ratings.
14. **`ScenarioAnalysisPage.tsx`**: "What-If" simulation desk. Planners trigger simulated disruptions (heavy fog, track obstructions, freight rushes) to evaluate network resilience.
15. **`EventsHistoryPage.tsx`**: Central compliance and auditing registry. Shows chronological, tamper-evident logs of all user actions and automated clearances.

---

### 4.2 Components Inventory (27 Components)
1. `layout/Navbar.tsx`: Global top bar displaying system title, active persona badge, live clock, and Logout button.
2. `layout/Sidebar.tsx`: Role-based navigation drawer containing links and badges corresponding to user permissions.
3. `MetricCards.tsx`: Top-level stat cards showing active blocks, total trains, open defects, and safety index.
4. `PriorityQueue.tsx`: Ranked backlog list of maintenance defects ordered by priority score.
5. `GanttDashboard.tsx`: High-density timeline view rendering track lanes, train paths, and scheduled blocks via DHTMLX Gantt.
6. `StatusBanner.tsx`: Top alert bar showing active solver status (e.g. `OPTIMAL`, `FEASIBLE`, `FALLBACK_HEURISTIC`).
7. `blocks/BlockReasoningModal.tsx`: Pop-up window displaying plain-language explanations of AI scheduling decisions.
8. `blocks/ConflictAlertBox.tsx`: Alert box warning users of spatial-temporal collisions between trains and planned blocks.
9. `blocks/RoleBlockTable.tsx`: Tabular roster of maintenance blocks with action buttons customized to the logged-in user's role.
10. `common/ProvenanceBadge.tsx`: Visual badge denoting whether data was verified from canonical SQLite persistence or generated dynamically.
11. `corridor/CorridorWorkspaceNav.tsx`: Tab bar for corridor views (Infrastructure, Index, Detailed Map, Block Management).
12. `corridor/DetailedCorridorMapCanvas.tsx`: Interactive HTML5 Canvas map displaying stations, curvature, signals, and track lines for a corridor.
13. `corridor/CorridorBlockManagement.tsx`: Comprehensive block management tab inside Corridor Detail with sub-sections for Monthly, Weekly, Critical blocks, and Defect Issues.
14. `department/DepartmentProblemSection.tsx`: Form and registry where departmental engineers view, log, and update physical field defects.
15. `department/DepartmentTaskSection.tsx`: Task scheduling tab where departmental engineers manage weekly and monthly maintenance programs.
16. `network/CoaBlockManagement.tsx`: Divisional master block desk allowing COA officers to filter blocks across all 5 corridors.
17. `network/MasterNetworkMap.tsx`: Top-level interactive canvas map depicting the entire Bhopal Division rail network.
18. `network/NetworkSectionsView.tsx`: Tabular view of all 71 railway block sections with start/end chainages and track types.
19. `network/SchematicRailwayMap.tsx`: Stylized single-line schematic railway map connecting major junctions.
20. `network/VisualJunctionHubs.tsx`: Visual cards highlighting major junctions (Itarsi Jn, Bhopal Jn, Bina Jn).
21. `station/PlatformSchematic.tsx`: Visual diagram showing station platform tracks and passenger train berthing.
22. `station/RailwayStationSchematic.tsx`: Canvas rendering of station yard tracks, crossovers, and turnout points.
23. `station/StationControlTab.tsx`: Station Master console with tabs for weekly schedules, monthly plans, and requisition requests.
24. `station/StationDetailsDrawer.tsx`: Slide-out panel showing technical specifications for a selected station.
25. `station/StationElementInspector.tsx`: Inspector pane showing electrical and signaling details for an individual track element.
26. `station/StationSchematicCanvas.tsx`: Low-level HTML5 canvas rendering vector tracks, turnouts, and signal lights.
27. `station/StationSelectionModal.tsx`: Searchable pop-up modal allowing users to jump directly to any station in the division.
28. `station/StationYardSchematic.tsx`: Wrapper managing station yard zoom controls and element selection.

---

### 4.3 Clickable Elements & Buttons Inventory (Exhaustive)

#### `LoginPage.tsx`
* **Demo Persona Selector Cards (8 clickable tiles)**: Sets username and pre-fills demo credentials for COA, Corridor Master, Station Master, P.Way Engineer, P.Way Supervisor, S&T Engineer, TRD Engineer, or Train Pilot.
* **"Sign In to Master Console" button**: Validates credentials against client-side dictionary and opens user's default workspace.

#### `Navbar.tsx`
* **"Logout" button**: Clears active session and `localStorage`, redirecting user to login screen.

#### `DivisionalOperationsControl.tsx`
* **"Reset Demo Data" button**: Calls backend `/api/blocks/demo-reset` to restore clean demonstration data.
* **"Apply Scenario" dropdown & button**: Sends POST request to `/api/scenarios/apply` to switch division operating conditions.
* **"Approve Block" buttons (in table rows)**: Calls `/api/blocks/{id}/approve` to sanction a proposed block.
* **"Reject Block" buttons (in table rows)**: Calls `/api/blocks/{id}/reject` to decline a block.

#### `BlockPlannerPage.tsx`
* **"Run CP-SAT Optimizer" button**: Submits active backlog tasks to `/api/blocks/optimize` with an 8-second solver bound; renders the resulting timetable schedule.
* **"Propose from Schedule" buttons**: Promotes an AI-generated schedule slot into a formal proposed block in the database via `/api/blocks/propose-from-schedule`.
* **"View AI Rationale" (Sparkles icon) buttons**: Opens `BlockReasoningModal` to display why a block was scheduled at that specific time.
* **"Submit for Clearance" buttons**: Calls `/api/blocks/{id}/submit` to forward a drafted block to Divisional Control.
* **"Corridor Filter" buttons (`ALL`, `CORR-01`, etc.)**: Filters the timetable and backlog by specific railway corridor.

#### `CoordinationPage.tsx`
* **Department Tabs (`ALL`, `PWAY`, `TRD`, `SNT`, `SHADOW`)**: Filters coordination list by engineering discipline or joint blocks.
* **"Approve Block" button**: Sanctions coordinated block via `/api/blocks/{id}/approve`.
* **"Reject Block" button**: Declines coordinated block via `/api/blocks/{id}/reject`.
* **"Reschedule Block" button**: Re-opens block for re-optimization via `/api/blocks/{id}/replan`.
* **"Select Block" button**: Flags block as preferred choice for upcoming shift via `/api/blocks/{id}/select`.
* **"AI Decision Rationale" button**: Displays explanation modal for the coordinated block.

#### `CorridorBlockManagement.tsx`
* **Sub-section Tabs ("Monthly", "Weekly", "Critical", "Issues")**: Switches between long-term, near-term, emergent, and defect requisition views.
* **"Request Monthly Block" / "Request Weekly Block" buttons**: Opens `NewBlockModal` to draft and submit a new possession request.
* **"Log Critical Issue" button**: Opens issue reporting modal to log an urgent track defect.
* **"Refresh" button**: Reloads corridor blocks from backend SQLite database.
* **"Edit Block" buttons (pencil icon)**: Opens modal to modify requested start/end times or track possession parameters.
* **"Delete Block" buttons (trash icon)**: Deletes block record from local/server state.

#### `DepartmentProblemSection.tsx`
* **"Log New Defect" button**: Opens submission form modal to record a new fault observation.
* **"Save & Log Issue" button (inside modal)**: Sends POST request to `/api/maintenance/faults`.
* **"Assess with AI" button**: Calls `/api/maintenance/assess` to classify defect severity.
* **"Approve & Create Task" button**: Calls `/api/maintenance/approve` to create a formal maintenance task.
* **"Update Status" button**: Advances defect status (`Acknowledged`, `Assessed`, `In Progress`, `Resolved`).

#### `DepartmentTaskSection.tsx`
* **"Advance Status" button**: Advances task through lifecycle stages (`Planned`, `In Progress`, `Completed`).
* **"Reschedule" button**: Opens date/time input to request alternative maintenance timing.

#### `DetailedCorridorMapCanvas.tsx`
* **"Pan Left" / "Pan Right" buttons**: Shifts map camera east/west along the corridor.
* **"Zoom In (+)" / "Zoom Out (-)" buttons**: Scales canvas rendering magnification.
* **"Recenter" button**: Resets canvas view to default framing.

#### `StationControlTab.tsx`
* **Sub-section Tabs ("Weekly Maintenance", "Monthly Master Program", "Issue Requisitions")**: Switches between station maintenance schedules.
* **"Search Station" button**: Opens `StationSelectionModal` to jump to a different station yard.

---

## 5. Frontend Inventory — PROJECT_2 (`KrayaSetu-Ai-main`)

### 5.1 Pages / Screens Inventory (16 Screens)
Includes all 15 screens from PROJECT_1 plus **1 NEW screen**:

1. **`MareyDiagramPage.tsx` (**NEW**)**:
   * **Purpose**: Multi-day Indian Railways Train-Control Marey String Diagram (Time-Distance graphic chart).
   * **User Activities**:
     * Tracks live trains moving along the 231 km corridor between Bina Jn and Itarsi Jn in real-time.
     * Evaluates scheduled vs. actual train trajectories against maintenance block possessions.
     * Switches dates across a 3-day window (Today, +1 Day, +2 Days) to evaluate future block conflicts.
     * Clicks any train trajectory line to inspect speed, delay, and halting timetable.
     * Clicks any shaded maintenance block on the canvas to inspect power cut requirements and assigned crews.
     * Toggles between an authentic **Archival Dispatcher Vintage Parchment** theme and a modern **Night Control Dark** theme.
     * Exports high-resolution PNG charts for operational briefing logs.

---

### 5.2 Components Inventory (32 Components)
Includes all 27 components from PROJECT_1 plus **5 NEW components**:

1. **`marey/MareyCanvas.tsx` (**NEW**)**:
   * An 884-line custom HTML5 vector canvas that procedural draws:
     * Vertical station lines for 27 stations scaled proportionally to kilometer chainages (0.0 km at Bina to 231.0 km at Itarsi).
     * Horizontal time grid lines (00:00 to 24:00) with 15-minute subdivisions.
     * Oblique train trajectory lines color-coded by Indian Railways train category (Vande Bharat = Orange, Rajdhani/Shatabdi = Red, Superfast = Blue, Mail/Express = Green, Freight = Dashed Gray).
     * Directional arrows and train numbers.
     * Shaded maintenance block possession windows.
     * Moving current-time reference marker (red dashed line) advancing in Indian Standard Time (IST).
2. **`marey/MareyHeader.tsx` (**NEW**)**:
   * Control header bar containing the 3-day date navigator (`Today`, `+1 Day`, `+2 Days`), real-time IST wall clock, train category filters, direction filters (`UP`/`DOWN`), path visibility toggles, zoom buttons, theme toggle, and PNG export trigger.
3. **`marey/TrainDetailDrawer.tsx` (**NEW**)**:
   * Slide-out inspection drawer displaying live operational telemetry (current speed, delay in minutes, next station halt), historical timetable stopping points, and maintenance block dossiers.
4. **`blocks/PlannedBlockCard.tsx` (**NEW**)**:
   * Standardized visual card/table row component representing the 4 railway block types (`RULING`, `PLANNED`, `EMERGENT`, `SHADOW`). Displays corridor, exact kilometer chainage, track name, 25kV power cut indicator, clean approval remarks, and decision rationale button.
5. **`department/DepartmentActivityLog.tsx` (**NEW**)**:
   * Immutable departmental audit log table displaying a searchable history of tasks completed by field gangs, engineer approvals, and parent block links.

---

### 5.3 Clickable Elements & Buttons Inventory in PROJECT_2 (Highlighting New Items & Status)

Below is an inventory of every button that is **NEW in PROJECT_2**, including its label, trigger, and functional status:

| Location / File | Button Label / Icon | Trigger / Action Taken | Functional Status |
| :--- | :--- | :--- | :--- |
| `MareyHeader.tsx` | **"Today"** | Switches date to current day; calculates real-time live train positions. | **Fully Functional** |
| `MareyHeader.tsx` | **"+1 Day"** | Advances planning date to tomorrow; loads future timetable strings. | **Fully Functional** |
| `MareyHeader.tsx` | **"+2 Days"** | Advances planning date to day-after-tomorrow. | **Fully Functional** |
| `MareyHeader.tsx` | **"Vintage Parchment / Night Control"** | Toggles color theme between archival parchment (`#faf6ee`) and dark control (`#0b1120`). | **Fully Functional** |
| `MareyHeader.tsx` | **"UP Line" / "DN Line" / "ALL"** | Filters train trajectories by operational direction (Northbound vs Southbound). | **Fully Functional** |
| `MareyHeader.tsx` | **Category Filter Buttons** (Vande Bharat, Shatabdi, Superfast, Mail, Freight) | Isolates specific train categories on the canvas. | **Fully Functional** |
| `MareyHeader.tsx` | **"Scheduled Paths: ON/OFF"** | Toggles display of static timetable baseline paths vs actual positions. | **Fully Functional** |
| `MareyHeader.tsx` | **"Maintenance Blocks: ON/OFF"** | Toggles semi-transparent shaded block possession overlays on the canvas. | **Fully Functional** |
| `MareyHeader.tsx` | **Zoom Controls (`+`, `-`, `1:1`)** | Adjusts time-distance canvas scale magnification. | **Fully Functional** |
| `MareyHeader.tsx` | **"Refresh"** | Polls `/api/railway/active-trains` for updated telemetry. | **Broken if CORS blocks port** |
| `MareyHeader.tsx` | **"Export PNG"** | Triggers browser download of canvas as an image file. | **Fully Functional** |
| `TrainDetailDrawer.tsx`| **"✕" (Close Drawer)** | Closes the slide-out train and block inspection panel. | **Fully Functional** |
| `BlockPlannerPage.tsx`| **"Regenerate 50 Blocks"** | Calls `/api/blocks/regenerate-canonical` to randomize and promote 50 validated blocks across the 4 types. | **Backend Dependent** (Fails if backend CORS/path broken) |
| `BlockPlannerPage.tsx`| **"Inspect Dossier" button** | Opens detailed modal showing underlying tasks inside a Shadow block. | **Fully Functional** |
| `CoordinationPage.tsx`| **"Mark Complete" (Individual Task)** | Calls `/api/maintenance/tasks/{id}/complete` to record completion of a single department's task inside a multi-department block. | **Backend Dependent** (Works when API reachable) |
| `CoordinationPage.tsx`| **"Completed Tasks" Tab** | Switches to completed tasks history table (`api.getCompletedTasks()`). | **Fully Functional** |
| `CoordinationPage.tsx`| **"Regenerate 50 Blocks"** | Re-seeds canonical 50-block dataset and invalidates cache. | **Backend Dependent** |
| `CorridorBlockManagement.tsx` | **"Daily Blocks" Tab** | Filters view to display near-term daily maintenance blocks. | **Fully Functional** |
| `CorridorBlockManagement.tsx` | **"Completed Tasks" Tab** | Displays finished tasks specific to the active corridor. | **Fully Functional** |
| `CorridorBlockManagement.tsx` | **"Request Daily Block"** | Opens block creation modal pre-set to "DAILY" cadence. | **Fully Functional** |
| `StationControlTab.tsx`| **"Completed Tasks" Tab** | Displays completed maintenance tasks within the station jurisdiction. | **Fully Functional** |
| `EngineeringPWayControl.tsx` | **"Current / Due Now" Tab** | Shows tasks scheduled for today (`cadence="CURRENT"`). | **Fully Functional** |
| `EngineeringPWayControl.tsx` | **"Activity Log" Tab** | Renders `DepartmentActivityLog` component for P.Way. | **Fully Functional** |
| `ElectricalTRDControl.tsx` | **"Current / Due Now" Tab** | Shows traction activities due today. | **Fully Functional** |
| `ElectricalTRDControl.tsx` | **"Activity Log" Tab** | Renders `DepartmentActivityLog` component for TRD. | **Fully Functional** |
| `SignalSNTControl.tsx` | **"Current / Due Now" Tab** | Shows signaling activities due today. | **Fully Functional** |
| `SignalSNTControl.tsx` | **"Activity Log" Tab** | Renders `DepartmentActivityLog` component for S&T. | **Fully Functional** |
| `DepartmentTaskSection.tsx`| **"Mark Complete"** | Calls backend to mark planned activity or task complete. | **Backend Dependent** |
| `PlannedBlockCard.tsx`| **"Decision Rationale" (Sparkles)**| Opens AI reasoning popup for that specific block. | **Fully Functional** |
| `PlannedBlockCard.tsx`| **"Details" container** | Selects block and opens detailed dossier drawer. | **Fully Functional** |

---

## 6. Side-by-Side Feature Diff

The following table summarizes every capability, screen, and major control present in **PROJECT_2** that does not exist in **PROJECT_1**, indicating its dependency on the backend and its operational state:

| Feature / UI Element | Exists in P1? | Exists in P2? | Description & Value | Depends on Broken Backend? | Current Operational State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Live Marey String Diagram (`/marey-diagram`)** | ❌ No | ✅ **Yes** | Time-Distance graph showing train paths and block possessions across 231 km corridor. | **Yes** (Requires `/api/railway/active-trains`) | **Partially Usable**: Grid, stations, and styling render; train lines require backend telemetry API. |
| **3-Day Operational Date Navigator** | ❌ No | ✅ **Yes** | Allows planners to toggle between Today, Tomorrow, and +2 Days to evaluate future conflicts. | No (Calculates in frontend) | **Fully Working** |
| **Four Real-World Railway Block Types** | ❌ No | ✅ **Yes** | Formal classification: Ruling (3), Planned (33), Emergent (5), Shadow (9). | **Yes** (Stored in database) | **Working when DB seeded**; breaks if run against unmigrated P1 DB. |
| **Regenerate 50 Blocks Button** | ❌ No | ✅ **Yes** | One-click button to generate and promote 50 valid railway blocks. | **Yes** (Calls `/api/blocks/regenerate-canonical`) | **Broken if CORS blocks port** or if scripts import path fails. |
| **Custom SVG/HTML Gantt Timeline** | ❌ No (Used DHTMLX) | ✅ **Yes** | Replaced proprietary DHTMLX Gantt with custom multi-lane timeline. | No | **Fully Working** |
| **Individual Task Completion inside Shadow Blocks** | ❌ No | ✅ **Yes** | Allows one department to mark its work done without closing parent block. | **Yes** (Calls `/api/maintenance/tasks/{id}/complete`) | **Backend Dependent** (Fails if CORS blocks request). |
| **Department Activity & Audit Log Tab** | ❌ No | ✅ **Yes** | Audit table in P.Way, TRD, and S&T workspaces tracking who cleared what. | **Yes** (Calls `/api/events?department_id=...`) | **Backend Dependent** |
| **Current / Due Now Activity Cadence** | ❌ No | ✅ **Yes** | Displays activities scheduled for immediate execution today. | **Yes** (Queries `planned_activities` table) | **Backend Dependent** |
| **Completed Tasks Ledger Tabs** | ❌ No | ✅ **Yes** | Historical tabs in Coordination, Corridor Detail, and Station Master views. | **Yes** (Calls `/api/maintenance/completed-tasks`) | **Backend Dependent** |
| **Strict Future Time Window Validator** | ❌ No | ✅ **Yes** | Automatically moves expired maintenance slots to future daytime windows. | **Yes** (Backend service) | **Fully Working internally** (85/85 tests pass). |
| **Dataset Fingerprinting (`CANON-XXXXXXXX`)** | ❌ No | ✅ **Yes** | Cryptographic hash proving all screens show identical database state. | **Yes** (Backend service) | **Fully Working internally**. |
| **Docker & Docker Compose Deployment** | ❌ No | ✅ **Yes** | Turnkey container deployment files (`Dockerfile`, `docker-compose.yml`). | N/A | **Functional with correct `.env`**. |
| **Vercel Serverless Function Wrapper** | ❌ No | ✅ **Yes** | Configuration files for serverless hosting (`api/index.py`, `vercel.json`). | **Broken on Windows** | **Broken**: Redirects database to `/tmp/krayasetu.db`. |

---

## 7. Overall Health Assessment

### Plain English Summary for Non-Technical Stakeholders

#### What State is PROJECT_1 (`SIH26027`) In?
* **Verdict**: **Stable, Predictable Baseline (Clean Working State)**.
* **Explanation**: PROJECT_1 is a reliable, working software system. Its backend and frontend communicate without errors. When you launch the backend, it listens on all network interfaces and accepts connections from any web browser without security blocks. The CP-SAT optimization engine, train conflict detector, and priority calculation algorithms all function properly.
* **Limitations of PROJECT_1**: By default, its database contains **zero pre-scheduled maintenance blocks** (the `blocks` table has 0 rows). Blocks only appear after a user manually executes the optimizer or fills out a proposal form. Additionally, it lacks the multi-day Marey diagram, does not differentiate between Ruling and Shadow blocks, and relies on an external DHTMLX Gantt library.

---

#### What State is PROJECT_2 (`KrayaSetu-Ai-main`) In?
* **Verdict**: **Significantly More Advanced & Realistic, But Hamstrung by Configuration Defects (High Value, Easily Repairable)**.
* **Explanation**: Your teammate did impressive domain-specific railway engineering work. They added features that match real Indian Railways operations:
  1. A pre-built scenario of **50 realistic maintenance blocks** categorized into Ruling, Planned, Emergent, and Shadow blocks across all 5 active Bhopal Division corridors.
  2. A **Marey Diagram** that draws train time-distance trajectories across 231 km from Bina to Itarsi.
  3. A custom-built timeline that replaces the third-party DHTMLX Gantt chart.
  4. Workflows allowing individual departments to sign off on their own tasks within a shared track possession.
* **Why the Backend "Stopped Functioning"**: The core mathematical and business logic is **not broken** (all 85 backend tests pass successfully). Instead, the teammate introduced three configuration and network-level mistakes:
  * **The "Locked Door" (CORS Whitelist)**: They locked down backend security so strictly that if the frontend runs on port 5174 instead of 5173, the browser refuses to connect and reports that the backend is dead.
  * **The "Lost Address" (Missing Localhost Fallback)**: They removed the code that tells the browser where to find the backend (`http://localhost:8000`) if running outside of Vite's development proxy.
  * **The "Linux Assumption" (Vercel `/tmp/` Database Path)**: They added code for Vercel cloud deployment that forces SQLite to search for `/tmp/krayasetu.db` on Windows when `ENVIRONMENT=production` is enabled, causing immediate crashes.
* **Why the App Still Loads**: The app loads because login authentication is handled entirely inside the browser without talking to the backend, the track maps are drawn from static built-in coordinates, and any failed network requests are caught silently.

---

### Key Recommendations for Future Work (Informational Only)
*When you are ready to merge or repair these codebases in a subsequent task:*
1. **Restore Open CORS in `main.py`**: Change `allow_origins=cors_origins` back to `allow_origins=["*"]` so any local port or browser can connect freely.
2. **Restore Localhost Fallback in `api.ts` & `railwayApi.ts`**: Reinstate `http://localhost:8000` as the default API host when `VITE_API_BASE_URL` is unset.
3. **Harmonize Database Migrations**: Ensure `krayasetu.db` includes the `block_type`, `planning_origin`, `planning_date`, and `execution_date` columns from PROJECT_2 so database queries never crash.
4. **Remove Linux `/tmp/` Overrides on Windows**: Allow the SQLite database path to anchor naturally to the project root folder regardless of whether `ENVIRONMENT=production` is set.

---
*Report completed on 2026-09-26. All source files across both repositories were inspected in read-only mode without code modification.*
