# Phase 1 Implementation Report: Core Primitive Library

**Project**: KrayaSetu AI (Bhopal Division, West Central Railway — SIH26027)  
**Execution Date**: September 27, 2026  
**Status**: COMPLETE  
**Primary Invariant**: **Zero regressions on existing production pages.** All primitives are built as an isolated, owned component library themed strictly via Phase 0 design tokens (`tokens.css`). No existing application pages have been modified or refactored in this phase.

---

## Executive Summary

Phase 1 establishes a production-grade, headless, token-driven **Core Primitive Library** for KrayaSetu AI. Following the modern `shadcn/ui` architecture, all 8 required UI primitives are implemented as owned source code located in `frontend/src/components/ui/` rather than depending on opaque third-party UI component suites. 

Every component is fully accessible, built on top of battle-tested Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-slot`), styled using Tailwind CSS v4 utility classes consuming CSS variables from `frontend/src/tokens.css`, and verified across both light and dark themes.

All verification gates have passed:
- **Frontend Compilation & Build**: `npm run build` completed with **0 errors** (2,045 modules transformed, Vite production bundle generated).
- **Backend Test Suite**: Full suite `pytest backend/tests` passed with **89 passed, 0 failed** in 56.48 seconds.
- **Isolated Developer Gallery**: Dedicated test harness route registered at `/dev/component-gallery` demonstrating every primitive, variant, size, and interactive state.

---

## 1. Architectural Foundations

### 1.1 Owned Source Pattern & Dependency Strategy
Instead of importing heavy runtime UI frameworks (e.g. MUI or Ant Design) that enforce proprietary styling engines, Phase 1 adopts the `shadcn/ui` design paradigm:
- **Headless Accessibility**: Unstyled, accessible primitives from `@radix-ui/react-*` manage focus trapping, keyboard navigation, ARIA attributes, and screen reader announcements.
- **Owned Source Files**: All components live directly in `frontend/src/components/ui/` where they can be inspected, maintained, and tailored to Indian Railways operational requirements.
- **Class Merging Utility**: Created `frontend/src/lib/utils.ts` providing `cn(...)` combining `clsx` and `tailwind-merge` for conflict-free class overrides.

### 1.2 Strict Token Consumption
No component in `frontend/src/components/ui/` uses hardcoded hex colors, arbitrary border radii, or uncalibrated spacing. Every primitive references the Phase 0 token system (`frontend/src/tokens.css`):
- Brand Navy: `var(--brand-navy)`, `var(--brand-navy-hover)`, `var(--brand-navy-border)`
- Railway Department Palettes: `var(--dept-coa-*)`, `var(--dept-pway-*)`, `var(--dept-trd-*)`, `var(--dept-snt-*)`
- Lock & Possession States: `var(--lock-ruling-*)`, `var(--lock-planned-*)`, `var(--lock-emergent-*)`, `var(--lock-shadow-*)`
- Semantic Status Colors: `var(--status-success)`, `var(--status-warning)`, `var(--status-danger)`, `var(--status-info)`
- Surface & Border Radii: `var(--surface-card)`, `var(--surface-secondary)`, `var(--border-subtle)`, `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-xl)`, `var(--radius-2xl)`

---

## 2. Exhaustive Primitive Inventory

### 2.1 Button Primitive (`Button.tsx`)
A polymorphic button component supporting 4 canonical variants, 3 sizes, multiple states, and `asChild` composition via Radix Slot.

| Variant | Purpose & Visual Styling | Token Reference |
| :--- | :--- | :--- |
| `primary` | High-priority affirmative actions (e.g., "Run CP-SAT Optimizer", "Confirm Sanction") | `bg-[var(--brand-navy)]`, `hover:bg-[var(--brand-navy-hover)]`, `text-[var(--text-inverse)]` |
| `secondary` | Neutral / auxiliary actions (e.g., "Cancel", "Filter Corridor", "Dismiss") | `bg-[var(--surface-card)]`, `hover:bg-[var(--surface-secondary)]`, `border-[var(--border-subtle)]` |
| `destructive` | High-impact safety overrides or rejections (e.g., "Reject Proposal", "Emergency Revoke") | `bg-[var(--status-danger)]`, `hover:brightness-95`, `text-[var(--text-inverse)]` |
| `success` | Operational approvals and endorsements (e.g., "Approve Traffic Possession", "Endorse Window") | `bg-[var(--status-success)]`, `hover:brightness-95`, `text-[var(--text-inverse)]` |

- **Sizes**:
  - `sm`: `px-2.5 py-1 text-xs rounded-[var(--radius-sm)]` (dense data tables & toolbars)
  - `default`: `px-4 py-2 text-sm rounded-[var(--radius-md)]` (standard forms & action bars)
  - `large`: `px-6 py-3 text-base rounded-[var(--radius-lg)]` (primary call-to-actions)
- **Interactive States**: Default, Hover, Active (`scale-[0.98]`), Disabled (`opacity-50 pointer-events-none`), and Loading (renders spinning `Loader2` icon and disables click events).
- **Icons**: Supports optional `leftIcon` and `rightIcon` slots.

### 2.2 Badge Primitive (`Badge.tsx`)
Consisting of 5 distinct, token-driven badge families critical to railway dispatching and optimization clarity:

1. **Department Badges (`DepartmentBadge`)**:
   - `COA`: Chief of Block Operations / Operations Control (`--dept-coa-*`)
   - `PWAY`: Track Engineering / Permanent Way (`--dept-pway-*`)
   - `TRD`: Traction Distribution / 25kV OHE (`--dept-trd-*`)
   - `SNT`: Signal & Telecommunication / Interlocking (`--dept-snt-*`)
2. **Lock-Type Badges (`LockTypeBadge`)**:
   - `RULING`: Statutory long-term annual maintenance programme (gold/amber)
   - `PLANNED`: Standard divisional weekly maintenance timetable (blue)
   - `EMERGENT`: P1 critical safety repair / urgent track possession (red)
   - `SHADOW`: Opportunistic multi-department co-located possession (teal)
3. **Provenance Badges (`ProvenanceBadge`)**:
   - `REAL_PUBLIC`: High-visibility badge indicating data verified against Indian Railways WTT and IRCTC public data.
   - `SYNTHETIC`: High-visibility badge indicating data synthesized transparently from Indian Railways maintenance frequency norms (TMS / SMMS / TDMS).
   - `DERIVED`: Indicating operational state dynamically generated by KrayaSetu AI CP-SAT engine.
4. **Role Persona Badges (`RoleBadge`)**:
   - Standardized badges for the 8 official division roles: `COA-001` (Chief of Block Operations), `COR-001` (Corridor Master), `SM-001` (Station Master), `PWAY-001` (Sr. Section Engineer Track), `PWAY-002` (JE Track), `SNT-001` (Divisional Signal Engineer), `TRD-001` (DEE Traction), `TRD-002` (OHE Supervisor), `TRAIN-001` (Loco Pilot Lead).
5. **Solver-Status Badges (`SolverStatusBadge`)**:
   - `OPTIMAL`: Proven mathematical optimality (emerald, CheckCircle2 icon)
   - `FEASIBLE`: Valid schedule within time limit (sky, Clock icon)
   - `FALLBACK_HEURISTIC`: Safety advisory warning badge (amber, AlertTriangle icon, animated pulse) denoting greedy warm-start fallback without optimality guarantee.
   - `INFEASIBLE`: Hard constraint collision detected (crimson, XCircle icon).

### 2.3 Card & MetricCard Primitives (`Card.tsx`)
- **Canonical Card Shell**: Includes `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. Configured with `rounded-[var(--radius-xl)]`, subtle border `border-[var(--border-subtle)]`, and optional `hoverable` elevation.
- **MetricCard (KPI Component)**:
  - Supports large monospace KPI values (`text-2xl sm:text-3xl font-black font-mono`).
  - Unit badge and contextual label.
  - Trend / Delta pill with directional arrow icon (`positive`, `negative`, `neutral`).
  - Dedicated icon container and optional provenance/status badge slot.

