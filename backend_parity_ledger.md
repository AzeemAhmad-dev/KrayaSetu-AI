# Exhaustive Audit: JYOTI_REFERENCE vs. SIH26027 Port

## 1. FastAPI Routes (REST API Surface)
The SIH26027 port shifts entirely from a persistent resource-based API to a stateless execution API.

**Present in JYOTI_REFERENCE (`routers/` lines 1-300+), Missing in SIH26027:**
- **Network Routes (`routers/network.py`):** `/summary`, `/corridors`, `/corridors/{corridor_id}`, `/stations`, `/stations/{station_code}`
- **Train Routes (`routers/trains.py`):** `/trains`, `/train-movements`, `/trains/{train_number}`
- **Maintenance Routes (`routers/maintenance.py`):** `/maintenance/faults`, `/maintenance/assess`, `/maintenance/approve`, `/maintenance/tasks`, `/maintenance/crews`, `/maintenance/equipment`
- **Block Routes (`routers/blocks.py`):** `/blocks`, `/blocks/coordination`, `/blocks/{block_id}`, `/blocks/{block_id}/explanation`, `/blocks/check-conflict`, `/blocks/propose`, `/blocks/propose-from-schedule`, `/blocks/optimize`
- **Other:** `/api/health`, `/scenarios`, `/events`

**Altered in SIH26027 (`main.py` lines 37-86):**
Only four stateless endpoints exist: `/plan`, `/override`, `/mock/request`, and `/macro-plan`.

---

## 2. SQLAlchemy Database Schema (Persistence)
The SIH26027 port eliminates the relational railway domain model in favor of in-memory JSON schemas (`schemas/contracts.py`).

**Present in JYOTI_REFERENCE (`models/`), Missing in SIH26027:**
- **`models/network.py`:** `Division`, `Corridor` (Track configs, voltage), `Station` (Loops, platforms), `CorridorStation`, `Section`, `Track` (Bi-directional, Up/Down), `Asset`.
- **`models/maintenance.py`:** `Department`, `WorkType` (Requires power/track isolation), `Crew` (HOER max duty hours), `Equipment`, `FaultObservation` (AI vs Human status lifecycle), `MaintenanceTask` (Priority tiers P1-P4), `Block` (Conflict states), `OperationalRestriction` (TSR limits).
- **`models/trains.py`:** `Train` (Vande Bharat, Shatabdi, etc.), `TrainSchedule`, `TrainMovement` (Delay minutes, Hold logic), `TrainEvent`.
- **`models/events.py`:** `Scenario`, `EventLog` (Provenance tracing).

**Altered in SIH26027 (`db/database.py`):**
Only one table remains: `DispatcherOverride` (Lines 14-20).

---

## 3. Priority Intelligence (S-R-C-A-O)
The deterministic 5-factor priority calculation engine has been completely stripped.

**Present in JYOTI_REFERENCE (`services/priority_service.py`):**
- **Calculations (Lines 45-125):** Severity (35%), Escalation Risk (25%), Criticality (20%), Age (10%), Opportunity (10%).
- **Domain Logic:** Assigns 100 to CRITICAL severity. Checks `is_trunk` (`corridor_id in ["CORR-01", "CORR-02"]`) and `is_main_line` (`"MAIN" in track_name`) to boost Criticality scores (Lines 73-87).
- **Explanation Generation (Lines 170-177):** Builds a transparent formula string proving why a task earned its score.

**Altered in SIH26027:**
No priority calculation engine exists. Priority is accepted statically from the payload (`job.priority_score`) and reason codes (`engine/reason_codes.py`) blindly use this static float.

---

## 4. CP-SAT Optimizer Constraints
The solver was fundamentally rewritten. JYOTI_REFERENCE modeled physical railway constraints, while SIH26027 models generic capacity limits.

**Present in JYOTI_REFERENCE (`services/optimizer.py`), Missing in SIH26027:**
- **Power Isolation Domain (`power_intervals`):** Synchronizes/restricts concurrent blocks across tracks based on OHE dependencies (Lines 420-422, 462-478).
- **Track Section Exclusivity (`track_intervals`):** Prevents overlaps only for tasks that actually occupy tracks (`requires_track_occupation = True`) (Lines 412-416, 434-459).
- **Candidate Bundling Bounds (`candidate_start_vars`):** Synchronizes tasks within a candidate block (`model.Add(start_var >= c_start)`) (Lines 374-386).
- **Tier-based Fallback (Lines 151-267):** Solves recursively: Pass 1 (All), Pass 2 (Drop Low), Pass 3 (Critical + High Only).
- **Hard Critical Constraint (Lines 361-362):** Forces `model.Add(is_scheduled == 1)` for CRITICAL tasks.

**Altered in SIH26027 (`solver/cp_sat_core.py`):**
- **Resource Constraints (Lines 201-218):** `crew_load` and `plant_load` use `model.AddCumulative`. Machine exclusivity is gone; it treats machinery as a generic integer pool.
- **Pass Logic (Lines 235-312):** Lexicographic 2-pass based solely on minimizing dropped points (Pass 1) and minimizing train delay (Pass 2).
- **Clustering (Lines 96-150):** Tasks are forcibly constrained to start within generic `S_b` and `E_b` block variables derived from `ml_enrichment.cluster_id`.

---

## 5. Conflict Engine & Candidate Generator
Operational safety constraints and bundling heuristics were dropped.

**Present in JYOTI_REFERENCE, Missing in SIH26027:**
- **`conflict_engine.py` (Lines 44-101):** Enforces a `safety_buffer_mins = 15`. Detects proximity conflicts (`abs(location_km - t_km) <= 30.0`). Penalizes VIP trains (`"VANDE_BHARAT", "SHATABDI"`) with a "CRITICAL" impact label. Evaluates alternate windows by shifting exactly 15 minutes post-clearance.
- **`candidate_generator.py` (Lines 132-154):** Geographically bounds bundled task candidates to `MAX_BUNDLING_DISTANCE_KM = 12.0` and limits maximum grouped possession to `MAX_POSSESSION_WINDOW_MINS = 240`. Rejects bundles based on equipment exclusivity. Derives umbrella protection (e.g., `EMERGENCY_PROTECTION` > `TRAFFIC_AND_POWER_ISOLATION`).

**Altered in SIH26027:**
No explicit conflict evaluation logic. Train scheduling conflicts are managed generically inside the CP-SAT model using `flexibility` and `max_shift_minutes` (`cp_sat_core.py` Lines 84-91). 

---

## 6. Machine Learning Endpoints
The predictive AI approach changed completely from unstructured NLP classification to structured tabular regression.

**Present in JYOTI_REFERENCE (`services/ai_assessor.py`):**
- **NLP Department Classifier (Lines 36-39):** Uses `TfidfVectorizer` and `RandomForestClassifier` trained on free-text descriptions.
- **Rules Engine (Lines 54-113):** Hardcoded substring matching (e.g., if "fracture" in text -> CRITICAL severity, EMERGENCY mode, TRAFFIC_HALTED impact).

**Altered in SIH26027 (`ml/duration.py`, `ml/escalation.py`):**
- **Duration Quantiles:** Uses `xgboost.XGBRegressor` with `objective="reg:quantileerror"` to predict the 80th percentile block duration.
- **Escalation Classification:** Uses `xgboost.XGBClassifier` and `shap.TreeExplainer` to predict the probability of a defect escalating in 7 days, extracting the top 3 contributing features. NLP parsing is completely absent.
