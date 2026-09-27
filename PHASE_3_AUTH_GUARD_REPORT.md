# Phase 3 Implementation Report: Auth Guard & Access-Matrix Formalization

**Project**: KrayaSetu AI (Bhopal Division, West Central Railway — SIH26027)  
**Execution Date**: September 27, 2026  
**Status**: COMPLETE  
**Primary Invariants Maintained**:
- **Zero Shell or Page Content Regressions**: Did not touch Navbar, Sidebar, or Safety Callout built in Phase 2, and did not alter any page's own tables, charts, forms, or business logic.
- **Strict Token & Primitive Discipline**: The canonical Not Authorized state is built exclusively using Phase 1 primitives (`EmptyState`, `RoleBadge`, `Button`) and Phase 0 design tokens (`tokens.css`).
- **No Alarming Errors / Calm Operational UX**: Access denial is rendered cleanly inside the authenticated shell with clear context (workspace requested, user credentials, and a one-click return to the home workspace).
- **100% Test & Build Integrity**: Backend test suite passes cleanly with 89/89 tests, and frontend build passes cleanly with 0 errors.

---

## Executive Summary

Phase 3 establishes an authoritative, security-hardened access-matrix guard for KrayaSetu AI across all 7 operational roles:
1. **Operating Department (Master Control)** (`COA-001`)
2. **Corridor Operations (Section Controller)** (`COR-001`)
3. **Station Master** (`SM-001`)
4. **Permanent Way (P.Way - Civil)** (`PWAY-001`, `PWAY-002`)
5. **Signal & Telecom (S&T)** (`SNT-001`)
6. **Traction Distribution (TRD - Electrical)** (`TRD-001`, `TRD-002`)
7. **Train Operations (Loco Pilot / Crew Controller)** (`TRAIN-001`)

Prior to Phase 3, access control had two critical vulnerabilities:
1. `AuthContext.tsx` contained a legacy development fallback (`universalDemoPaths`) granting all authenticated roles blanket access to 11 master/divisional routes.
2. `App.tsx`'s `ProtectedRoute` executed a silent redirect (`<Navigate to={currentRole.defaultPath} replace />`), leaving users disoriented without explanation when attempting to navigate to an unauthorized corridor or terminal.

Phase 3 audited the entire codebase, eliminated legacy bypasses, corrected the operational matrix, and implemented a canonical `UnauthorizedWorkspace` component that renders seamlessly inside the authenticated shell.

---

## 1. Access Matrix Audit & Discrepancy Changelog

The hypothesized route-to-role matrix was audited against the actual route declarations in `App.tsx` and role definitions in `AuthContext.tsx`.

### 1.1 Formalized Route-to-Role Matrix

