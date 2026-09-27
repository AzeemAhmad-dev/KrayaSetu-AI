# PHASE_COA_HOME_FIXES_REPORT.md
## KrayaSetu AI — SIH 26027 | WCR Bhopal Division
### Investigation, Root Cause Diagnosis & Comprehensive Fixes for Operations Control Home & Block Planner

---

## Executive Summary

This session performed a deep, evidence-based investigation into four critical issues spanning UI layout, data presentation, database lifecycle, and CP-SAT solver behavior. No superficial patches were applied; each root cause was empirically diagnosed and verified before code modification.

| Issue | Diagnosis | Root Cause Found | Resolution |
|---|---|---|---|
| **Issue 1: BlockReasoningModal Clipped by Navbar** | Display / Layering bug | Navbar has `z-[60] h-16` (64px). Modals used `fixed inset-0 z-50` with centered flex layouts; viewport heights caused headers to render beneath Navbar (y: 0–64px). | Replaced `fixed inset-0 z-50` with `fixed top-16 inset-x-0 bottom-0 z-50` and constrained modal max-height to `calc(100vh - 6rem)` across **9 components** in the codebase. |
| **Issue 2: Priority Queue Silently Truncated at 15 of 64** | Frontend Display bug | Hardcoded `.slice(0, 15)` applied to `filteredTasks` without scrollbar, pagination, or "Showing X of Y" indicators. | Removed hardcoded slice, introduced a scrollable container (`max-h-[580px] overflow-y-auto`) with sticky `thead` (`sticky top-0 z-10`), added an explicit `Showing {displayedTasks.length} of {filteredTasks.length} Tasks ({total} Total Evaluated)` badge, and provided an interactive "Collapse to Top 15" / "View All" toggle button. |
| **Issue 3: Discrepancy between 64 Tasks and 50 Blocks** | Architectural / Domain Design Invariant | **Intentional Domain Feature**: A single maintenance block can bundle multiple departmental tasks. The 50 canonical blocks contain exactly 64 maintenance tasks (3 Ruling + 33 Planned + 5 Emergent + 23 in 9 Shadow blocks). Regeneration cleanly calls atomic `db.delete()` with **zero row accumulation**. | Empirically verified via direct SQLite queries and successive regenerations with seeds 123 and 456. Row counts remained strictly locked at 50 blocks and 64 tasks. Created visual database audit report card. |
| **Issue 4: CP-SAT Solver Stuck on INFEASIBLE** | Leftover Client-Side Demo State | **Client-side simulation artifact**: Phase 5 test URLs had injected `?simStatus=INFEASIBLE`. `effectiveOptResult = simulatedOptResult \|\| optResult` permanently overrode live solver data. The real backend solver is 100% operational and proves `OPTIMAL` across all corridors. | Auto-cleared `simStatus`/`simDropped` via `setSearchParams` upon running the real optimizer or regenerating blocks. Added a prominent, unmistakable **SIMULATION DEMO ACTIVE** banner when simulation params are present, and added a dedicated `● LIVE SOLVER` toggle button in the simulator strip. |

---

## Issue 1: BlockReasoningModal & Codebase-Wide Overlay Clipping

### 1. Root Cause Diagnosis
- In `Navbar.tsx`, the top navigation bar is `sticky top-0 z-[60] h-16` (64px height).
- Modals across the application used `fixed inset-0 z-50 flex items-center justify-center p-4`.
- Because `z-50` is lower than `z-[60]`, the Navbar floats on top of the modal overlay.
- When viewport height is 800px or when inner modals have `max-h-[90vh]`, vertical centering positions the top of the dialog at ~40px from the screen top. The Navbar covers 0px to 64px, entirely concealing the modal header, title, and close button.

### 2. Systematic Codebase Audit & Files Corrected
A search across all `frontend/src` components identified 9 files utilizing `fixed inset-0 z-50` for overlays and modals. All 9 were corrected to start below the Navbar (`fixed top-16 inset-x-0 bottom-0 z-50`) with height bounded to `max-h-[calc(100vh-6rem)]`:

1. **`frontend/src/components/blocks/BlockReasoningModal.tsx`** (Line 132)
   - Changed: `fixed inset-0 z-50` → `fixed top-16 inset-x-0 bottom-0 z-50`, `max-h-[90vh]` → `max-h-[calc(100vh-6rem)]`
2. **`frontend/src/components/station/StationSelectionModal.tsx`** (Line 42)
   - Changed: `fixed inset-0 z-50` → `fixed top-16 inset-x-0 bottom-0 z-50`, `max-h-[90vh]` → `max-h-[calc(100vh-6rem)]`
3. **`frontend/src/pages/BlockPlannerPage.tsx`** (Lines 1713 & 1898)
   - Multi-Department Coordination Dossier Modal: `top-16 inset-x-0 bottom-0 z-50`
   - Deferred Tasks Inspection Modal: `top-16 inset-x-0 bottom-0 z-50`
4. **`frontend/src/pages/MaintenancePage.tsx`** (Line 299)
   - Log Observation Modal: `fixed top-16 inset-x-0 bottom-0 z-50`, `max-h-[calc(100vh-6rem)]`
5. **`frontend/src/components/corridor/CorridorBlockManagement.tsx`** (Lines 1243, 1484, 1579, 1773, 1898)
   - Create New Block Modal, Edit Block Modal, Raise Issue Modal, Block Details Drawer, Issue Details Drawer
6. **`frontend/src/components/department/DepartmentProblemSection.tsx`** (Lines 458 & 612)
   - Log Issue Modal, Problem Details Drawer
7. **`frontend/src/components/department/DepartmentTaskSection.tsx`** (Line 371)
   - Task Details & 7-Step Workflow Drawer
8. **`frontend/src/components/network/CoaBlockManagement.tsx`** (Line 620)
   - Propose Central Block Modal
9. **`frontend/src/components/station/StationControlTab.tsx`** (Lines 821, 1026, 1101)
   - Submit Block Request Modal, Inspect Request Drawer, Inspect Block Drawer

---

## Issue 2: Operational Priority Queue Truncation

### 1. Diagnostic Findings
- In `frontend/src/pages/DivisionalOperationsControl.tsx`, line 524 previously executed:
  ```tsx
  {filteredTasks.slice(0, 15).map((task: any, idx: number) => { ... })}
  ```
- **Order of operations**: The slice was applied **after** the tier filter (`priorityTasks.filter(...)`), but restricted any tier to at most 15 items.
- In `ALL` tier (64 tasks), items #16 through #64 were silently dropped from the DOM with zero scrollbar, no pagination, and no indicator that 49 tasks were hidden.

### 2. Resolution Implemented
1. Added state `const [showAllTasks, setShowAllTasks] = useState(true);`
2. Defined `displayedTasks = showAllTasks ? filteredTasks : filteredTasks.slice(0, 15);`
3. Table placed in a contained scroll viewport: `<div className="overflow-x-auto max-h-[580px] overflow-y-auto">`
4. Added sticky table headers: `<thead className="sticky top-0 z-10 shadow-2xs">`
5. Updated section header with explicit attribution badge and interactive view toggle:
   - `Showing {displayedTasks.length} of {filteredTasks.length} Tasks ({dashSummary?.tasks_analyzed ?? priorityTasks.length} Total Evaluated)`
   - Button: `Collapse to Top 15` / `View All ({filteredTasks.length}) →`

---

## Issue 3: Investigation of 64 Tasks vs 50 Blocks Discrepancy

### 1. Empirical Verification & Architectural Truth
Tasks and blocks are **legitimately different counts by design** due to KrayaSetu AI's multi-department shadow bundling engine.
- A **Block** represents an allocated track possession window.
- A **Task** represents a specific maintenance work order submitted by P-Way, TRD, or S&T.
- The 50 Canonical Blocks decompose as follows:
  - **3 RULING Blocks**: 3 tasks (1:1 ratio)
  - **33 PLANNED Blocks**: 33 tasks (1:1 ratio)
  - **5 EMERGENT Blocks**: 5 tasks (1:1 ratio)
  - **9 SHADOW Blocks**: **23 bundled tasks** across 5 tri-department possessions (15 tasks) and 4 dual-department possessions (8 tasks).
  - Total: $3 + 33 + 5 + 23 = \mathbf{64\text{ tasks}}$.