### 2.4 Tabs Primitive (`Tabs.tsx`)
Built on `@radix-ui/react-tabs` with full keyboard navigation (arrow keys, home, end) and two distinctive design presentations:
- **`pills` Variant**: Segmented control styling with pill-shaped triggers, ideal for department filtering and operational mode selection. Active state uses `bg-[var(--brand-navy)]` with inverse text.
- **`underlined` Variant**: Flat header styling with bottom border indicator, ideal for switching sub-views on complex dashboards (e.g. Map View vs. Yard Schematic vs. Ledger).
- **Trigger Enhancements**: Native support for inline icons and notification count badges.

### 2.5 Table & TablePagination Primitives (`Table.tsx`)
- **Canonical Table Structure**: Provides `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, and `TableCaption`.
- **Responsive Wrap**: Outer container guarantees horizontal overflow safety with custom scrollbars, subtle outer borders, and rounded corners.
- **Typography & Styling**: Uppercase monospace column headers with subtle background, zebra-hover transitions on rows, and tabular figures for numerical alignment.
- **TablePagination**:
  - Displays dynamic item ranges (`Showing X to Y of Z entries`).
  - Rows-per-page dropdown (10, 25, 50, 100 rows).
  - Navigation controls: First Page, Previous, Page Indicator (`Page X of Y`), Next, and Last Page with accessible disabled states.

### 2.6 Modal & Drawer Shell (`ModalDrawer.tsx`)
Unified dialog primitive built on `@radix-ui/react-dialog` supporting both modal and slide-over presentations via a single composable API:
- **`presentation="modal"`**: Centered popup dialog with smooth backdrop blur, entry scale animation, max-width clamping, and automatic overflow scrolling in `ModalDrawerBody`.
- **`presentation="drawer"`**: Slide-over drawer panel entering smoothly from the right viewport edge (`max-w-md`), ideal for telemetry inspection, quick filters, and event audit drills.
- **Accessibility**: Includes focus trapping, ESC key dismissal, click-outside-to-close, body scroll lock, and explicit close trigger button with ARIA attributes.

### 2.7 Empty State Primitive (`EmptyState.tsx`)
Standardized placeholder layout preventing jarring blank screens:
- Railway domain icon or illustration slot.
- Prominent heading and clear explanation of why no records currently exist.
- Primary next-action button (e.g., "Create New Block Proposal", "Run CP-SAT Solver").
- Optional secondary action link and statutory advisory note footer.

### 2.8 Loading State Primitive (`LoadingState.tsx`)
An Indian Railways / CP-SAT solver aware loading interface:
- **Header**: Highlighting `GOOGLE OR-TOOLS CP-SAT` engine badge, animated spinner, and elapsed timer vs. solver budget (`3.4s / 8.0s`).
- **Provisional Warm-Start Strip**: Demonstrates continuous dispatch safety by presenting the provisional greedy warm-start metrics (e.g., "48 / 50 Blocks Scheduled", "0 min Delay", "+33.0 hrs Downtime Cut") while branch-and-bound optimization continues.
- **Progress Bar & Refinement Indicator**: Visual multi-color shimmer track reflecting active branch-and-bound refinement passes.
- **`variant="minimal"`**: Compact spinner and status text for smaller inline panels.

---

## 3. Developer Component Gallery

An isolated verification route has been implemented and mounted in `frontend/src/App.tsx`:
- **Route**: `/dev/component-gallery`
- **Component File**: `frontend/src/pages/dev/ComponentGalleryPage.tsx`
- **Features**:
  - Interactive theme switcher toggling between Light Theme and Dark Theme (`.dark` class on root document), validating real-time CSS variable recomputation.
  - Interactive button loading state toggle.
  - Live pagination state simulation.
  - Interactive triggers launching both the Centered Modal and the Slide-Over Drawer.
  - Full display of all 5 badge families, all 4 button variants, metric cards, both tabs styles, full table with pagination, empty state, and CP-SAT loading state.
  - Accessible directly during development without polluting production navigation or requiring login bypasses.

---

## 4. Verification and Invariant Assurance

### 4.1 Frontend Build Verification
Executed `npm run build` in `frontend/`:
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.0 building client environment for production...
transforming...
✓ 2045 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.94 kB │ gzip:   0.52 kB
dist/assets/logo-CRickKxn.jpg      75.41 kB
dist/assets/index-B8vBxyJl.css    137.13 kB │ gzip:  21.47 kB
dist/assets/index-Ce5lZ_FO.js   1,291.53 kB │ gzip: 299.77 kB
✓ built in 2.66s
Exit code: 0
```
Result: **Zero TypeScript errors, zero CSS errors, zero bundling errors.**