| Route | Workspace Name | COA | COR | SM | PWAY | SNT | TRD | TRAIN |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/operations-control` | Divisional Operations Control | ✓ | | | | | | |
| `/baseline-comparison` | Maintenance Coordination & Downtime-Saved Baseline | ✓ | ✓ | | | | | |
| `/block-planner` | CP-SAT Block Planning Engine | ✓ | | | | | | |
| `/coordination` | Integrated Corridor Window Coordination | ✓ | | | | | | |
| `/maintenance` | TMS / TDMS / SMMS Maintenance Demands | ✓ | | | | | | |
| `/scenario-analysis` (`/scenarios`) | AI Disruption & What-If Scenario Lab | ✓ | | | | | | |
| `/events` | Real-time Operations & Asset Event Feed | ✓ | | | | | | |
| `/control` | Section Operations & Signal Oversight | ✓ | ✓ | | | | | |
| `/corridors` | Corridor Control Workspace (ET-BPL-BINA) | ✓ | ✓ | | | | | |
| `/marey-diagram` | Multi-Day Marey Space-Time Chart | ✓ | ✓ | | | | | |
| `/station-master` | Station Interlocking & Platform Operations | | | ✓ | | | | |
| `/pway-control` | Civil Engineering (P.Way) Workspace | | | | ✓ | | | |
| `/snt-control` | Signal & Interlocking (S&T) Workspace | | | | | ✓ | | |
| `/trd-control` | Traction & OHE (TRD) Workspace | | | | | | ✓ | |
| `/train-pilot` | Train Pilot Workspace (Cab Advisory) | | | | | | | ✓ |

---

### 1.2 Discrepancies Found & Corrective Rationale

| # | Discrepancy Found | Code Reality Before Phase 3 | Correction Applied | Operational Rationale |
|---|---|---|---|---|
| **1** | **Universal Demo Fallback** | `canAccessPath()` in `AuthContext.tsx` contained `const universalDemoPaths = ["/operations-control", "/block-planner", ...]` allowing ANY logged-in role to access any divisional route. | **Removed completely.** Strict authorization is now enforced: `user.allowedPaths.some(p => clean === p \|\| clean.startsWith(p + "/"))`. | Violates Indian Railways operational isolation. Station Masters and Loco Pilots should never modify divisional block planning schedules. |
| **2** | **COA Role Bypass on Field Portals** | `if (user.username === "COA-001") return true;` allowed COA to access departmental field portals (`/pway-control`, `/snt-control`, `/trd-control`, `/train-pilot`). | **Removed universal bypass.** Confined `COA-001`'s `allowedPaths` strictly to divisional and corridor management workspaces. | Divisional Controllers supervise schedules and dispatch blocks; they do not perform field-level data entry or pilot locomotive cabs. |
| **3** | **COR Access to Baseline Comparison** | `COR-001` lacked `"/baseline-comparison"` in its `allowedPaths`, despite the hypothesis specifying COR access. | **Added `"/baseline-comparison"`** to `COR-001`'s allowed paths in `AuthContext.tsx`. | Section Controllers (COR) require direct visibility into downtime saved and coordinated corridor maintenance windows on their section. |
| **4** | **Route Aliases & Canonical Paths** | `/planner` and `/scenario-lab` existed as legacy aliases in `DEMO_ACCOUNTS_REGISTRY`, while `App.tsx` defines `/block-planner` and `/scenarios` (or `/scenario-analysis`). | Aligned `allowedPaths` to include canonical routes (`/block-planner`, `/scenario-analysis`, `/scenarios`) alongside existing aliases. | Prevents broken navigation or unauthorized false alarms across route variants. |
| **5** | **Silent Redirect on Access Denial** | `ProtectedRoute` performed `<Navigate to={currentRole.defaultPath} replace />` when access was denied. | Replaced silent navigation with `<UnauthorizedWorkspace attemptedPath={path} />` rendered inside the authenticated shell. | Silent redirects confuse users by reloading their home workspace without explaining why navigation failed. |

---

## 2. Canonical Not Authorized State Implementation

### 2.1 Component Architecture: `UnauthorizedWorkspace.tsx`
- **Location**: [`frontend/src/components/common/UnauthorizedWorkspace.tsx`](file:///c:/Users/azial/Downloads/SIH26027/frontend/src/components/common/UnauthorizedWorkspace.tsx)
- **Primitives Consumed**:
  - `EmptyState` (`frontend/src/components/ui/EmptyState.tsx`)
  - `RoleBadge` (`frontend/src/components/ui/Badge.tsx`)
  - `Button` (`frontend/src/components/ui/Button.tsx`)
- **Tokens Consumed**:
  - `bg-[var(--surface-primary)]`, `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-muted)]`
  - `border-[var(--border-subtle)]`, `shadow-[var(--shadow-sm)]`, `bg-[var(--surface-subtle)]`

### 2.2 Operational UX Features
1. **Human-Readable Workspace Translation**: Translates technical route paths into statutory operational workspace titles (e.g., `/pway-control` -> *"Civil Engineering (P.Way) Workspace"*).
2. **Clear Credential Context**: Prominently renders the active user's credentials, Department, and Role using the canonical `RoleBadge` primitive.
3. **Calm, Non-Alarming Advisory**: Explains access boundary in standard Indian Railways procedural terminology without alarming danger dialogs:
   > *"This workspace is restricted to authorized operating personnel with designated credentials. Your active profile does not have clearance for this operational section."*
4. **Single Clear Primary Action**: Provides a primary action button labeled **"Return to Home Workspace"** which navigates directly to `currentRole.defaultPath`.
5. **Embedded In Authenticated Shell**: Rendered inside `<main>` within the layout frame (`Navbar` and `Sidebar` remain fully active). Controllers can switch to any other permitted workspace via the sidebar or header without getting stuck.

---

## 3. Comprehensive Verification Results across All 7 Roles

Automated end-to-end verification was executed via Playwright ([`scripts/verify_phase3_access_matrix.cjs`](file:///c:/Users/azial/Downloads/SIH26027/scripts/verify_phase3_access_matrix.cjs)). All **34/34 test checks passed**.

| Role ID | Role Name | Default Home | Authorized Routes Verified | Unauthorized Routes Verified (Guard Triggered) | Return Button Action | Result |
|---|---|---|---|---|:---:|:---:|
| **COA-001** | Operating Dept (Master) | `/operations-control` | `/operations-control`<br>`/block-planner`<br>`/baseline-comparison`<br>`/corridors` | `/pway-control`<br>`/train-pilot`<br>`/trd-control` | Passed -> `/operations-control` | **PASSED** |
| **COR-001** | Corridor Operations | `/corridors` | `/corridors`<br>`/control`<br>`/marey-diagram`<br>`/baseline-comparison` | `/operations-control`<br>`/block-planner`<br>`/pway-control` | Passed -> `/corridors` | **PASSED** |
| **SM-001** | Station Master | `/station-master` | `/station-master` | `/operations-control`<br>`/corridors`<br>`/train-pilot` | Passed -> `/station-master` | **PASSED** |
| **PWAY-001** | P.Way (Civil Engg) | `/pway-control` | `/pway-control` | `/operations-control`<br>`/snt-control`<br>`/train-pilot` | Passed -> `/pway-control` | **PASSED** |
| **SNT-001** | Signal & Telecom | `/snt-control` | `/snt-control` | `/operations-control`<br>`/pway-control`<br>`/trd-control` | Passed -> `/snt-control` | **PASSED** |
| **TRD-001** | Traction & OHE | `/trd-control` | `/trd-control` | `/operations-control`<br>`/snt-control`<br>`/train-pilot` | Passed -> `/trd-control` | **PASSED** |
| **TRAIN-001** | Train Pilot | `/train-pilot` | `/train-pilot` | `/operations-control`<br>`/corridors`<br>`/block-planner` | Passed -> `/train-pilot` | **PASSED** |

---

## 4. Visual Deliverables & Artifact Catalog

Screenshots of the canonical Not Authorized state were captured across roles and saved in `phase_3_screenshots/`:

| File | Role | Attempted Route | Resolved Workspace Title |
|---|---|---|---|
| `phase_3_screenshots/coa_unauthorized__pway-control.png` | COA | `/pway-control` | Civil Engineering (P.Way) Workspace |
| `phase_3_screenshots/coa_unauthorized__train-pilot.png` | COA | `/train-pilot` | Train Pilot Workspace |
| `phase_3_screenshots/coa_unauthorized__trd-control.png` | COA | `/trd-control` | Traction & OHE (TRD) Workspace |
| `phase_3_screenshots/cor_unauthorized__operations-control.png` | COR | `/operations-control` | Divisional Operations Control |
| `phase_3_screenshots/cor_unauthorized__block-planner.png` | COR | `/block-planner` | CP-SAT Block Planning Engine |
| `phase_3_screenshots/cor_unauthorized__pway-control.png` | COR | `/pway-control` | Civil Engineering (P.Way) Workspace |
| `phase_3_screenshots/sm_unauthorized__operations-control.png` | SM | `/operations-control` | Divisional Operations Control |
| `phase_3_screenshots/sm_unauthorized__corridors.png` | SM | `/corridors` | Corridor Control Workspace |
| `phase_3_screenshots/sm_unauthorized__train-pilot.png` | SM | `/train-pilot` | Train Pilot Workspace |
| `phase_3_screenshots/pway_unauthorized__operations-control.png` | PWAY | `/operations-control` | Divisional Operations Control |
| `phase_3_screenshots/pway_unauthorized__snt-control.png` | PWAY | `/snt-control` | Signal & Interlocking (S&T) Workspace |
| `phase_3_screenshots/pway_unauthorized__train-pilot.png` | PWAY | `/train-pilot` | Train Pilot Workspace |
| `phase_3_screenshots/snt_unauthorized__operations-control.png` | SNT | `/operations-control` | Divisional Operations Control |
| `phase_3_screenshots/snt_unauthorized__pway-control.png` | SNT | `/pway-control` | Civil Engineering (P.Way) Workspace |
| `phase_3_screenshots/snt_unauthorized__trd-control.png` | SNT | `/trd-control` | Traction & OHE (TRD) Workspace |
| `phase_3_screenshots/trd_unauthorized__operations-control.png` | TRD | `/operations-control` | Divisional Operations Control |
| `phase_3_screenshots/trd_unauthorized__snt-control.png` | TRD | `/snt-control` | Signal & Interlocking (S&T) Workspace |
| `phase_3_screenshots/trd_unauthorized__train-pilot.png` | TRD | `/train-pilot` | Train Pilot Workspace |
| `phase_3_screenshots/train_unauthorized__operations-control.png` | TRAIN | `/operations-control` | Divisional Operations Control |
| `phase_3_screenshots/train_unauthorized__corridors.png` | TRAIN | `/corridors` | Corridor Control Workspace |
| `phase_3_screenshots/train_unauthorized__block-planner.png` | TRAIN | `/block-planner` | CP-SAT Block Planning Engine |

---

## 5. Build and Test Suite Verification

### 5.1 Frontend Build
- **Command**: `npm.cmd run build` (inside `frontend/`)
- **Result**:
  - `vite v5.4.14 building for production...`
  - `transforming (2046) ...`
  - `dist/index.html` (1.31 kB)
  - `dist/assets/index-*.js` (913.62 kB)
  - **Errors**: `0`

### 5.2 Backend Test Suite
- **Command**: `.\backend\venv\Scripts\python.exe -m pytest backend/tests`
- **Result**:
  - `89 passed, 3 warnings in 79.63s`
  - **Failures**: `0`
  - **Pass Rate**: `100.0%`