### 2. Database Lifecycle & Regeneration Idempotency
Direct query of the SQLite database via SQLAlchemy confirms:
```
Blocks count: 50
Tasks count: 64
Fault observations count: 64
Blocks by type: Counter({'PLANNED': 33, 'SHADOW': 9, 'EMERGENT': 5, 'RULING': 3})
Tasks by priority: Counter({'MEDIUM': 28, 'HIGH': 18, 'LOW': 13, 'CRITICAL': 5})
Tasks linked with block_id: 64 (100% foreign key validity, 0 orphans)
```
- In `scripts/populate_four_block_dataset.py`, lines 1192-1201 execute:
  ```python
  db.query(Block).delete()
  db.query(MaintenanceTask).delete()
  db.query(FaultObservation).delete()
  db.bulk_save_objects(faults)
  db.bulk_save_objects(tasks)
  db.bulk_save_objects(blocks)
  db.commit()
  ```
- Two consecutive regenerations were run with different seeds (`seed=123` and `seed=456`).
- **Result**: Row count after regeneration 1: 50 blocks, 64 tasks. Row count after regeneration 2: 50 blocks, 64 tasks.
- **Conclusion**: There is **zero row accumulation**. The data is clean, intentional, and strictly conforms to SIH 26027 requirements.

---

## Issue 4: CP-SAT Solver Status & Simulator Artifact Diagnosis

### 1. Root Cause Analysis
- The persistent `Solver Status: INFEASIBLE` was **100% a leftover client-side simulation URL query parameter** (`?simStatus=INFEASIBLE`), introduced in Phase 5 to capture visual proofs of solver honesty states.
- In `BlockPlannerPage.tsx`:
  - `effectiveOptResult = simulatedOptResult || optResult;`
  - When `simStatus=INFEASIBLE` was in the URL, `simulatedOptResult` returned a mock object containing `status: "INFEASIBLE"`, 0 scheduled tasks, 12 deferred tasks, and 4 train conflicts.
  - Clicking "Run CP-SAT Optimizer" or "Regenerate 50 Blocks" updated React state (`optResult`) but **failed to clear the URL query parameter**.
  - Because `simulatedOptResult` took precedence over `optResult`, the real solver output was completely masked.
  - Furthermore, `window.history.replaceState` was being used instead of React Router's `setSearchParams`, preventing React from reacting to URL updates cleanly.

### 2. Live Backend Solver Verification
The real Google OR-Tools CP-SAT optimizer in `backend/app/services/optimizer.py` was invoked directly across all corridors with zero simulation overrides. Results:
- **CORR-01 (Itarsi–Bhopal)**: `OPTIMAL_SCHEDULE_FOUND` (Solver: `Google OR-Tools CP-SAT`, `solver_status: 'OPTIMAL'`, 10 scheduled, 3 deferred, 0.84s)
- **CORR-02 (Bhopal–Bina)**: `OPTIMAL_SCHEDULE_FOUND` (Status: `OPTIMAL`)
- **CORR-03 (Khandwa–Itarsi)**: `OPTIMAL_SCHEDULE_FOUND` (Status: `OPTIMAL`)
- **CORR-04 (Bina–Guna)**: `OPTIMAL_SCHEDULE_FOUND` (Status: `OPTIMAL`)
- **CORR-05 (Guna–Gwalior)**: `OPTIMAL_SCHEDULE_FOUND` (Status: `OPTIMAL`)
- **Division-Wide (All Corridors)**: `OPTIMAL_SCHEDULE_FOUND` (Status: `OPTIMAL`, 15 scheduled, 35 deferred, 9.48s)

### 3. Fixes Applied in BlockPlannerPage.tsx
1. In `handleRunOptimizer`: Automatically clears `simStatus` and `simDropped` via `setSearchParams(next)` so live solver results are immediately displayed.
2. In `handleRegenerateCanonical`: Automatically clears `simStatus` and `simDropped` so regenerated data is immediately active.
3. Updated `useSearchParams` hook to `const [searchParams, setSearchParams] = useSearchParams();` and replaced all instances of `window.history.replaceState` with `setSearchParams(next)`.
4. Added prominent **SIMULATED DEMO STATE ACTIVE** warning banner:
   - Clearly flags simulated output: `SIMULATED — NOT REAL SOLVER RUN`.
   - Includes one-click action: `Exit Simulation & Run Live CP-SAT →`.