### 4.2 Backend Test Suite Verification
Executed `python -m pytest backend/tests`:
```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\azial\Downloads\SIH26027
collected 89 items

backend\tests\test_adversarial.py ..                                     [  2%]
backend\tests\test_api.py ......                                         [  8%]
backend\tests\test_baseline_comparison.py ....                           [ 13%]
backend\tests\test_canonical_synchronization.py ......                   [ 20%]
backend\tests\test_cobo_and_task_completion.py .                         [ 21%]
backend\tests\test_contracts.py ...                                      [ 24%]
backend\tests\test_cpsat_proposal_lifecycle.py .........                 [ 34%]
backend\tests\test_database_runtime.py ...                               [ 38%]
backend\tests\test_datetime_aware_scheduling_and_marey_multiday.py .......[ 46%]
backend\tests\test_demo_reset_and_ai_decision_support.py .....           [ 51%]
backend\tests\test_end_to_end_workflow.py ...                            [ 55%]
backend\tests\test_four_blocks_and_marey.py ......                       [ 61%]
backend\tests\test_marey_timing_and_future_validation.py .....           [ 67%]
backend\tests\test_master_fixes.py ......                                [ 74%]
backend\tests\test_ml.py ...                                             [ 77%]
backend\tests\test_operational_visibility_gate.py ...                    [ 80%]
backend\tests\test_production_baseline_verification.py ...............   [ 97%]
backend\tests\test_solver.py ..                                          [100%]

======================= 89 passed, 3 warnings in 56.48s =======================
Exit code: 0
```
Result: **100% of backend tests pass (89/89).**

