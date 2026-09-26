# SIH26027 — Problem Statement Gap Analysis Report

**Project**: AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways  
**Repository**: `c:\Users\azial\Downloads\SIH26027`  
**Date**: September 26, 2026  
**Type**: Read-Only Architecture & Implementation Audit  

---

## Executive Summary

This report evaluates the merged **SIH26027** codebase against the official Ministry of Railways Problem Statement **SIH26027** ("AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways"). 

The codebase possesses strong mathematical scheduling foundations (Google OR-Tools CP-SAT, S-R-C-A-O multi-factor prioritization, multi-department candidate bundling heuristics, and real West Central Railway timetable infrastructure). However, there are notable feature gaps against specific requirements called out in the problem statement analysis—most critically the **independent department-by-department baseline comparison**, explicit **asset downtime saved metric calculation**, and the frontend integration of **longer-range weekly/monthly horizon planning**.

---

## Audit Checklist & Gap Analysis

### 1. WEEKLY & MONTHLY HORIZON PLANS
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Plain-English Explanation**:  
A multi-day macro bucket planning engine exists in `backend/app/planner/macro_planner.py` (`macro_bucket_plan`), which is exposed via the backend endpoint `POST /macro-plan` in `backend/app/main.py`. This engine takes a `ScheduleRequest`, calculates `horizon_days = max(1, horizon_minutes // 1440)`, and uses a First-Fit-Decreasing (FFD) algorithm with SLA-urgency boosting to allocate maintenance work across days while respecting daily crew, plant, and corridor possession hours. Furthermore, the database contains a `planned_activities` table (`backend/app/models/maintenance.py`) with a `cadence` column (`CURRENT`, `WEEKLY`, `MONTHLY`) that is displayed on the corridor and departmental task screens. However, **`POST /macro-plan` is completely disconnected from the React frontend UI**—no page, button, or calendar view calls it or visualizes long-range schedules. The active optimizer in the UI (`backend/app/services/optimizer.py` via `POST /api/blocks/optimize`) operates strictly within single-day intraday time boundaries (e.g. 08:00 to 20:00), meaning distinct weekly-horizon and monthly-horizon block schedules cannot currently be generated or interacted with from the user interface.

* **Key Files Found**: `backend/app/planner/macro_planner.py`, `backend/app/main.py` (line 71), `backend/app/models/maintenance.py` (`PlannedActivity.cadence`), `frontend/src/components/corridor/CorridorBlockManagement.tsx`.

---

### 2. DEPARTMENT-BASELINE COMPARISON
**Status**: ❌ **NOT IMPLEMENTED**

**Plain-English Explanation**:  
There is **no screen, endpoint, or report anywhere in the codebase** that compares "how each department (P.Way, TRD, S&T) would plan their maintenance independently" against "what the optimizer produced." The Joint Coordination Desk (`frontend/src/pages/CoordinationPage.tsx`) shows multi-department blocks and displays associated tasks under each block, and `explanation_service.py` returns an ad-hoc string for candidate blocks (`"Bundling saves approximately X minutes of cumulative corridor closure"`), but neither the backend nor the frontend implements an independent baseline simulation. The single most persuasive demo element explicitly named in the problem statement analysis—*"Show the same week of maintenance demand planned independently by three departments versus planned by the optimiser, with the section closure hours and the resulting train path impact quantified side by side"*—is entirely absent.

* **Key Files Found**: `frontend/src/pages/CoordinationPage.tsx`, `backend/app/services/explanation_service.py` (line 207).

---

### 3. MULTI-DEPARTMENT CO-LOCATION
**Status**: ✅ **FULLY IMPLEMENTED**

**Plain-English Explanation**:  
The codebase contains explicit, dedicated algorithms to bundle and co-locate tasks from different departments (Civil Engineering/P.Way, Electrical/TRD, and Signalling/S&T) into the same shared possession window. In `backend/app/services/candidate_generator.py`, the `check_task_compatibility()` function evaluates tasks across departments: it checks spatial proximity within a 12 km threshold on the same or adjacent block sections, permits joint track occupancy when 25kV power isolation is required, and adds a 15-minute buffer specifically for inter-department safety handovers when tasks come from different departments (`if task1.department_id != task2.department_id: est_duration += 15`). In the CP-SAT optimizer (`backend/app/services/optimizer.py`, lines 449–460), tasks bundled into the same candidate block (`cid_a == cid_b`) are explicitly exempt from the pairwise track exclusivity constraint, allowing concurrent possession. Finally, the database models and canonical dataset include `block_type = "SHADOW"`, which bundles up to 4 tasks from P-Way, TRD, and S&T under single traffic and power possessions (9 Shadow blocks containing 23 cross-department tasks are actively seeded in `krayasetu.db`).

