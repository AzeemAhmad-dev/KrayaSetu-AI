# Comprehensive System Architecture & Engineering Analysis
## SIH26027: Integrated Block Bundling Engine & Smart Railway Maintenance Scheduling Platform

---

## Executive Overview

This document provides a verified, deep reverse-engineered analysis of the **SIH26027** software repository. The system is designed for the Indian Railways (specifically modeled on the West Central Railway, Bhopal Division) to solve the challenging problem of **simultaneously scheduling rail traffic and engineering maintenance blocks without risking safety, causing unacceptable passenger delays, or failing to address critical track defects**.

The fundamental architectural principle of this system is:
> **Symbolic Constraint Satisfaction proves safety; Machine Learning predicts input coefficients.**  
> ML never touches track occupancy or interval variables directly. Track exclusivity is mathematically guaranteed by Google OR-Tools CP-SAT via `AddNoOverlap` and `AddCumulative`.

---

## 1. Overall System Architecture & Exact Technology Stack

### 1.1 Co-Existing Architectural Paradigms

The codebase contains two architectural layers that interface through shared schemas, database representations, and service boundaries:

```
                      +-------------------------------------------------------------+
                      |                      CLIENT INTERFACE                       |
                      |  React 19 + TypeScript + Vite + DHTMLX Gantt + Tailwind CSS |
                      +------------------------------+------------------------------+
                                                     | HTTP / REST
                                                     v
+---------------------------------------------------------------------------------------------------+
|                                FASTAPI APPLICATION CORE (Uvicorn ASGI)                            |
|                                                                                                   |
|  +---------------------------------------------------+   +-------------------------------------+  |
|  |     LAYER A: STATELOCK MICRO-OPTIMIZATION         |   |    LAYER B: RELATIONAL DOMAIN OPS   |  |
|  |       (SIH26027 Integrated Block Bundling)       |   |        (KrayaSetu AI Platform)      |  |
|  +---------------------------------------------------+   +-------------------------------------+  |
|  | • Contracts: Pydantic v2 (contracts.py)          |   | • Relational Models: SQLAlchemy     |  |
|  | • CP-SAT Engine (cp_sat_core.py): 8s Wall-Clock   |   |   (network, maintenance, trains,    |  |
|  | • Lexicographic 2-Pass (Priority -> Train Delay) |   |   events, scenarios)                |  |
|  | • Greedy Warm-Start & Fallback (greedy_heuristic) |   | • Domain CP-SAT (optimizer.py):     |  |
|  | • Macro Bucket Planner (macro_planner.py): FFD   |   |   Multi-Pass Fallback Solver        |  |
|  | • Explainability Engine (reason_codes.py)        |   | • Priority Engine: S-R-C-A-O        |  |
|  | • Live Telemetry Client: RailRadar (500ms bound)  |   | • Candidate Generator & Conflict    |  |
|  | • Overrides: SQLite (dispatcher.db)               |   |   Engine (15m headway buffers)      |  |
|  +-------------------------+-------------------------+   | • SQLite Database (krayasetu.db)    |  |
|                            |                             +------------------+------------------+  |
|                            v                                                v                     |
|  +---------------------------------------------------+   +-------------------------------------+  |
|  |           OFFLINE ML & PRE-FILTER PIPELINE        |   |      DATA PRODUCERS & SEED SCRIPTS  |  |
|  | • XGBoost Classifier: 7-day Defect Escalation Risk |   | • WCR Bhopal Division Network JSON  |  |
|  | • XGBoost Quantile Regressor: P80 Duration Est.   |   | • Maintenance Rules & Timetables    |  |
|  | • SHAP TreeExplainer: Factor Attribution          |   | • Controlled 1000-Task Generator    |  |
|  | • scikit-learn DBSCAN: 1D Chainage Clustering     |   | • Adversarial Stress Generator      |  |
|  +---------------------------------------------------+   +-------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

#### Layer A: The Stateless Micro-Execution & Macro-Bucket Engine (SIH26027 Core)
- **Design Objective**: Fulfills the strict mathematical requirements of Problem Statement 26027 (`SIH26027_Master_Spec_v2.md`).
- **Data Boundary**: Consumes and emits strictly validated Pydantic v2 schemas (`backend/app/schemas/contracts.py`).
- **Core Optimization**: Google OR-Tools CP-SAT (`backend/app/solver/cp_sat_core.py`) with a hard 8.0-second wall-clock cap, lexicographic multi-pass optimization, soft-mandatory drop penalties ($1{,}000{,}000$), candidate possession blocks (`y_b`), traveling jobs with shared presence literals, and greedy warm starts (`greedy_heuristic.py`).
- **Long-Term Planning**: Macro bucket assignment (`backend/app/planner/macro_planner.py`) running a 30-day First-Fit-Decreasing heuristic with SLA proximity boosting.
- **Explainability**: 3-check deterministic deferral evaluator (`backend/app/engine/reason_codes.py`).
- **Telemetry**: Asynchronous client for live train tracking (`backend/app/data/railradar.py`) with a 500ms timeout circuit-breaker.

#### Layer B: The Relational Operational Platform (KrayaSetu AI)
- **Design Objective**: Full-featured railway administration system for divisional controllers, station masters, and departmental engineers.
- **Data Boundary**: Relational database persistence using SQLAlchemy and SQLite (`backend/krayasetu.db`).
- **Infrastructure Scope**: Detailed network topologies for the Bhopal Division, West Central Railway (WCR), across 5 corridors, 76 locations, and 25 stations.
- **Domain Optimization**: An independent multi-pass CP-SAT optimizer (`backend/app/services/optimizer.py`) with power isolation modeling, track exclusivity reification, and candidate block co-occupancy allowances.
- **Operational Workflows**: Fault reporting, AI risk assessment, multi-department block proposals (P-Way, TRD, S&T), conflict detection with 15-minute headway buffers, and immutable event auditing.

---

### 1.2 Exact Technology Stack

The following versions and libraries have been verified directly against the project environment (`backend/venv`, `package.json`, and source code):

| Layer / Component | Technology / Library | Exact Version | Role in System Architecture |
|---|---|---|---|
| **Runtime Language** | Python | `3.12.10` (venv) | Backend execution, solver integration, and ML inference. |
| **Constraint Solver** | Google OR-Tools | `9.15.6755` | CP-SAT solver (`ortools.sat.python.cp_model`) driving micro-scheduling. |
| **Web Framework** | FastAPI | `0.141.1` | Asynchronous REST API routing. |
| **ASGI Web Server** | Uvicorn | `0.53.0` | High-throughput server hosting FastAPI with uvloop/httptools. |
| **Data Schema & Contracts** | Pydantic v2 | `2.13.5` | Strict data validation for all API inputs, outputs, and contracts. |
| **Database ORM** | SQLAlchemy | `2.0.52` | Relational ORM mapping domain entities. |
| **Databases** | SQLite | `3.x` (Embedded) | `krayasetu.db` (Bhopal network) and `dispatcher.db` (dispatcher overrides). |
| **Gradient Boosted Trees** | XGBoost | `3.4.1` | `XGBClassifier` (escalation risk) & `XGBRegressor` (P80 quantile duration). |
| **ML Clustering & Calibration**| Scikit-Learn | `1.9.1` | `DBSCAN` for 1D corridor clustering; `CalibratedClassifierCV`. |
| **Explainable AI (XAI)** | SHAP | `0.52.0` | `TreeExplainer` extracting top 3 risk factors for defect predictions. |
| **Data Frames & Arrays** | Pandas / NumPy | `3.0.5` / `1.26.4` | Tabular data manipulation, time-sliced feature engineering. |
| **Network Graph Modeling** | NetworkX | `3.2+` | Adjacency graph construction, connected component problem splitting. |
| **Async HTTP Client** | HTTPX | `0.28.1` | Non-blocking async client querying RailRadar with 500ms bounds. |
| **Frontend Framework** | React | `19.0.0` | Client framework for divisional operations dashboards. |
| **Frontend Language** | TypeScript | `5.7.2` | Type safety enforcing Part 2 contracts on the client. |
| **Build & Dev Tool** | Vite | `6.2.0` | Bundler and local development server for the UI. |
| **Gantt Visualization** | DHTMLX Gantt | `v10.0.0` Community | MIT-licensed Gantt chart rendering tracks, trains, and maintenance bars. |
| **Server State Management** | TanStack React Query | `v5.66.0` | Handles asynchronous mutations, cache invalidation, and solver queries. |
| **UI Design System** | Tailwind CSS | `3.4.17` | Railway telemetry UI styling. |
| **Icons** | Lucide React | `0.475.0` | Icons for operational states, alerts, and departments. |
| **Testing Frameworks** | Pytest / Playwright | `9.1.1` / `1.50.0` | Pytest for mathematical solvers; Playwright for DOM geometry verification. |

---

## 2. Complete File Tree Mapping

```
SIH26027/
├── B_BLOCK_COMPLETION.md               # Summary of Phase B completion and E2E Playwright verification.
├── KrayaSetu_AI_README.md              # Operational guide for Bhopal Division decision support platform.
├── SIH26027_Master_Manifest.md         # Master tech stack specifications and agent orchestration context.
├── SIH26027_Master_Spec_v2.md          # Comprehensive specification document (Math, Contracts, Red Team, ML).
├── SIH26027_Master_Spec_v3.md          # Synchronized v3 copy of the master technical specification.
├── backend_parity_ledger.md            # Gap analysis comparing the SIH26027 port with JYOTI_REFERENCE.
├── brutal_qa_defect_matrix.md          # Defect log and QA stress-test tracking matrix.
├── contracts.ts                        # TypeScript interfaces reflecting the Part 2 Data Contract.
├── data_parity_ledger.md               # Data consistency audit between Bhopal network data and schemas.
├── frontend_parity_ledger.md           # Audit of frontend views, widgets, and router configurations.
├── package.json                        # Root NPM configuration for running Playwright end-to-end suites.
├── playwright.config.ts                # Configuration file for Playwright browser testing.
│
├── artifacts/
│   ├── gantt_adversarial_stress_test.png # Screenshot verifying zero DOM overlaps on 50-task adversarial test.
│   └── research_paper.md               # Academic draft detailing the CP-SAT + ML hybrid railway scheduler.
│
├── backend/
│   ├── dispatcher.db                   # SQLite store holding dispatcher block overrides and locked states.
│   ├── krayasetu.db                    # Relational SQLite database with full Bhopal Division railway data.
│   ├── qa_backend.py                   # Automated backend testing script verifying reset, simulation, and solver.
│   ├── requirements.txt                # Python dependencies for the backend and ML runtime.
│   │
│   ├── app/
│   │   ├── config.py                   # Global application settings, project constants, and SQLite paths.
│   │   ├── database.py                 # SQLAlchemy engine, session maker, and Base for krayasetu.db.
│   │   ├── main.py                     # FastAPI application factory mounting all modular API routers.
│   │   │
│   │   ├── data/
│   │   │   ├── producers.py            # Mock generator emitting Part 2 JSON fixtures for offline testing.
│   │   │   └── railradar.py            # Asynchronous HTTP client querying RailRadar API with a 500ms timeout.
│   │   │
│   │   ├── db/
│   │   │   └── database.py             # Dedicated SQLite persistence layer for DispatcherOverride models.
│   │   │
│   │   ├── engine/
│   │   │   └── reason_codes.py         # 3-step deterministic heuristic evaluating reasons for deferred tasks.
│   │   │
│   │   ├── ml/
│   │   │   ├── clustering.py           # DBSCAN 1D corridor chainage clustering with time-window overlap splits.
│   │   │   ├── duration.py             # XGBoost P80 quantile duration regressor with safety floor clamping.
│   │   │   └── escalation.py           # XGBoost defect escalation classifier with SHAP explainability.
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py             # Exports all SQLAlchemy relational models for database initialization.
│   │   │   ├── events.py               # Database schemas for audit event logs and what-if scenarios.
│   │   │   ├── maintenance.py          # Schemas for tasks, faults, blocks, departments, crews, and work types.
│   │   │   ├── network.py              # Schemas for divisions, corridors, sections, stations, tracks, and assets.
│   │   │   └── trains.py               # Schemas for trains, timetables, and dynamic section movements.
│   │   │
│   │   ├── planner/
│   │   │   └── macro_planner.py        # 30-day First-Fit-Decreasing bucket assigner with SLA urgency boosting.
│   │   │
│   │   ├── routers/
│   │   │   ├── blocks.py               # Endpoints for block proposals, approvals, coordination, and optimization.
│   │   │   ├── events.py               # Read and query endpoints for the immutable event audit ledger.
│   │   │   ├── maintenance.py          # Endpoints for inspecting faults, maintenance tasks, crews, and machines.
│   │   │   ├── network.py              # Endpoints querying railway infrastructure, corridors, and station yards.
│   │   │   ├── planning.py             # Endpoints for S-R-C-A-O scoring, candidate generation, and explanations.
│   │   │   ├── scenarios.py            # Endpoints for what-if delay simulations and operational stress tests.
│   │   │   └── trains.py               # Endpoints for train timetables and active section occupancy tracking.
│   │   │
│   │   ├── schemas/
│   │   │   ├── api_schemas.py          # Pydantic models for relational CRUD endpoints and block proposals.
│   │   │   └── contracts.py            # Strict Pydantic v2 models encoding the Part 2 execution contract.
│   │   │
│   │   ├── services/
│   │   │   ├── ai_assessor.py          # NLP and rule-based classifier parsing raw defect descriptions.
│   │   │   ├── candidate_generator.py  # Spatiotemporal bundling service grouping tasks into candidate blocks.
│   │   │   ├── conflict_engine.py      # Spatial conflict evaluator checking train paths with a 15-minute buffer.
│   │   │   ├── delay_simulator.py      # Simulates cascading delay propagation across adjacent track sections.
│   │   │   ├── event_logger.py         # Utility recording structured state transitions to the event log.
│   │   │   ├── explanation_service.py  # Generates natural language audit justifications for prioritized tasks.
│   │   │   ├── freight_generator.py    # Generates synthetic freight paths based on commodity traffic demands.
│   │   │   ├── movement_engine.py      # Computes train section transitions and active track occupancy states.
│   │   │   ├── optimizer.py            # Relational CP-SAT solver with multi-pass cascading fallback logic.
│   │   │   ├── priority_service.py     # Deterministic implementation of the 5-factor S-R-C-A-O priority engine.
│   │   │   └── scenario_service.py     # Manages execution of what-if disruption scenarios on live corridors.
│   │   │
│   │   └── solver/
│   │       ├── cp_sat_core.py          # Standalone micro CP-SAT execution engine matching Part 1 specification.
│   │       └── greedy_heuristic.py     # Millisecond greedy packer providing warm-start hints and fallback schedules.
│   │
│   └── tests/
│       ├── test_adversarial.py         # Stress test firing 50 tasks and 50 trains against the CP-SAT engine.
│       ├── test_api.py                 # Pytest suite validating contracts, reason codes, and RailRadar timeout.
│       ├── test_contracts.py           # Validates Pydantic serialization of all Part 2 request/response schemas.
│       ├── test_ml.py                  # Validates XGBoost training, quantile duration, SHAP, and DBSCAN logic.
│       └── test_solver.py              # Tests CP-SAT soft mandatory penalties, greedy heuristics, and NoOverlap.
│
├── data/
│   ├── bhopal_division_network.json    # Canonical GIS and track layout data for 5 corridors in Bhopal Division.
│   ├── maintenance_rules.json          # Standard maintenance operating procedures, durations, and crew requirements.
│   └── timetables.json                 # Real public IR timetables for passenger and freight services in WCR.
│
├── frontend/
│   ├── package.json                    # Frontend dependencies (React 19, DHTMLX Gantt, Tailwind, Lucide).
│   ├── tsconfig.json                   # TypeScript configuration for the React application.
│   ├── vite.config.ts                  # Vite build and dev-server configuration.
│   │
│   └── src/
│       ├── App.tsx                     # Top-level application component with ProtectedRoute RBAC navigation.
│       ├── GanttDashboard.tsx          # DHTMLX Gantt integration rendering track lanes, trains, and context menus.
│       ├── StatusBanner.tsx            # Visual indicator showing OPTIMAL, FEASIBLE, or FALLBACK_HEURISTIC status.
│       ├── api/queries.ts              # TanStack Query hooks for calling schedule optimization and override APIs.
│       ├── components/                 # Reusable UI widgets: metric strips, priority queues, and modals.
│       ├── context/                    # React contexts for authentication (`AuthContext`) and RBAC (`RoleContext`).
│       ├── pages/                      # 14 distinct workspace pages (e.g., BlockPlannerPage, CorridorDetailPage).
│       ├── services/api.ts             # Centralized API fetch wrapper with 23 domain endpoints.
│       └── types/                      # TypeScript definitions for railway models and contract interfaces.
│
├── ml_pipeline/
│   ├── clustering.py                   # Standalone DBSCAN clustering module for spatial corridor grouping.
│   ├── models.py                       # Training routines for calibrated XGBoost classifier and quantile regressor.
│   └── predict.py                      # Production inference wrapper implementing SHAP explainability and fallbacks.
│
├── scripts/
│   ├── generate_network_data.py        # Generates synthetic network topology fixtures.
│   ├── generate_phase3_maintenance_data.py # Seeds 1,000 deterministic maintenance tasks across Bhopal Division.
│   ├── generate_timetables_and_assets.py   # Populates station assets, track circuits, and timetable movements.
│   ├── run_backend.py                  # CLI runner to launch the Uvicorn ASGI server.
│   ├── run_paper_experiments.py        # Script running comparative benchmark experiments for research paper.
│   ├── seed_database.py                # Master database seeder populating krayasetu.db from JSON sources.
│   └── verify_*.py                     # Verification scripts asserting corridors, schematics, and workflows.
│
└── tests/
    └── e2e_acceptance.spec.ts          # Playwright test scraping Gantt DOM to assert zero overlapping bars.