### 4.3 Zero Regression Confirmation
- No existing page components (`LoginPage.tsx`, `ControlDashboard.tsx`, `BaselineComparisonPage.tsx`, `StationMasterPage.tsx`, `BlockPlannerPage.tsx`, etc.) were altered.
- All existing route handlers, authorization guards, and API data contracts remain completely untouched.
- The Core Primitive Library exists in complete isolation, ready for gradual adoption in subsequent redesign phases.

---

## 5. File Inventory Created / Modified in Phase 1

```
SIH26027/
├── frontend/
│   ├── package.json                                 [Modified: added @radix-ui/react-dialog, @radix-ui/react-tabs, @radix-ui/react-slot]
│   ├── package-lock.json                            [Modified: dependency tree locked]
│   ├── src/
│   │   ├── App.tsx                                  [Modified: registered /dev/component-gallery route]
│   │   ├── lib/
│   │   │   └── utils.ts                             [Created: cn helper combining clsx + tailwind-merge]
│   │   ├── components/
│   │   │   └── ui/
│   │   │       ├── Button.tsx                       [Created: 4 canonical variants, 3 sizes, loading/disabled states]
│   │   │       ├── Badge.tsx                        [Created: 5 token-driven badge families]
│   │   │       ├── Card.tsx                         [Created: Canonical Card shell + MetricCard KPI primitive]
│   │   │       ├── Tabs.tsx                         [Created: Radix Tabs with pills & underlined variants]
│   │   │       ├── Table.tsx                        [Created: Canonical Table + TablePagination component]
│   │   │       ├── ModalDrawer.tsx                  [Created: Radix Dialog supporting Modal & Slide-over Drawer]
│   │   │       ├── EmptyState.tsx                   [Created: Standardized railway empty state with action slot]
│   │   │       ├── LoadingState.tsx                 [Created: CP-SAT aware solver loading with provisional metrics]
│   │   │       └── index.ts                         [Created: Barrel export for all UI primitives]
│   │   └── pages/
│   │       └── dev/
│   │           └── ComponentGalleryPage.tsx         [Created: Showcase & test harness for all primitives]
└── PHASE_1_PRIMITIVE_LIBRARY_REPORT.md              [Created: This report]
```

---

PHASE 1 COMPLETE