* **Key Files Found**: `backend/app/services/candidate_generator.py` (lines 107–287), `backend/app/services/optimizer.py` (lines 383–401, 449–460), `scripts/populate_four_block_dataset.py`, `backend/app/models/maintenance.py`.

---

### 4. DOWNTIME-SAVED METRIC
**Status**: ❌ **NOT IMPLEMENTED**

**Plain-English Explanation**:  
There is **no calculated or displayed metric representing "total asset downtime saved"** as an explicit system output. In `backend/app/services/explanation_service.py` (line 207), an isolated heuristic string is generated for single candidate bundles (`"operational_savings_summary": f"Bundling saves approximately {max(0, (len(tasks)-1)*45)} minutes of cumulative corridor closure"`), but this is not an aggregated system metric. In both CP-SAT solvers (`backend/app/services/optimizer.py` and `backend/app/solver/cp_sat_core.py`), the objective functions maximize scheduled task priority weights ($\sum P_i \cdot x_i$) and minimize passenger train delay/conflict penalties ($\sum \text{shift}_t$). Neither solver computes asset downtime saved against an uncoordinated baseline, and no KPI strip, dashboard tile, or export report displays total asset hours saved to the user.

* **Key Files Found**: `backend/app/services/explanation_service.py` (line 207), `backend/app/services/optimizer.py` (lines 516–518, 693–713), `backend/app/solver/cp_sat_core.py` (lines 388–394).

---

### 5. DATA SOURCE TRANSPARENCY
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Plain-English Explanation**:  
The backend and data contracts distinguish real versus synthetic data at the schema and documentation level, but **fail to disclose this to the judge in the user interface**. In `backend/app/models/trains.py`, passenger trains are tagged with `source_type="REAL_PUBLIC"`, while freight trains and maintenance tasks in `backend/app/models/maintenance.py` are tagged with `source_type="SYNTHETIC"`. The API health check returns `"provenance_enforced": True`. Comprehensive documentation (`SIH26027_Master_Spec_v3.md` and `SIH26027_Architecture_Analysis.md`) explains that TMS/SMMS/TDMS are internal Indian Railways applications without public APIs requiring synthetic defect generation based on IR maintenance norms. However, on the frontend, `frontend/src/components/common/ProvenanceBadge.tsx` is an empty stub that returns `null` (`return null;`), and there is no judge-facing modal, banner, or tooltip explaining which data is live/real versus synthesized.

* **Key Files Found**: `backend/app/models/trains.py` (`Train.source_type`), `backend/app/models/maintenance.py` (`MaintenanceTask.source_type`), `frontend/src/components/common/ProvenanceBadge.tsx`, `SIH26027_Master_Spec_v3.md` (Part 2).

---

### 6. TIMETABLE REALISM
**Status**: ✅ **FULLY IMPLEMENTED**

**Plain-English Explanation**:  
The train timetable data is directly modeled on **real, published Indian Railways passenger services** operating along the West Central Railway (Bhopal Division, Bina Jn – Bhopal Jn – Itarsi Jn corridor). In `krayasetu.db`, the `trains` and `train_schedules` tables contain real express and premium trains with their authentic 5-digit train numbers, official names, origins, destinations, and published halt timings across Bhopal Division stations (e.g. 12002/12001 New Delhi – Rani Kamalapati Shatabdi Express, 20171/20172 Rani Kamalapati – Hazrat Nizamuddin Vande Bharat Express, 12615/12616 Grand Trunk Express, 12137 Punjab Mail, 18237 Chhattisgarh Express). In `backend/app/routers/railway.py`, `CORRIDOR_TRAINS_METADATA` defines 39 realistic corridor trains spanning a complete 24-hour cycle (00:00 to 24:00) with precise chainages (0.0 to 231.0 km) across 27 corridor stations, realistic operating speeds (75–80 km/h), real passenger halts (Bina, Ganj Basoda, Vidisha, Bhopal Jn, Rani Kamalapati, Narmadapuram, Itarsi), and realistic freight rake paths (BOXN coal rakes, BTPN petroleum tankers, container freight).

* **Key Files Found**: `krayasetu.db` (`trains`, `train_schedules`), `backend/app/routers/railway.py` (`CORRIDOR_TRAINS_METADATA`, `BHOPAL_STATIONS`), `backend/app/models/trains.py`.

---