5. Added `● LIVE SOLVER` button to the Simulator Strip to toggle back to real data instantly.

---

## Verification & Artifacts

### 1. Frontend Build Output
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 2047 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.94 kB │ gzip:   0.52 kB
dist/assets/logo-CRickKxn.jpg      75.41 kB
dist/assets/index-DXZ4b8df.css    136.19 kB │ gzip:  20.95 kB
dist/assets/index-D-DeRFUN.js   1,347.74 kB │ gzip: 312.65 kB
✓ built in 4.93s
```

### 2. Backend Test Output
```
================== 89 passed, 3 warnings in 72.81s (0:01:12) ==================
```

### 3. Screenshot Inventory (`phase_coa_fixes_screenshots/`)
1. **`01_priority_queue_all_tasks.png`**: Operations Control Home showing Operational Priority Queue with `Showing 64 of 64 Tasks (64 Total Evaluated)`, `Collapse to Top 15` toggle, and contained scrollable table.
2. **`02_block_reasoning_modal_visible.png`**: `BlockReasoningModal` opened via "Why this task?", with its title header, EXPLAINABLE AI badge, target ID, and close (X) button cleanly visible below the Navbar.
3. **`03_cpsat_solver_optimal_run.png`**: Live CP-SAT solver run producing `OPTIMAL PLAN CONFIRMED (MATHEMATICALLY PROVEN)` with `0 Headway Violations`, `15 Scheduled`, `35 Deferred`, and `Solver Status: OPTIMAL`.
4. **`04_simulator_banner_infeasible.png`**: Clear simulation disclaimer banner displayed when `?simStatus=INFEASIBLE` is selected, explicitly distinguishing mock data from real solver runs.
5. **`05_exited_simulation_live_optimal.png`**: Seamless transition back to live CP-SAT data via `● LIVE SOLVER`.
6. **`06_database_counts_proof.png`**: Direct SQLite database audit card proving exactly 50 blocks, 64 tasks, 0 orphans, and 100% FK validity.

---

---

## Issue 5: Priority Tier Dashboard Counts Harmonized with S-R-C-A-O Intelligence

### 1. Root Cause Diagnosis
- In `frontend/src/pages/DivisionalOperationsControl.tsx`, the KPI summary cards previously rendered:
  ```tsx
  {dashSummary?.priority_distribution?.CRITICAL ?? priorityTasks.filter((t: any) => t.priority_tier === "CRITICAL").length}
  ```
- Because `dashSummary?.priority_distribution` was defined, it was always prioritized.
- However, `backend/app/routers/planning.py` (`get_planning_dashboard_summary`) had been computing `priority_distribution` by directly querying the database column `MaintenanceTask.priority` (which held unranked, pre-eval defaults: 5 CRITICAL, 18 HIGH, 28 MEDIUM, 13 LOW).
- In contrast, the Operational Priority Queue table fetched its data from `/planning/priorities`, which executed `priority_engine.evaluate_all_tasks(db)`. This continuous S-R-C-A-O weighting (0.35·Severity + 0.25·EscalationRisk + 0.20·Criticality + 0.10·Age + 0.10·Opportunity) assigns the dynamic `priority_tier` field (`CRITICAL` for $\ge 90$, `HIGH` for $70-89.9$, `MEDIUM` for $45-69.9$, `LOW` for $< 45$).
- In addition, the seed generator in `populate_four_block_dataset.py` had generated numeric scores for planned low tasks using the broad `PLANNED` range ($35-75$), causing tasks labeled `LOW` to score above 45.0 and land in `MEDIUM` tier.

### 2. Full-Stack Harmonization Implemented
1. **Frontend (`frontend/src/pages/DivisionalOperationsControl.tsx`)**:
   - Derived all priority tier metrics directly from the live `priorityTasks` array:
     ```tsx
     const criticalCount = priorityTasks.filter((t: any) => t.priority_tier === "CRITICAL").length;
     const highCount = priorityTasks.filter((t: any) => t.priority_tier === "HIGH").length;
     const mediumCount = priorityTasks.filter((t: any) => t.priority_tier === "MEDIUM").length;
     const lowCount = priorityTasks.filter((t: any) => t.priority_tier === "LOW").length;
     const totalEvaluatedCount = priorityTasks.length > 0 ? priorityTasks.length : (dashSummary?.tasks_analyzed ?? 0);
     ```
   - Bound KPI cards directly to these live derived values with click-to-filter capability and active outline badges.
   - Enhanced the filter tab buttons (`ALL (64)`, `CRITICAL (5)`, `HIGH (18)`, `MEDIUM (28)`, `LOW (13)`) so every badge, filter button, and rendered table count derives from the exact same single source of truth.
2. **Backend Router (`backend/app/routers/planning.py`)**:
   - Updated `get_planning_dashboard_summary()` to evaluate tasks using `priority_engine.evaluate_all_tasks(db)`.
   - Guaranteed that both `/planning/dashboard-summary` and `/planning/priorities` emit identical priority distribution counts.
3. **Canonical Generator (`scripts/populate_four_block_dataset.py`)**:
   - Enhanced `SRCAO_RANGES` with tier-specific bounds (`EMERGENT`/`CRITICAL`: 94–99, `HIGH`: 72–88, `MEDIUM`: 48–68, `LOW`: 20–38).
   - Passed `priority_tier` into `generate_srcao_factors()`.
   - Verified that all 64 tasks have 100% mathematical parity:
     - `DB MaintenanceTask.priority`: `{'CRITICAL': 5, 'HIGH': 18, 'MEDIUM': 28, 'LOW': 13}`
     - `Evaluated priority_tier`: `{'CRITICAL': 5, 'HIGH': 18, 'MEDIUM': 28, 'LOW': 13}`
     - Mismatches: **0 out of 64**.

---

## Issue 6: 24-Hour Operational Horizon (Elimination of Hardcoded 08:00–20:00 Window)

### 1. Domain Reality & Problem
Indian Railways track possessions operate round-the-clock (24/7). Major corridor possessions (especially for TRD 25kV power cutdowns and mechanized P-Way tamping) are predominantly scheduled during nocturnal traffic lulls (00:30–04:30) or late-night freight gaps (21:30–23:45) to protect daytime passenger punctuality. Prototype code had artificially restricted the default intraday scheduling horizon to `08:00`–`20:00`.

### 2. Systematic Codebase Updates
1. **Time Validation (`backend/app/services/time_validation.py`)**:
   - Updated `compute_future_planning_horizon()` default parameters:
     - `requested_start: str = "00:00"` (was `"08:00"`)
     - `requested_end: str = "23:59"` (was `"20:00"`)
   - Preserved all safety-horizon buffer logic: past times on the current date automatically roll forward to `current_time + 15m prep buffer` rounded to the nearest 15-minute mark, or roll over to tomorrow if cannot fit before 23:59.
2. **CP-SAT Optimizer (`backend/app/services/optimizer.py`)**:
   - Updated `optimize_blocks()` default parameters:
     - `window_start_str: str = "00:00"` (was `"08:00"`)
     - `window_end_str: str = "23:59"` (was `"20:00"`)
   - Updated mitigation copy: `"Schedule in tomorrow's maintenance corridor window (00:00 - 23:59)."`.
3. **Blocks Router (`backend/app/routers/blocks.py`)**:
   - Updated `/api/blocks/optimize` defaults for `window_start` / `window_end` to `"00:00"` and `"23:59"`.
   - Updated deferred task fallback and mitigation copy to 24-hour horizon.
4. **Explanation Service (`backend/app/services/explanation_service.py`)**:
   - Updated `WINDOW_CAPACITY_EXCEEDED` mitigation recommendation from `(08:00 - 20:00)` to `(00:00 - 23:59)`.
5. **Canonical Dataset Generator (`scripts/populate_four_block_dataset.py`)**:
   - Slotted the 33 planned blocks across 13 round-the-clock Indian Railways possession windows:
     `00:30`, `02:00`, `03:45`, `05:30`, `07:30`, `09:30`, `11:30`, `13:30`, `15:30`, `17:30`, `19:30`, `21:30`, `22:45`.
   - Updated Shadow blocks `BLOCK-SHD-001` (`01:30–04:00`), `BLOCK-SHD-005` (`21:30–23:45`), and `BLOCK-SHD-008` (`02:00–04:00`) to nocturnal joint possessions.
   - 31 of 50 blocks now execute outside the 08:00–20:00 window across the 24-hour operational day.
6. **Frontend UI Copy (`frontend/src/GanttDashboard.tsx` & `frontend/src/pages/BlockPlannerPage.tsx`)**:
   - Updated Timeline Planning Horizon label in `GanttDashboard.tsx`:
     `(00:00 – 23:59 24-Hour Operational Horizon)` (was `(08:00 – 20:00 Regular Day / Night Possession Horizon)`).
   - Updated `BlockPlannerPage.tsx` optimizer call to pass `"00:00"` and `"23:59"`.
   - Verified that the Gantt chart timetable spans all 24 hours (`00:00` to `23:00`).

---

## Verification & Artifacts

### 1. Frontend Build Output (`npm.cmd run build`)
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 2047 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.94 kB │ gzip:   0.52 kB
dist/assets/logo-CRickKxn.jpg      75.41 kB
dist/assets/index-B17sBuRG.css    136.23 kB │ gzip:  20.97 kB
dist/assets/index-DURGavAD.js   1,349.72 kB │ gzip: 313.02 kB
✓ built in 3.12s
```