```

---

## 3. Core Logic: Automatic Block Planning & Scheduling

### 3.1 Macro / Micro Decoupled Planning

A key architectural insight in this codebase is that **scheduling railway maintenance 30 days out is not the same problem as scheduling maintenance for tonight**. Conflating them results in combinatorial explosion and false precision:

```
                                    MACRO PLANNING HORIZON (30 Days)
                        Algorithm: Greedy First-Fit-Decreasing with SLA Urgency Boost
                                  Input: Full Backlog from TMS / SMMS
                                                  │
                                                  ▼
                               [ MacroAllocationCalendar (Part 4) ]
                               (Assigns work items to specific days)
                                                  │
                                                  ▼  Rolling Daily Hand-Off
                                    MICRO EXECUTION HORIZON (24 Hours)
                            Algorithm: Google OR-Tools CP-SAT (Lexicographic)
                                 Input: Assigned Tasks for Day + Real Timetable
                                                  │
                                                  ▼
                               [ ScheduleResponse with DHTMLX Gantt ]
                               (Exact minute-level start/end times)
                                                  │
                                                  ▼  Deferred Jobs Feedback Loop
                            (Jobs that failed to schedule today re-injected
                             into tomorrow's backlog with SLA urgency boost)
```

1. **Macro Bucket Planning (`backend/app/planner/macro_planner.py`)**:
   - Assigns maintenance requests to **calendar days** rather than exact minutes.
   - Computes urgency based on mandatory status and SLA proximity:
     $$\text{urgency}(i) = (\text{mandatory}_i, \; P_i + \text{boost}_i)$$
     where:
     $$\text{boost}_i = 40 \times \max\left(0, 1 - \frac{\text{days\_left}}{14}\right)$$
   - Performs First-Fit-Decreasing bin packing against daily crew hours, plant machinery hours, and corridor possession allowances.
   - Items that do not fit before their statutory deadline receive the reason code `NO_CAPACITY_BEFORE_DEADLINE`.

2. **Rolling Hand-off to Micro Engine (`backend/app/solver/cp_sat_core.py`)**:
   - Each morning, the micro solver pulls tasks allocated to `day == 0` and schedules them at minute-level resolution against fixed train paths.
   - **Feedback Loop**: If any task cannot be scheduled during the micro solve, it is emitted in `deferred_work_packages` and re-injected into tomorrow's macro backlog with `release_day = tomorrow`. This prevents uncompleted defects from being dropped from the maintenance pipeline.

---

### 3.2 Spatiotemporal Bundling Engine

To minimize track downtime, the system clusters maintenance tasks so that multiple engineering gangs share a single traffic block and power isolation window:

1. **1D Chainage Spatial Clustering (`backend/app/ml/clustering.py`)**:
   - Railway defects exist on a 1-dimensional corridor metric (chainage in KM), not a 2D Euclidean plane.
   - Uses **DBSCAN** with $\epsilon = 2.0\text{ km}$ and $\text{min\_samples} = 1$ restricted to a single NetworkX connected component.
   - Outlier defects become valid singleton candidate blocks rather than being forcibly merged with incompatible jobs.
2. **Temporal Window Overlap Splitting (`_split_by_window_overlap`)**:
   - Geographically adjacent defects are subdivided if their permissible maintenance windows ($[\text{earliest\_start}, \text{latest\_start}]$) do not overlap.
3. **Sequential Execution Within Bundles**:
   - The total block duration is the sum of task durations plus a single setup overhead:
     $$D_b = \sum_{i \in b} d_i + \sigma_b \quad (\sigma_b = 20\text{ minutes})$$
   - Inside the candidate block, tasks are constrained to execute sequentially using `AddNoOverlap`, ensuring work gangs do not physically interfere with one another while sharing the same track possession.

---

### 3.3 Explainable Deferral Engine: 3-Check Heuristic

When CP-SAT defers a work package, `backend/app/engine/reason_codes.py` determines why by running three deterministic checks against the solved state without triggering an expensive re-solve:

```
                                      [ Deferred Task i ]
                                               │
                                               ▼
              Check 1: Does a continuous track gap of dur_i exist
                       between earliest_start and latest_start against
                       FIXED TRAINS alone?
                                         /           \
                                       NO             YES
                                       /               \
                       [ NO_FEASIBLE_WINDOW ]           ▼
                                      Check 2: Does task demand exceed
                                               absolute crew shift capacity or
                                               total plant pool quantity?
                                                 /           \
                                               YES            NO
                                               /               \
                               [ CAPACITY_EXCEEDED ]            ▼
                                              Check 3: Identify scheduled tasks on
                                                       same section with higher priority.
                                                                │
                                                                ▼
                                                        [ LOWER_PRIORITY ]
                                                 (Names winning competing work IDs)
```

1. **Check 1: `NO_FEASIBLE_WINDOW`**:
   - Checks if there is any continuous gap of length $d_i$ between $\text{earliest\_start}$ and $\text{latest\_start}$ when accounting only for fixed trains and headway buffers.
   - If no gap exists, the job could not be scheduled due to conflicting train traffic.
2. **Check 2: `CREW_CAPACITY_EXCEEDED` / `PLANT_CAPACITY_EXCEEDED`**:
   - Checks whether the task's required crew size exceeds the peak capacity of that crew pool, or if required plant machinery exceeds total inventory.
3. **Check 3: `LOWER_PRIORITY`**:
   - If the task fit physically and resources were available, it was excluded because higher-priority tasks claimed the window. The engine identifies the competing tasks on that section and lists up to 3 winning IDs in `reason_detail`.

---

## 4. Constraint Programming Models, Algorithms & Mathematical Logic

The system contains two distinct CP-SAT models: the **Unified Micro Solver** (`cp_sat_core.py`) and the **Relational Multi-Pass Optimizer** (`services/optimizer.py`).

---

### 4.1 Unified Micro Solver (`backend/app/solver/cp_sat_core.py`)

#### Decision Variables
- $x_i \in \{0, 1\}$: Presence literal for work package $i$.
- $s_i \in [r_i, l_i - d_i]$: Integer start minute.
- $e_i \in [r_i + d_i, l_i]$: Integer end minute ($e_i = s_i + d_i$).
- $iv_i = \text{OptionalIntervalVar}(s_i, d_i, e_i, x_i)$: Optional interval variable.
- $y_c \in \{0, 1\}$: Presence literal for candidate block $c$.
- $S_c, E_c$: Integer bounds for candidate block $c$ ($E_c = S_c + D_c$).
- $\text{shift}_t \in [0, \text{max\_shift}_t]$: Delay assigned to semi-flexible train $t$.
- $\text{drop}_i \in \{0, 1\}$: Soft penalty indicator for mandatory tasks ($\text{drop}_i = 1 - x_i$).
- $x_j \in \{0, 1\}$: Shared presence literal for traveling job $j$, reused across all route legs $k$.

#### Mathematical Constraints

1. **Track Section Exclusivity (`AddNoOverlap`)**:
   $$\text{NoOverlap}\left( \{ \text{train\_iv}_t \mid b(t) = b \} \cup \{ iv_i \mid b \in \text{req}_i \} \cup \{ iv_{j, k} \mid \text{leg}_{j,k}.\text{block} = b \} \right) \quad \forall b \in B$$

2. **Resource Capacity (`AddCumulative`)**:
   $$\text{Cumulative}\left( [iv_i], [\text{crew\_size}_i], C_k \right) \quad \forall k \in K$$
   $$\text{Cumulative}\left( [iv_i], [\text{plant\_qty}_i], Q_m \right) \quad \forall m \in M$$

3. **Candidate Block Bundling & Containment**:
   $$x_i = y_c \quad \forall i \in c$$
   $$s_i \ge S_c + \sigma \quad \text{OnlyEnforceIf}(y_c)$$
   $$e_i \le E_c \quad \text{OnlyEnforceIf}(y_c)$$
   $$\text{NoOverlap}\left( [iv_i \mid i \in c] \right)$$

4. **Multi-Section Traveling Jobs (`TravelingJob`)**:
   $$iv_{j, k} = \text{OptionalIntervalVar}(s_{j, k}, d_{j, k} + (\sigma \text{ if } k=0 \text{ else } 0), e_{j, k}, x_j)$$
   $$s_{j, k+1} \ge e_{j, k} \quad \text{OnlyEnforceIf}(x_j)$$
   $$s_{j, k+1} - e_{j, k} \le \text{max\_wait}_j \quad \text{OnlyEnforceIf}(x_j)$$

5. **Soft Mandatory Constraint Formulation**:
   $$\text{drop}_i = 1 - x_i \quad \forall i \in \{W \cup J\} \text{ where } \text{mandatory}_i = \text{True}$$

#### Two-Pass Lexicographic Optimization

To balance maintenance priority against train disruption without arbitrary scaling weights, the solve is partitioned across an 8-second budget:

- **Pass 1 (5.0s budget) — Maximize Priority minus Safety Penalties**:
  $$\max Z_1 = \sum_{i \in W \cup J} P_i \cdot x_i - \Lambda_{\text{safety}} \sum_{i \text{ is mandatory}} \text{drop}_i \quad (\Lambda_{\text{safety}} = 1{,}000{,}000)$$
  Let $Z_1^*$ and $\text{Safety}^*$ be the resulting optimal values.

- **Pass 2 (3.0s budget) — Minimize Train Disruption**:
  $$\min Z_2 = \sum_{t \in T} \text{shift}_t$$
  $$\text{Subject to: } \sum P_i \cdot x_i \ge 0.98 \cdot Z_1^*, \quad \sum \text{drop}_i \le \text{Safety}^*$$

#### Solver Parameters & Warm-Start Hints
```python
solver.parameters.max_time_in_seconds = 8.0
solver.parameters.num_search_workers = 8
solver.parameters.random_seed = 42
solver.parameters.max_number_of_conflicts = 100000

# Warm-start hints populated from greedy_heuristic()
for c_id, jobs in clusters.items():
    all_assigned = all(j.work_id in greedy_assigned for j in jobs)
    model.AddHint(y_b[c_id], 1 if all_assigned else 0)
```

---

### 4.2 Relational Multi-Pass Optimizer (`backend/app/services/optimizer.py`)

This model optimizes tasks directly from the relational database:

1. **Tiered Objective Formulation**:
   $$\max \sum_{t} \left( x_t \cdot \text{Weight}(t) \right) - 2 \cdot s_t - \sum \text{ConflictPenalty}$$
   $$\text{Weight}(t) = \begin{cases} 
   1{,}000{,}000 & \text{if } \text{CRITICAL} \\ 
   10{,}000 \times \text{score} & \text{if } \text{HIGH} \\ 
   100 \times \text{score} & \text{if } \text{MEDIUM} \\ 
   \text{score} & \text{if } \text{LOW} 
   \end{cases}$$
   The $-2 \cdot s_t$ term encourages earlier scheduling within feasible windows.

2. **Track & Power Exclusivity Reification**:
   Enforces non-overlap between tasks unless they share the same candidate block:
   $$e_a \le s_b \quad \text{OnlyEnforceIf}(a\_before\_b)$$
   $$e_b \le s_a \quad \text{OnlyEnforceIf}(b\_before\_a)$$
   $$a\_before\_b \lor b\_before\_a \quad \text{OnlyEnforceIf}(x_a \land x_b) \quad \forall cid_a \ne cid_b$$

3. **Cascading Fallback Pipeline**:
   - **Pass 1**: Solves for all requested tasks.
   - **Critical-Only Check**: Verifies if the mandatory safety defect (`TASK-0001`) is schedulable on its own.
   - **Pass 2**: Drops LOW-priority tasks and solves for CRITICAL + HIGH + MEDIUM.
   - **Pass 3**: Drops MEDIUM-priority tasks and solves for CRITICAL + HIGH only.

---

### 4.3 S-R-C-A-O Priority Formula

Implemented in `backend/app/services/priority_service.py`:

$$\text{Priority Score} = 0.35 \cdot S + 0.25 \cdot R + 0.20 \cdot C + 0.10 \cdot A + 0.10 \cdot O$$

| Component | Weight | Deterministic Railway Evaluation Logic |
|---|---|---|
| **$S$: Severity** | 35% | Evaluates structural risk: 100 for derailment/fracture hazards; 80 for track geometry exceedances; 55 for medium planned repairs; 25 for routine upkeep. |
| **$R$: Escalation Risk** | 25% | Assesses defect propagation: 95 for rapid fatigue growth under dynamic axle loads; 78 for flaws likely to require emergency speed restrictions within 48h; 52 for stable defects; 22 for minor static items. |
| **$C$: Criticality** | 20% | Evaluates route importance: 95 for mainlines on trunk corridors (`CORR-01`, `CORR-02`); 85 for high-speed lines ($130\text{ km/h}$); 65 for standard lines; 35 for branch lines and loops. |
| **$A$: Age** | 10% | Quantifies elapsed time: 90 for overdue safety tasks; 70 for items accumulating cyclic fatigue; 50 for tasks within the standard maintenance window; 30 for newly logged defects. |
| **$O$: Opportunity** | 10% | Quantifies operational synergy: 85 if co-located with an existing corridor block or idle window; 65 for tasks sharing power isolation; 45 for standalone items. |

---

### 4.4 Machine Learning Predictive Pipeline

1. **Quantile Duration Regressor (`ml/duration.py`, `ml_pipeline/models.py`)**:
   Uses XGBoost with **pinball loss** for the 80th percentile ($\alpha = 0.80$):
   $$\mathcal{L}_\alpha(y, \hat{y}) = \max\left( \alpha (y - \hat{y}), \; (\alpha - 1)(y - \hat{y}) \right)$$
   $$\text{Duration} = \max\left( \text{round}(\hat{y}), \; 15\text{ minutes} \right)$$
   *Operational Purpose*: Predicting the mean ($\alpha = 0.50$) would cause roughly half of all maintenance tasks to exceed their allotted window. The $P_{80}$ estimate provides a conservative buffer against possession overruns.

2. **Escalation Risk Classifier (`ml/escalation.py`, `ml_pipeline/models.py`)**:
   Predicts the probability of defect escalation within 7 days using `XGBClassifier`:
   - Features: `track_age_years`, `gmt_since_renewal`, `defect_type_encoded`, `rail_wear_mm`, `rainfall_7d_mm`, `traffic_density_trains_per_day`, `defect_recurrence_count`, `days_since_last_inspection`.
   - Uses time-sliced validation splits (`shuffle=False`) to prevent temporal data leakage.
   - Calibrated using `CalibratedClassifierCV(method='isotonic')`.

3. **Low-Confidence Band & Fallbacks**:
   Predictions in the uncertain region ($0.40 \le p \le 0.60$) fall back to deterministic rule-based scores.
4. **SHAP Feature Importance**:
   Computed at inference time via `shap.TreeExplainer`; the top 3 contributing factors are saved in `top_risk_factors` for explainability.

---

## 5. Synthetic Testing Data & Verification Harness

### 5.1 Canonical Ground-Truth Datasets (`data/`)

1. **`bhopal_division_network.json`**:
   - Encodes GIS topology for 5 corridors in Bhopal Division, WCR:
     - `CORR-01`: Itarsi – Bhopal ($92.0\text{ km}$, Triple Line, $130\text{ km/h}$, $25\text{ kV AC}$).
     - `CORR-02`: Bhopal – Bina ($139.0\text{ km}$, Double Line, $130\text{ km/h}$, $25\text{ kV AC}$).
     - `CORR-03`: Bina – Guna ($119.0\text{ km}$, Single Line with crossing loops, $110\text{ km/h}$).
     - `CORR-04`: Guna – Gwalior ($227.0\text{ km}$, Single Line, $100\text{ km/h}$).
     - `CORR-05`: Maksi – Guna ($212.0\text{ km}$, Single Line, $110\text{ km/h}$).
   - Maps 76 locations and 25 stations with platform counts, loop lines, and sidings.

2. **`maintenance_rules.json`**:
   - Defines standard operating procedures for P-Way, TRD, and S&T:
     - Rail Renewal ($180\text{m}$), Tamping ($150\text{m}$), Deep Screening ($240\text{m}$), USFD Testing ($90\text{m}$).
     - OHE Periodic Maintenance ($120\text{m}$, requires $25\text{kV}$ isolation).
     - Point Machine Overhaul ($90\text{m}$), Track Circuit Testing ($60\text{m}$).
   - Specifies protection modes: `TRAFFIC_BLOCK`, `TRAFFIC_AND_POWER_ISOLATION`, `TRAFFIC_CAUTION`, `EMERGENCY_PROTECTION`.

3. **`timetables.json`**:
   - Timetable data derived from public IR schedules:
     - Shatabdi Express (`12001`/`12002`), Vande Bharat Express (`20171`/`20172`), Grand Trunk Express.
     - Freight paths: Container (`CONTAINER_FREIGHT`), Coal Hopper (`BOXN_COAL`), Petroleum Tankers (`BTPN_POL`).

---

### 5.2 Controlled Synthetic Task Generator (`scripts/generate_phase3_maintenance_data.py`)

Generates a deterministic dataset of **1,000 maintenance tasks** and 1,000 defects with `RANDOM_SEED = 26027`:

| Priority Tier | Task Count | Percentage | Operational Purpose |
|---|---|---|---|
| **CRITICAL (P1)** | 1 | 0.1% | Mandatory safety defect (`TASK-0001`). |
| **HIGH (P2)** | 15 | 1.5% | Urgent flaws (IMR rail cracks, OHE cantilever sag). |
| **MEDIUM (P3)** | 450 | 45.0% | Scheduled maintenance and preventative tamping. |
| **LOW (P4)** | 534 | 53.4% | Minor preventative upkeep and visual inspections. |
| **TOTAL** | **1,000** | **100.0%** | **100% grounded in WCR infrastructure.** |

- **Anchor Safety Task (`TASK-0001`)**:
  - Located on `CORR-01`, Section `SEC-CORR-01-NDPM-BNI`, `DOWN_MAIN` track at $\text{KM } 21.400$.
  - Defect: Severe transverse rail fracture with a $4\text{mm}$ gap on a $130\text{ km/h}$ trunk line.
  - Requires $90\text{ minutes}$ duration under `EMERGENCY_PROTECTION`. Used across tests to verify soft-mandatory constraints.

---

### 5.3 Adversarial Stress Testing Fixture (`backend/tests/test_adversarial.py`)

Stress-tests solver stability using an adversarial fixture designed to trigger potential timeouts or infeasibility crashes:
1. **Traffic Congestion**: 50 scheduled train movements over 16 hours on a single block section (`BS-101`), fragmenting available track time into short 6-minute windows.
2. **Maintenance Contention**: 50 maintenance requests all competing for `BS-101` in a 6-hour window ($00:00\text{--}06:00$). The 10 mandatory tasks require $450\text{ minutes}$ of possession—exceeding the entire $360\text{-minute}$ window.
3. **Crew Bottleneck**: All 50 tasks require `P-Way_gang` workers (4 per task) against a single shift capacity of 8.
4. **Verification Criteria**:
   - Solve completes within the **8.0-second wall-clock limit**.
   - Solver does not crash or return `INFEASIBLE`.
   - Returns status `FEASIBLE` or `OPTIMAL` with `mandatory_items_dropped > 0` flagged in KPIs.
   - Every deferred task receives a valid reason code (`NO_FEASIBLE_WINDOW`, `CREW_CAPACITY_EXCEEDED`, or `LOWER_PRIORITY`).

---

### 5.4 End-to-End DOM Geometry Verification (`tests/e2e_acceptance.spec.ts`)

Visual feasibility on the timeline is verified through automated browser testing using **Playwright**:
- Launches Chromium against the React dashboard displaying the adversarial schedule.
- Scrapes the bounding box geometries (`left`, `width`, `top`) of all rendered `.gantt_task_line` DOM elements.
- Groups tasks by their parent block-section lanes.
- **Mathematical DOM Invariant**: For any two tasks $A$ and $B$ sharing the same track lane:
  $$\text{Right}_A \le \text{Left}_B \quad \lor \quad \text{Right}_B \le \text{Left}_A$$
- Asserts **zero pixel overlaps**, confirming that CP-SAT's mathematical `NoOverlap` guarantee is rendered faithfully on screen. Captured in `artifacts/gantt_adversarial_stress_test.png`.

---

## 6. Key Verification Findings & Engineering Insights

1. **Test Environment Pathing**:
   The Python test suite in `backend/tests/` imports both `from app.*` and `from backend.app.*`. Running pytest requires setting the Python path to include both the root directory and the backend directory:
   ```powershell
   $env:PYTHONPATH="C:\Users\azial\Downloads\SIH26027;C:\Users\azial\Downloads\SIH26027\backend"
   .\backend\venv\Scripts\pytest.exe backend/tests/test_contracts.py backend/tests/test_solver.py
   ```

2. **Two API Mounting Paradigms**:
   - `backend/app/main.py` mounts the **Layer B relational API** (`/api/*`), which serves the 23-endpoint interface used by `frontend/src/services/api.ts` (e.g., `/api/blocks/optimize`, `/api/planning/priorities`).
   - `backend/app/solver/cp_sat_core.py` and `backend/app/planner/macro_planner.py` implement the standalone **Layer A execution engine**, which interfaces with `frontend/src/api/queries.ts` (calling `POST /plan` and `POST /override`).

3. **Mathematical Safety**:
   The engine implements the design principle: *ML predicts input coefficients ($R_i$, $d_i$), but only the symbolic CP-SAT solver determines schedule validity*. Track exclusivity is enforced combinatorially via `NoOverlap`, and shared resource capacity is constrained via `Cumulative`.