### 7. CONSTRAINT COVERAGE
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Plain-English Explanation**:  
Constraint implementation is divided across the two solver modules in the repository:
- **Work Duration**: **Enforced**. Implemented in both `backend/app/services/optimizer.py` and `backend/app/solver/cp_sat_core.py` using CP-SAT interval variables where $start + duration = end$, with duration fitting within the requested window span.
- **Section/Track Conflicts**: **Enforced**. Implemented in both optimizers. `optimizer.py` enforces track exclusivity per section via reified boolean constraints (`a_before_b` or `b_before_a`), enforces 25kV power isolation domain exclusivity, and penalizes overlaps with train paths using a 15-minute safety buffer. `cp_sat_core.py` enforces section exclusivity via `model.AddNoOverlap(by_block[b])`.
- **Crew Conflicts**: **Partially Implemented**. In `backend/app/solver/cp_sat_core.py`, crew capacity is modeled via `model.AddCumulative(...)` over shift capacities. However, in `backend/app/services/optimizer.py` (the active optimizer connected to the database and frontend), crew gang constraints are **not** present; only heavy machinery exclusivity is modeled.
- **Minimum Block Duration**: **Partially Implemented**. A 15-minute floor (`MIN_POSSESSION_MINUTES = 15`) is enforced in the ML predictive pipeline (`backend/app/ml/duration.py`), but is not modeled as a mathematical constraint directly inside the CP-SAT formulations.
- **Caution Order Implications**: **NOT Implemented**. While the database includes an `operational_restrictions` table (Temporary Speed Restrictions / TSRs), the optimizers do **not** calculate train speed reductions, deceleration delays, or timetable stretch resulting from caution orders. In `optimizer.py`, caution orders are only mentioned as static text recommendations for human controllers.

* **Key Files Found**: `backend/app/services/optimizer.py`, `backend/app/solver/cp_sat_core.py`, `backend/app/ml/duration.py`, `backend/app/models/maintenance.py` (`OperationalRestriction`).

---

## Summary Scorecard

| # | Requirement Area | Status | Primary Location in Codebase |
|---|---|:---:|---|
| **1** | Weekly & Monthly Horizon Plans | ⚠️ PARTIAL | `backend/app/planner/macro_planner.py` (Backend only; missing UI integration) |
| **2** | Department-Baseline Comparison | ❌ NOT IMPLEMENTED | Absent (No independent baseline simulation or comparison view) |
| **3** | Multi-Department Co-Location | ✅ FULLY IMPLEMENTED | `candidate_generator.py`, `optimizer.py`, `populate_four_block_dataset.py` |
| **4** | Downtime-Saved Metric | ❌ NOT IMPLEMENTED | Absent (Only isolated text string in `explanation_service.py`) |
| **5** | Data Source Transparency | ⚠️ PARTIAL | Schema tags (`source_type`); UI badge (`ProvenanceBadge.tsx`) is a `null` stub |
| **6** | Timetable Realism | ✅ FULLY IMPLEMENTED | `krayasetu.db` (Shatabdi, Vande Bharat), `railway.py` (39 corridor trains) |
| **7** | Constraint Coverage | ⚠️ PARTIAL | Duration & Track enforced; Crew partial; Caution orders unmodeled |

---

## Prioritized Next Steps to Maximize SIH Score

If developing further to directly target the evaluation criteria of Problem Statement SIH26027, the following four items represent the highest score return:

1. **Build the Side-by-Side "Department Baseline vs. Optimizer" Comparison View** *(Highest Impact)*:
   - Implement the demo element highlighted in the analysis: simulate maintenance demand scheduled independently by P.Way, TRD, and S&T (uncoordinated closures where each department takes its own track possession).
   - Display a side-by-side comparison screen contrasting:
     - **Independent Baseline**: Total closure hours (e.g. $4\text{h} + 3\text{h} + 2\text{h} = 9\text{ hours}$), high passenger train delay minutes.
     - **KrayaSetu AI Co-located Plan**: Bundled shared closure hours (e.g. $4.5\text{ hours}$ total closure), minimal train delay.
     - Side-by-side delta cards showing **Closure Hours Saved** and **Train Paths Preserved**.

2. **Calculate and Display the "Total Asset Downtime Saved" Metric**:
   - Explicitly compute:
     $$\text{Asset Downtime Saved (Hours)} = \sum_{\text{tasks}} \text{Single-Task Duration} - \sum_{\text{blocks}} \text{Optimized Possession Duration}$$
   - Surface this number as a headline KPI tile on the Executive Dashboard, Coordination Desk, and Block Planner.

3. **Expose the Macro Weekly & Monthly Horizon Planner in the UI**:
   - Connect the existing `POST /macro-plan` endpoint (`backend/app/planner/macro_planner.py`) to a frontend toggle (e.g. "24h Shift Plan", "7-Day Weekly Horizon", "30-Day Monthly Backlog").
   - Allow users to see maintenance packages slotted across calendar days before drilling down into intraday CP-SAT execution.

4. **Activate the Judge-Facing Data Transparency Badge**:
   - Update `frontend/src/components/common/ProvenanceBadge.tsx` from `return null;` to render distinct badges (e.g. `[REAL NTES TIMETABLE]` in green vs `[SYNTHESIZED TMS DEFECT]` in amber).
   - Include an info modal explaining why TMS/SMMS/TDMS data must be synthesized from Indian Railways norms while passenger paths are grounded in real WCR operations.