### 2. Backend Test Output (`pytest backend/tests`)
```
============================== test session starts ==============================
collected 89 items

backend/tests/test_canonical_synchronization.py .......                  [  7%]
backend/tests/test_contracts.py .........                               [ 17%]
backend/tests/test_cpsat_proposal_lifecycle.py ......................... [ 46%]
backend/tests/test_datetime_aware_scheduling_and_marey_multiday.py .... [ 50%]
backend/tests/test_master_fixes.py .................................... [ 91%]
backend/tests/test_production_baseline_verification.py ........         [100%]

======================== 89 passed, 3 warnings in 60.17s ========================
```

### 3. Screenshot Inventory (`phase_coa_fixes_screenshots/`)
1. **`01_priority_badges_and_queue.png`**: Operations Control Home showing all 5 KPI cards harmonized with the Operational Priority Queue (`Tasks Analyzed: 64`, `Critical Tier: 5`, `High Tier: 18`, `Medium Tier: 28`, `Low Tier: 13`), filter tabs matching (`ALL 64`, `CRITICAL 5`, `HIGH 18`, `MEDIUM 28`, `LOW 13`), and queue header displaying `Showing 64 of 64 Tasks (64 Total Evaluated)`.
2. **`02_tier_filter_critical.png`**: Filtered by `CRITICAL` tier — card outline highlights active filter, and table displays exactly the 5 Critical tasks (`Showing 5 of 5 Tasks (64 Total Evaluated)`).
3. **`03_tier_filter_low.png`**: Filtered by `LOW` tier — card outline highlights active filter, and table displays exactly the 13 Low upkeep tasks (`Showing 13 of 13 Tasks (64 Total Evaluated)`).
4. **`04_block_planner_24h_horizon.png`**: Block Planner with banner `CORRIDOR MAINTENANCE & RESOURCE POSSESSION TIMELINE (00:00 – 23:59 24-Hour Operational Horizon)`, Gantt timeline starting from `00:00`, and round-the-clock possession bars.
5. **`05_marey_diagram_24h_blocks.png`**: Indian Railways 24-Hour Marey diagram showing round-the-clock train paths and maintenance block slots from `MIDNIGHT 1 AM ... 11 PM MIDNIGHT`.

---

## Conclusion

All tier badge counts, filter tab numbers, database columns, and S-R-C-A-O evaluated scores are 100% harmonized with zero discrepancies. The 24-hour round-the-clock operational possession window (`00:00`–`23:59`) is fully operational across backend services, CP-SAT solver, canonical dataset generator, and frontend visualizations. All 89 backend tests pass, the TypeScript frontend build is 100% clean, and visual verification proofs have been captured.

