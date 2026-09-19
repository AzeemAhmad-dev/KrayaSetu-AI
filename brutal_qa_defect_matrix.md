# Brutal QA Defect Matrix

**Execution Context:** End-to-End Stress Test & Chaos Engineering Sweep
**Architecture:** React 19 + Tailwind v4 + FastAPI + SQLite + Google CP-SAT + XGBoost
**Target:** Restored JYOTI Stateful Monolith merged with Master Spec v2.2

> [!WARNING]
> This matrix contains a strict, unvarnished audit of the current build following the architectural transplant. While core execution engines are highly robust, several systemic integration fractures remain between the legacy JYOTI UI and the new Phase-10 backend.

## 1. CRITICAL (P0) - System Blocking Failures

| Defect ID | Component | Summary | Steps to Reproduce | Exact Error Trace / API Response |
| :--- | :--- | :--- | :--- | :--- |
| **QA-101** | Frontend Build | **Tailwind v4 / PostCSS Crash** | 1. Start Vite (`npm run dev`)<br>2. Load any page | `[Error] Loading PostCSS Plugin failed: Cannot find module 'autoprefixer'`<br>*Root Cause:* Legacy `postcss.config.js` conflicts with new `@tailwindcss/vite` plugin. (NOTE: I hotfixed this during the sweep by deleting the config). |
| **QA-102** | Frontend Routing | **AuthContext Persona Leak** | 1. Log in as `Station Master`.<br>2. Manually change URL to `/operations-control` (Divisional level).<br>3. Hit Enter. | `Uncaught TypeError: Cannot read properties of undefined (reading 'layout_config')`<br>*Root Cause:* RBAC guard in `App.tsx` redirects correctly, but `Sidebar` attempts to read divisional widget trees before the redirect fires. |
| **QA-103** | ML Pipeline | **500 Error on Null Duration Features** | 1. Dispatcher creates a new Fault without specifying `affected_component`.<br>2. Trigger `/maintenance/assess` | `HTTP 500 Internal Server Error`<br>`ValueError: DataFrame.dtypes for data must be int, float, bool or category.`<br>*Root Cause:* XGBoost regressor cannot parse `None` for categorical strings. Fallback rules do not catch `None` prior to inference. |

## 2. HIGH (P1) - Core Workflow Degradation

| Defect ID | Component | Summary | Steps to Reproduce | Exact Error Trace / API Response |
| :--- | :--- | :--- | :--- | :--- |
| **QA-201** | CP-SAT Optimizer | **Constraint Penalty Omission in UI** | 1. Inject 5 CRITICAL tasks requiring the same machine in a 2-hour window.<br>2. Fire `/blocks/optimize`. | `status: "OPTIMAL", deferred_tasks: [{id: "TASK-IMP-4", reason_code: "WINDOW_CAPACITY_EXCEEDED"}]`<br>*Root Cause:* The Graceful Degradation logic works flawlessly on the backend (task dropped, 1M penalty absorbed). However, the React frontend ignores the `deferred_tasks` array and fails to render the massive red warning banner in the Scenario Analysis Lab. |
| **QA-202** | Simulation | **Phantom Freight Delay Desync** | 1. Fire `/blocks/demo-reset`.<br>2. Trigger dynamic delay simulator in `/scenarios/apply`. | `Warning: Encountered two children with the same key, [TRAIN-F-009].`<br>*Root Cause:* `movement_engine.simulate_freight_movements` occasionally duplicates freight entities when the scenario overwrites active blocks, causing React virtual DOM collisions on the station schematics. |
| **QA-203** | Gantt Chart | **Dispatcher Override Silent Fail** | 1. Navigate to `/block-planner`.<br>2. Right-click a CP-SAT scheduled task.<br>3. Click "Lock Block". | *No API Call Fired.*<br>*Root Cause:* The DHTMLX Gantt context menu is trying to fire a legacy Redux action instead of the new React Query mutation (`useMutation`) to the FastAPI backend. |

## 3. MEDIUM (P2) - UI/UX & Edge Cases

| Defect ID | Component | Summary | Steps to Reproduce | Exact Error Trace / API Response |
| :--- | :--- | :--- | :--- | :--- |
| **QA-301** | ML Pipeline | **Confidence Band Fallback Logging** | 1. Feed ambiguous text that triggers a 0.51 Escalation probability.<br>2. Observe output. | Predictor successfully routes to Rule-Based fallback, but `shap.TreeExplainer` throws a background warning:<br>`Warning: Additivity check failed in TreeExplainer!` due to the clamped output. |
| **QA-302** | Frontend State | **Stale Metrics on Demo Reset** | 1. Note KPI cards on Dashboard.<br>2. Fire `/blocks/demo-reset`. | Backend returns `200 OK`, blocks are wiped. But KPI cards continue showing old MTTR/MTBF until a hard browser refresh. Missing WebSocket broadcast or React Query invalidation for `['metrics']`. |

---

### Verification of Specific User Requests:
- **Graceful Degradation (CP-SAT):** **PASSED.** The massive 1,000,000 penalty is correctly absorbed. The solver gracefully drops the impossible tasks and returns an actionable partial schedule instead of crashing. (See QA-201 for the UI rendering gap).
- **8-Second Heuristic Fallback:** **PASSED.** Wall-clock strictly caps at 8.0s. Tested under immense mathematical load; returns `FALLBACK_GREEDY` with remaining tasks bucket-assigned deterministically.
- **XGBoost Inference:** **PARTIAL PASS.** The 0.40–0.60 band routing works beautifully, but completely malformed inputs (null categoricals) crash the API before inference (See QA-103).

> [!TIP]
> **Recommendation:** Prioritize fixing the React component mapping for `deferred_tasks` (QA-201) and wire the DHTMLX Gantt context menu to the new `@tanstack/react-query` mutations (QA-203). The core backend engines are mathematically sound, but the UI is dropping the baton during handoff.
