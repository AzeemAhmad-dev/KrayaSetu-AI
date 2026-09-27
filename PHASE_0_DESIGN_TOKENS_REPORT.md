# PHASE 0: DESIGN TOKEN FOUNDATION REPORT
## KrayaSetu AI — Autonomous Railway Block Scheduling & Operational Decision Support
**Target Deployment:** Bhopal Division (BPL), West Central Railway (WCR), Indian Railways  
**System Baseline:** Ministry of Railways Problem Statement SIH26027  
**Document Classification:** Foundation Architecture Specification & Verification  
**Status:** COMPLETE (Zero Visual Changes to Existing Pages)  
**Date:** September 2026

---

## 1. Executive Summary & Phase Objective

Phase 0 establishes the centralized **Design Token Foundation** ("the rulebook") for KrayaSetu AI ahead of subsequent UI redesign phases. 

### Core Constraints & Invariant:
- **Zero Visual Changes:** No component, layout, color, typography, or behavior in any existing page was modified.
- **Rulebook Only:** Centralized tokens were established in a dedicated token stylesheet ([`frontend/src/tokens.css`](file:///c:/Users/azial/Downloads/SIH26027/frontend/src/tokens.css)) and wired into the Tailwind CSS v4 pipeline via [`frontend/src/index.css`](file:///c:/Users/azial/Downloads/SIH26027/frontend/src/index.css).
- **Exact Sourcing:** No new arbitrary colors or spacing values were invented; all tokens are grounded directly in the verified baseline documented in `UI_INVENTORY_REPORT.md` §5 and confirmed against the active frontend codebase.
- **Formalized Systems:** The four railway **Lock Types** and four **Department Colors**—previously scattered across inline Tailwind utilities and canvas scripts—have been formalized into unified, semantically named tokens.
- **Parallel Theming:** Every token is defined as a parallel variable pair across Light Theme (the canonical Slate-50 / Navy system) and Dark Theme using identical token names.

---

## 2. Audit & Verification of Existing Tokens

All tokens reported in `UI_INVENTORY_REPORT.md` were cross-checked against actual component implementations, SVG canvases, and stylesheet definitions:

1. **Color Palette (§5.1):**
   - Verified brand navy `#0b2545`, header border `#134074`, interactive hover `#13315c`, canvas blue `#1d4e89`.
   - Verified surface palette: `#f8fafc` (`slate-50` body), `#ffffff` (card surface), `#f1f5f9` (`slate-100` header/input surface), `#e2e8f0` (`slate-200` borders).
   - Verified semantic status tokens: Success Emerald (`#059669` / `#10b981`), Warning Amber (`#d97706` / `#f59e0b`), Danger Red/Rose (`#dc2626` / `#ef4444`), Info Sky (`#0284c7` / `#0ea5e9`).
2. **Typography System (§5.2):**
   - Verified font families: `Inter` loaded via Google Fonts in `index.html` (weights 300..900) for general UI, and `JetBrains Mono` (weights 400..800) for technical telemetry, chainages, and IDs.
   - Verified the 5-step weight hierarchy: Regular (`400`), Medium (`500`), Semi-Bold (`600`), Bold (`700`), Black (`900`).
   - Verified and formalized the **12px minimum UI floor**: previously enforced via utility classes in `index.css` (`.text-[8px]`, `.text-[10px]`), now formalized into `--text-floor: 0.75rem` (12px) and `--text-floor-leading: 1.05rem` (16.8px), preserving the exact render metrics while making it token-driven.
3. **Spacing, Layout & Elevation (§5.3):**
   - Verified container widths: `max-w-md` (`28rem` / 448px), `max-w-2xl` (`42rem` / 672px), `max-w-5xl` (`64rem` / 1024px), `max-w-7xl` (`80rem` / 1280px), `max-w-[1600px]` (`100rem` / 1600px).
   - Verified padding scale: viewport `p-4 sm:p-6 lg:p-8`, card `p-4 sm:p-5`, table cell `p-2.5 sm:p-3`.
   - Verified border radiuses: `rounded-md` (`6px`), `rounded-lg` (`8px`), `rounded-xl` (`12px`), `rounded-2xl` (`16px`), `rounded-full` (`9999px`).
   - Verified shadow scale: `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl`.

---

## 3. Formalization of Newly-Systematized Token Categories

### 3.1 Four Railway Lock-Type Colors
Prior to Phase 0, railway track possession lock types were rendered with disparate Tailwind utility classes and canvas fill calculations. They are now unified into semantic tokens:

| Lock Type | Visual Semantic Meaning | Sourced From Codebase | Light Theme Tokens | Dark Theme Tokens |
| :--- | :--- | :--- | :--- | :--- |
| **`RULING`** | Long-term statutory annual maintenance programme; governing corridor possessions | `RoleBlockTable.tsx:140-147`<br>`MareyCanvas.tsx:260-262`<br>`MareyHeader.tsx:404-405`<br>`BlockPlannerPage.tsx:1051-1052` | `--lock-ruling: #9333ea`<br>`--lock-ruling-bg: #f3e8ff`<br>`--lock-ruling-fill: rgba(147, 51, 234, 0.18)`<br>`--lock-ruling-border: #d8b4fe`<br>`--lock-ruling-text: #581c87` | `--lock-ruling: #c084fc`<br>`--lock-ruling-bg: #3b0764`<br>`--lock-ruling-fill: rgba(147, 51, 234, 0.25)`<br>`--lock-ruling-border: #7e22ce`<br>`--lock-ruling-text: #e9d5ff` |
| **`PLANNED`** | Standard divisional timetable possession window | `RoleBlockTable.tsx:169-175`<br>`MareyCanvas.tsx:257-258`<br>`MareyHeader.tsx:407-408`<br>`BlockPlannerPage.tsx:1053-1055` | `--lock-planned: #2563eb`<br>`--lock-planned-bg: #eff6ff`<br>`--lock-planned-fill: rgba(59, 130, 246, 0.16)`<br>`--lock-planned-border: #bfdbfe`<br>`--lock-planned-text: #1e40af` | `--lock-planned: #60a5fa`<br>`--lock-planned-bg: #1e3a8a`<br>`--lock-planned-fill: rgba(59, 130, 246, 0.22)`<br>`--lock-planned-border: #1d4ed8`<br>`--lock-planned-text: #dbeafe` |
| **`EMERGENT`** | P1 critical safety intervention; immediate track defect possession | `RoleBlockTable.tsx:149-157`<br>`MareyCanvas.tsx:263-265`<br>`MareyHeader.tsx:411-412`<br>`BlockPlannerPage.tsx:1049-1050` | `--lock-emergent: #dc2626`<br>`--lock-emergent-bg: #fef2f2`<br>`--lock-emergent-fill: rgba(239, 68, 68, 0.22)`<br>`--lock-emergent-border: #fecaca`<br>`--lock-emergent-text: #991b1b` | `--lock-emergent: #fb7185`<br>`--lock-emergent-bg: #450a0a`<br>`--lock-emergent-fill: rgba(239, 68, 68, 0.28)`<br>`--lock-emergent-border: #b91c1c`<br>`--lock-emergent-text: #fee2e2` |
| **`SHADOW`** | Opportunistic multi-department co-located possession window | `RoleBlockTable.tsx:158-167`<br>`MareyCanvas.tsx:266-268`<br>`MareyHeader.tsx:415-416`<br>`BlockPlannerPage.tsx:1047-1048` | `--lock-shadow: #4f46e5`<br>`--lock-shadow-bg: #e0e7ff`<br>`--lock-shadow-fill: rgba(79, 70, 229, 0.20)`<br>`--lock-shadow-border: #c7d2fe`<br>`--lock-shadow-text: #312e81` | `--lock-shadow: #818cf8`<br>`--lock-shadow-bg: #312e81`<br>`--lock-shadow-fill: rgba(79, 70, 229, 0.25)`<br>`--lock-shadow-border: #4338ca`<br>`--lock-shadow-text: #e0e7ff` |

---

### 3.2 Four Department Colors
Department identities have been extracted from role permissions, navigation cards, and section badges to establish uniform semantic tokens:

| Department | Role & Scope | Sourced From Codebase | Light Theme Tokens | Dark Theme Tokens |
| :--- | :--- | :--- | :--- | :--- |
| **`COA`** | Chief of Block Operations / Divisional Executive / Master Control | `AuthContext.tsx:78`<br>`DivisionalOperationsControl.tsx`<br>`BaselineComparisonPage.tsx:90` | `--dept-coa: #7e22ce`<br>`--dept-coa-bg: #f3e8ff`<br>`--dept-coa-border: #d8b4fe`<br>`--dept-coa-text: #581c87` | `--dept-coa: #a855f7`<br>`--dept-coa-bg: #3b0764`<br>`--dept-coa-border: #7e22ce`<br>`--dept-coa-text: #f3e8ff` |
| **`PWAY`** | Civil Engineering / Permanent Way / Track Infrastructure (60kg Rail) | `AuthContext.tsx:174`<br>`EngineeringPWayControl.tsx:91`<br>`BaselineComparisonPage.tsx:281` | `--dept-pway: #ea580c`<br>`--dept-pway-bg: #ffedd5`<br>`--dept-pway-border: #fdba74`<br>`--dept-pway-text: #7c2d12` | `--dept-pway: #f97316`<br>`--dept-pway-bg: #431407`<br>`--dept-pway-border: #c2410c`<br>`--dept-pway-text: #ffedd5` |
| **`TRD`** | Electrical / Traction Distribution / 25kV OHE Overhead Power | `AuthContext.tsx:258`<br>`ElectricalTRDControl.tsx:94`<br>`BaselineComparisonPage.tsx:300` | `--dept-trd: #d97706`<br>`--dept-trd-bg: #fef3c7`<br>`--dept-trd-border: #fcd34d`<br>`--dept-trd-text: #78350f` | `--dept-trd: #f59e0b`<br>`--dept-trd-bg: #451a03`<br>`--dept-trd-border: #b45309`<br>`--dept-trd-text: #fef3c7` |
| **`SNT`** | Signal & Telecommunication / Electronic Interlocking (SIL-4 EI) | `AuthContext.tsx:230`<br>`SignalSNTControl.tsx:97`<br>`BaselineComparisonPage.tsx:320` | `--dept-snt: #0891b2`<br>`--dept-snt-bg: #cffafe`<br>`--dept-snt-border: #67e8f9`<br>`--dept-snt-text: #164e63` | `--dept-snt: #06b6d4`<br>`--dept-snt-bg: #083344`<br>`--dept-snt-border: #0e7490`<br>`--dept-snt-text: #cffafe` |

---

## 4. Light + Dark Theme Variable Architecture

Tokens are structured into parallel variable sets operating on **identical token names**, avoiding dual vocabularies. The dark theme is activated via `.dark` or `[data-theme="dark"]` on root containers.

### Marey Diagram Re-Derivation Tokens (§C.2)
To facilitate future re-theming without breaking existing canvas logic, the Marey diagram palette has been formalized into the shared token architecture:

| Token Name | Light Theme Value | Dark Theme Value | Sourced From Codebase | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `--marey-canvas-bg` | `#fcfaf2` | `#090d16` | `MareyCanvas.tsx:117` | Canvas drawing surface background |
| `--marey-header-bg` | `#f4eee1` | `#070b14` | `MareyCanvas.tsx:118` | Top control and date bar background |
| `--marey-canvas-border` | `#cbd5e1` | `#1e293b` | `MareyCanvas.tsx:127` | Canvas boundary outline |
| `--marey-grid-major` | `rgba(30, 41, 59, 0.40)` | `rgba(148, 163, 184, 0.45)` | `MareyCanvas.tsx:122` | Station chainage horizontal lines |
| `--marey-grid-minor` | `rgba(148, 163, 184, 0.25)` | `rgba(71, 85, 105, 0.25)` | `MareyCanvas.tsx:123` | Intermediate halt station dividers |
| `--marey-grid-time` | `rgba(148, 163, 184, 0.22)` | `rgba(71, 85, 105, 0.22)` | `MareyCanvas.tsx:124` | Vertical hourly time grid lines |
| `--marey-text-station` | `#1e293b` | `#cbd5e1` | `MareyCanvas.tsx:119` | Station name text labels |
| `--marey-text-station-major` | `#0f172a` | `#f8fafc` | `MareyCanvas.tsx:120` | Major junction station labels (BPL, ET) |
| `--marey-text-km` | `#64748b` | `#94a3b8` | `MareyCanvas.tsx:121` | Cumulative kilometer chainage markers |
| `--marey-text-hour` | `#475569` | `#94a3b8` | `MareyCanvas.tsx:125` | 24-hour horizontal axis labels |
| `--marey-scrubber` | `#ef4444` | `#f87171` | `MareyCanvas.tsx:126` | Live real-time IST indicator line |
| `--train-prestige` | `#b91c1c` | `#ef4444` | `MareyHeader.tsx:374` | Vande Bharat / Shatabdi string path |
| `--train-superfast` | `#1d4ed8` | `#3b82f6` | `MareyHeader.tsx:378` | Superfast Express string path |
| `--train-mail` | `#0f766e` | `#14b8a6` | `MareyHeader.tsx:382` | Mail / Express string path |
| `--train-passenger` | `#b45309` | `#f59e0b` | `MareyHeader.tsx:386` | Passenger / MEMU string path |
| `--train-freight` | `#334155` | `#94a3b8` | `MareyHeader.tsx:390` | Freight path (BOXN/BCN) |

---

## 5. Wiring into Tailwind CSS v4 Configuration

Tailwind CSS v4 configures themes natively via CSS `@theme` directives rather than external JavaScript config files. In [`frontend/src/tokens.css`](file:///c:/Users/azial/Downloads/SIH26027/frontend/src/tokens.css), all custom properties are registered under an `@theme` block:

```css
@theme {
  --color-brand-navy: var(--brand-navy);
  --color-brand-navy-border: var(--brand-navy-border);
  --color-surface-body: var(--surface-body);
  --color-surface-card: var(--surface-card);
  --color-text-primary: var(--text-primary);
  --color-status-success: var(--status-success);
  --color-lock-ruling: var(--lock-ruling);
  --color-lock-planned: var(--lock-planned);
  --color-lock-emergent: var(--lock-emergent);
  --color-lock-shadow: var(--lock-shadow);
  --color-dept-coa: var(--dept-coa);
  --color-dept-pway: var(--dept-pway);
  --color-dept-trd: var(--dept-trd);
  --color-dept-snt: var(--dept-snt);
  /* ...all mapped tokens */
}
```

This file is imported directly into [`frontend/src/index.css`](file:///c:/Users/azial/Downloads/SIH26027/frontend/src/index.css) immediately following `@import "tailwindcss";`:
```css
@import "tailwindcss";
@import "./tokens.css";
```

Because no existing application components currently consume these newly exposed class names, this change is strictly additive and causes zero visual regressions.

---

## 6. Verification & Invisibility Confirmation

### 6.1 Frontend Production Build
- **Command:** `npm.cmd run build` (invoking `tsc -b && vite build`)
- **Result:** **PASSED CLEANLY in 4.74s**
- **Output:**
  - `dist/index.html`: `0.94 kB`
  - `dist/assets/index-B_jLgL7B.css`: `126.50 kB` (compiled with full token registry)
  - `dist/assets/index-C50noLqO.js`: `1,161.04 kB`
  - **Diagnostics:** 0 TypeScript errors, 0 Vite compilation warnings.

### 6.2 Backend Test Suite
- **Command:** `.\backend\venv\Scripts\python.exe -m pytest backend/tests`
- **Result:** **89 PASSED out of 89 tests in 57.50s**
- **Scope Verified:**
  - API router contracts (`test_api.py`)
  - CP-SAT solver constraint logic (`test_solver.py`, `test_cpsat_proposal_lifecycle.py`)
  - Canonical dataset synchronization (`test_canonical_synchronization.py`)
  - Baseline comparison & downtime savings objective function (`test_baseline_comparison.py`)
  - Live Marey telemetry and multi-day train scheduling (`test_datetime_aware_scheduling_and_marey_multiday.py`)

### 6.3 Headless Browser Execution & Zero-Change Confirmation
A headless automation test ([`scratch/verify_tokens.cjs`](file:///C:/Users/azial/.gemini/antigravity/brain/11f119e8-ba55-4ef4-bb22-9fe0d60b153c/scratch/verify_tokens.cjs)) executed across core routed workflows:
1. `/login` (Unauthenticated) — **0 runtime errors, pixel-identical**
2. `/operations-control` (`COA-001`) — **0 runtime errors, pixel-identical**
3. `/baseline-comparison` (`COA-001`) — **0 runtime errors, pixel-identical**
4. `/marey-diagram` (`COA-001`) — **0 runtime errors, pixel-identical**
- **Console & Page Errors:** **0 errors detected**

### 6.4 Confirmation Statement:
**Zero pages visually changed as a result of Phase 0.** All existing inline Tailwind classes, hardcoded hex values, and component styles continue to render with 100% fidelity.

---

PHASE 0 COMPLETE
