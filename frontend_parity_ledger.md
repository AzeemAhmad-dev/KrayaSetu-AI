# Exhaustive Migration Audit: `JYOTI_REFERENCE` vs `SIH26027` Port (Frontend)

I have completed a line-by-line semantic and structural analysis of the two React 19 codebases. The migration attempt has lost approximately ~85% of the functional footprint of the reference architecture.

Here is the exact mapping of what exists in `JYOTI_REFERENCE` but failed to migrate to `SIH26027/frontend/src`.

## 1. Missing React Contexts, States & RBAC Logic
The entire role-based access control engine mapping complex railway roles to UI scopes was dropped.
- **`context/AuthContext.tsx` (496 lines lost):**
  - Lost the `DEMO_ACCOUNTS_REGISTRY` which maps 9 specific hierarchical user roles (`COA-001`, `COR-001`, `SM-001`, `PWAY-001`, `SNT-001`, `TRD-001`, `TRAIN-001`, etc.) to specific initial states.
  - Lost `RolePermissions` tracking matrix: `canApproveTrafficBlocks`, `canRequestBlocks`, `canOverrideDelays`, `canDispatchTrains`, `canRunScenarios`, `canSanctionBudgets`.
  - Lost exact state functions: `login`, `logout`, `canAccessPath`, `hasPermission`, and dynamic initialization from `localStorage` (`"krayasetu_auth_user"`).
- **`context/RoleContext.tsx` (51 lines lost):**
  - Lost the `RoleProvider` wrapper and backward-compatible `useRole` hook spanning the component tree.

## 2. Architectural App Topology (React Router vs Switcher)
- **Reference `App.tsx` (240 lines):** Uses a robust `react-router-dom` implementation with protected paths (`<ProtectedRoute>`).
- **Port `App.tsx` (95 lines):** Ripped out the router completely. It replaces the deep linkable topology with a basic monolithic `useState('operations')` view switcher.

**Exact Missing Pages (15 files / ~298 KB of code dropped):**
- `BlockPlannerPage.tsx` (43.1 KB)
- `TrainPilotWorkspacePage.tsx` (45.4 KB)
- `DivisionalOperationsControl.tsx` (42.1 KB)
- `CorridorDetailPage.tsx` (33.8 KB)
- `ElectricalTRDControl.tsx` (23.9 KB)
- `SignalSNTControl.tsx` (23.8 KB)
- `EngineeringPWayControl.tsx` (22.3 KB)
- `ControlDashboard.tsx` (22.2 KB)
- `StationMasterPage.tsx` (19.2 KB)
- `MaintenancePage.tsx` (16.1 KB)
- `LoginPage.tsx` (12.6 KB)
- `ScenarioAnalysisPage.tsx` (9.7 KB)
- `CorridorsPage.tsx` (6.2 KB)
- `EventsHistoryPage.tsx` (6.0 KB)

## 3. Discarded UI Widget Trees
The component tree collapsed from 7 nested domains (33 components) to a flat directory of 3 basic components (`MetricCards.tsx`, `PriorityQueue.tsx`, `Sidebar.tsx`).
- **Station View Trees Lost:** `StationYardSchematic`, `StationSelectionModal`, `StationSchematicCanvas`, `StationElementInspector`, `StationDetailsDrawer`, `StationControlTab`, `RailwayStationSchematic`, `PlatformSchematic`.
- **Network / Visual Graph Widgets Lost:** `VisualJunctionHubs`, `SchematicRailwayMap`, `NetworkSectionsView`, `MasterNetworkMap`, `CoaBlockManagement`.
- **Corridor & Department Widgets Lost:** `DetailedCorridorMapCanvas`, `CorridorWorkspaceNav`, `CorridorBlockManagement`, `DepartmentTaskSection`, `DepartmentProblemSection`.
- **Conflict Blocks Lost:** `RoleBlockTable`, `ConflictAlertBox`, `BlockReasoningModal`.
- **Static Assets Lost:** `data/stationInfrastructure.ts` and `data/corridorsData.ts`.

## 4. Custom Hooks & API Mutation Logic
- **Reference `services/api.ts` (84 lines lost):** Centralized fetch wrapper exposing 23 separate queries and mutations across maintenance, faults, block proposals, explanation engines, and events (e.g. `getBlocksCoordination`, `proposeBlockFromSchedule`, `approveBlockDirect`, `getTaskPriorityExplanation`, `getCandidateExplanation`).
- **Reference `services/stationOccupancyResolver.ts` (12.3 KB lost):** Contains highly complex algorithmic logic resolving exact track and platform occupancy constraints.
- **Port `api/queries.ts` (54 lines):** The rich service layer was abandoned for three basic TanStack hooks: `useSchedulePlan`, `useDispatcherOverride`, and `usePredictPriority`. The new logic forces an exact `POST` to `/plan` instead of semantic domain querying.

## 5. CSS Discrepancies & Tailwind v4 Config Loss
- **Reference `index.css` (120 lines):** Features explicit webkit scrollbar geometries (`::-webkit-scrollbar` track coloring). Defines a complex typography layout protecting specific SVGs (`svg text, svg tspan`) and forcing `JetBrains Mono` for `.tech-mono` chainages. Protects minimal UI text via deep override classes (`.text-[8px]` enforcing `0.75rem` bounds).
- **Port `index.css` (83 lines):** Trashed the intricate railway layout system (`--railway-signal-green`, `--railway-ballast`, etc.) in favor of generic `--rail-blue` variations. Completely stripped out SVG rendering bounds, geometric precision flags (`text-rendering: optimizeLegibility;`), and the font-feature-settings (`"cv02", "tnum"`).
