I've now read the master spec end‑to‑end (all 8 parts — the CP‑SAT formulation, the data contract, the red‑team stress test, the macro/ML layers), the full 965‑line UI inventory (all 17 routes, 5 overlay systems, the design‑token audit), and all 36 screenshots across both batches. What follows is built strictly on that material — where I flag something I can't confirm from a static screenshot, I say so explicitly rather than asserting it.

---

## 1. RESEARCH & RECOMMENDATION (THE FOUNDATION)

### 1.1 Diagnosis: what's actually working, and what's actually broken

**Load-bearing strengths — do not lose these in the redesign:**

- **Solver honesty is already wired, not just designed.** The Block Planner screenshot shows `Solver Status: FEASIBLE (Time Limited)`, `Gap: 3.85%`, `Solve Time: 7940ms`, `Mandatory Dropped: 0` live on screen. That's Part 2.3/3.6 of your own spec — most teams design this and never surface it. Preserve and *elevate* it; don't let a "cleaner" redesign quietly drop it behind a tooltip.
- **The S‑R‑C‑A‑O reasoning modal is a genuine differentiator.** It directly realizes Pillar 3 ("silence is a bug, not a feature") with real factor breakdowns and progress bars. This is the single component most likely to make a judge lean in — protect its content depth, restyle its shell.
- **Provenance badges (REAL_PUBLIC vs SYNTHETIC) are a distinctive trust signal.** Used consistently ("WCR Published Timetable" / "Synthesized: TMS Defect Backlog") across the dashboard, baseline comparison, and department pages. This directly pre-empts the single question every hackathon judge is trained to ask ("is this data real or fabricated?") — it should become a formal, first-class design-system component, not a scattered ad hoc badge.
- **The three engineering departments are already structurally isomorphic.** PWay, S&T, and TRD each use the identical shape — Infrastructure directory (3-card layout) ⇄ Work Management (5 sub-tabs) ⇄ Activity Log — with only domain nouns swapped (TMS/SMMS/TDMS, rail/interlocking/traction data). This means most of the "redesign work" for these three pages is really *one* piece of engineering, not three.
- **The block card is the single most important atomic unit in the whole system** — it's the literal visual representation of `selected_work_packages[]` and the Part 8.1 lock-type taxonomy (RULING/PLANNED/EMERGENT/SHADOW), and it's already reused faithfully across the COA ledger, Corridor block tab, Joint Coordination desk, and department pages. Formalize it first; everything else renders it.
- **The empty-ledger copy on Joint Coordination Desk is genuinely good** ("No pending blocks in active workflow. All 50 canonical blocks are available in the Block Planner.") — it names what's empty *and* gives the one next action. This is the template every other empty state should copy, not a one-off.

**Root-cause frictions — each traced to a mechanism, not just "looks inconsistent":**

| # | Symptom | Actual mechanism |
|---|---|---|
| 1 | Marey parchment/charcoal theme vs. Slate‑50/Navy dashboard vs. the purple/indigo gradient hero on Operations Control | Three unrelated visual systems on one product. For a submission whose entire thesis is "we unified siloed departments," a visually fragmented UI is a *self-undermining* signal — it looks like separately-built parts stitched together, which is the exact criticism the product claims to solve for railway ops. |
| 2 | Two tab-navigation grammars: query-param pills (`/control`, `/corridors`) vs. the nested "two-tier toggle → 5 sub-tabs" pattern unique to the three department pages | A user who learns one interaction pattern on COA screens has to relearn it on department screens. Real interaction cost, not aesthetics — this is where Fitts's Law and consistency heuristics actually take a hit. |
| 3 | Events History, department Activity Logs, and the 50-task Maintenance ledger all render as unbounded, unpaginated, small-monospace tables | This is a cognitive-load problem precisely where clarity matters most: these are the pages used *during* a dispute or audit check (high-stakes), not casual browsing. |
| 4 | Empty states split between illustrated+refresh (Maintenance, Events) and bare text (Corridor Detail, Block Planner) | For a system whose Pillar 2 promise is "never show nothing," a bare "no data" string is a bad billboard for the exact claim the product makes about itself. |
| 5 | The explainability surface covers "why selected" but I see no matching surface for "why deferred" | The backend already computes `reason_code` (`NO_FEASIBLE_WINDOW` / `CAPACITY_EXCEEDED` / `LOWER_PRIORITY`) per Part 2.2/3.6 — this is Pillar 3's *other half*, and it appears to be currently invisible. This is the single highest-leverage net-new surface in this whole blueprint, because it's a UI gap, not a backend one. |
| 6 | Weekly/Monthly tabs look like date-filtered views of the same canonical block ledger | Requirement #4 (weekly/monthly plans) is realized in your backend by a *structurally different* engine — a greedy day-granularity bucket-assigner (Part 4) that is explicitly **advisory, not authoritative**, with its own `unassignable_before_deadline` semantics. If the UI doesn't visually distinguish "this is the exact CP-SAT plan" from "this is a rolling advisory calendar," it under-sells one of only four explicit requirements in the problem statement. |
| 7 | Unclear whether the headline "33.0 hrs Downtime Saved" KPI carries `solver_status`/gap% context | *Open question, not a confirmed defect* — I can't verify from a screenshot whether this number silently assumes `OPTIMAL`/`FEASIBLE` framing regardless of what actually produced it. Worth explicitly deciding during redesign, because Part 2.3 is emphatic that mislabeling a `FALLBACK_HEURISTIC` result is dishonest at "the one moment this field's honesty matters most." |
| 8 | Sidebar item count ranges from 9 (COA) to 1 (Train Pilot) | Architecturally correct (matches real authority), but the shell must be designed to not look sparse/broken at the 1-item end. |
| 9 | No visible UI for traveling/multi-leg jobs (`route_legs`, Part 1.7) | The backend contract explicitly supports multi-section jobs with a shared presence literal — I don't see this represented in the block card, Marey diagram, or Gantt component trees. Worth an explicit in/out-of-scope decision for this redesign phase rather than a silent gap. |

### 1.2 Recommended layout paradigm

Your three candidates, interrogated against the actual data topology (not against trend):

- **Kanban Hub — rejected.** Blocks do have a lifecycle (PROPOSED→APPROVED→SANCTIONED), but that's a secondary attribute, not the primary mental model. Kanban's column metaphor would flatten away the two things that actually matter — *where* on the network and *when* in time — replacing them with a generic status-lane abstraction that maps to nothing in how a dispatcher thinks. Actively wrong fit.
- **Unified Command-Bar Dashboard — rejected as the primary paradigm, kept as a secondary layer.** A Cmd+K palette is excellent for a power user jumping between disconnected objects (Linear-style). But your primary object *isn't* disconnected — it's one continuous physical network. And there's a demo-specific reason to deprioritize it further: a keyboard-driven jump is invisible to an audience watching a screen-share. A live judge demo is a *mouse-driven, watch-me-click* narrative; keyboard shortcuts actively work against that. (More on this in §2.3.)
- **Split-Pane Spatial Analytics Engine — the right instinct, but it's already partially implemented, not a new pattern.** Corridor Detail already does schematic-on-top, spec-panel-below, ledger-at-bottom. The fix is to make this the *canonical* template for anything pairing geometry with tabular data, not a one-off.

**Recommended paradigm: a Corridor–Time Console.** Your own CP-SAT model is built on exactly two constraint axes — `AddNoOverlap` over block *sections* (space) and `IntervalVar`s over *minutes* (time). The UI's organizing metaphor should mirror the solver's own two axes, because that's what a Chief Block Officer is actually reasoning about 80% of the time — which track, near which junction, during which hours:

- A **persistent spatial spine** — a collapsible corridor/junction tree, always addressable, that lets you drill division → corridor → station → asset without a full page reload each hop. This generalizes what Master Network Map, Corridor Directory, Corridor Detail, and Station Schematic already are today as four separate full routes with their own headers.
- A **persistent temporal spine** — the Marey diagram and Block Planner Gantt already *are* this; the shift is treating "time-distance view" as an always-reachable *mode* synchronized to whatever spatial scope is selected, not a separately-themed destination page.
- **Role-scoped workspaces sit inside this spine as a third dimension** — a department's Infrastructure/Control/Log pattern becomes a filtered view of the same spine (their block sections, their lock types), not a structurally separate page tree.
- **Explainability and audit are overlays, not destinations.** The reasoning modal is already correctly a modal. The Activity Log and "why deferred" panel should be reachable as slide-overs from wherever a block/task appears — because "why did this happen" is a question asked *in context*, not a separate errand.

This isn't a rebuild — Master Network Map, Corridor Directory→Detail, Marey, and Block Planner already exist. The redesign's job is unifying them under one spine and one visual language, not inventing new pages.

### 1.3 Frontend stack — verdict, not endorsement

| Layer | Current | Verdict | Reasoning |
|---|---|---|---|
| Framework | React 19 + Vite + TS (SPA) | **Keep. Reject Next.js.** | This is an authenticated, role-gated control room — zero public/SEO surface, so Next's core value (SSR for first-paint of public content) buys nothing here. Migrating React Router → App Router is exactly the "structural compatibility" break you asked me to avoid, and it reopens the CORS/deployment fragility your own project state already flagged as a solved problem (Part 8.4) right before judging. |
| Routing | React Router v6 | **Keep.** | Already current-generation; no defect traced to routing. |
| Data layer | TanStack Query v5 | **Keep.** | Well-suited to the CP-SAT async-solve/polling pattern; also gives you reconnect-on-network-drop almost for free (relevant to §3.11). |
| Styling primitives | Tailwind 3.4, mixed button/tab patterns | **Adopt shadcn/ui as the primitive layer.** Optionally bump Tailwind → v4 (low-risk internal tooling). | shadcn isn't a runtime dependency — it's copy-in source built on accessible Radix primitives, themed via CSS variables. That's exactly the model needed to consolidate ad hoc buttons/tabs/modals into one system without taking on new dependency risk two weeks before judging. |
| Motion | None described | **Adopt Framer Motion, scoped.** | Only for drawer/modal/tab transitions and KPI count-ups (§2.4) — not decorative. Never apply motion to a UI that's still structurally changing (see Phase 13 sequencing, §4). |
| Custom visualization (MareyCanvas, station/corridor schematics) | Bespoke SVG/Canvas | **Keep the engines. Refactor only their color/theme sourcing.** | This is your hardest-won technical depth — exactly what a judge should see. Rewriting the rendering math for a redesign is the wrong trade; re-pointing its palette at the same design tokens as the rest of the app is the actual fix for finding #1. |
| Charting (Baseline Comparison, Scenario Analysis) | Large numeric KPI cards, no evident chart library | **Optionally adopt Recharts.** | Framed as an elevation, not a fix — I have no evidence a chart library is missing from something broken, just an opportunity to show trend data more richly than static numbers. |

**Explicitly rejected:** Next.js migration; a second component library alongside shadcn; any rewrite of the Marey/station SVG engines.

---

## 2. PSYCHOLOGICAL FLOW & RATIONALE (THE INTERROGATION LAYER)

### 2.1 Personas (7 roles, 8 demo accounts)

| Persona | Login(s) | Scope | Primary job-to-be-done | Judge visibility |
|---|---|---|---|---|
| Chief of Block Officer | COA-001 | Division-wide | Executive sanction, run the optimizer, own the narrative | **Highest** — this is the demo's hero role |
| Corridor Master | COR-001 | One corridor (subset of COA's tools) | Prove role-scoping works | Medium |
| Station Master | SM-001 | One station/yard at a time | Physical asset drill-down, line-clear authority | Medium |
| Track / P.Way Engineer | PWAY-001/002 | Department-scoped | Infra reference + defect logging | Medium (×3 with S&T, TRD — proves multi-dept coordination) |
| Signal & S&T Engineer | SNT-001 | Department-scoped | Same shape as above, different domain | Medium |
| Traction/OHE Engineer | TRD-001/002 | Department-scoped | Same shape again | Medium |
| Train Pilot | TRAIN-001 | Narrowest — field/mobile | View restrictions, log field observations | Lower frequency, symbolically important — closes the field-to-planning loop |

Three of these personas are *structurally identical* (PWay/S&T/TRD). That's a finding, not a coincidence to design around three times — it means one parameterized template, not three hand-built pages (carried into §3.5 and §4).

### 2.2 Journeys, with the psychological mechanism named at each transition

**I. Chief of Block Officer — the demo's spine.**
Login → auto-role-detect → lands on Operations Control with the headline metric (33.0 hrs saved) visually dominant within the first screen. *Mechanism:* Von Restorff effect — one high-contrast number against a calm field reads as significant on sight, which matters because a judge's first 3 seconds set their whole evaluation frame. → The existing "Controller Demonstration Operational Flow" stepper (Analyze → Optimize → Review → Coordinate → Select) guides the natural escalation of a skeptical evaluator's own questions. *Mechanism:* progressive disclosure — each phase answers the question the *previous* phase provokes, so curiosity is self-serving rather than requiring narration. → "Why this task?" opens the reasoning modal *in place*, not a full navigation. *Mechanism:* preserves working memory of the underlying list — a full page swap here would force the judge to re-orient, adding switch cost at exactly the moment depth is being demonstrated. → From the modal, "Schedule Block in Planner" deep-links into the Gantt *carrying* the same context. → Approve/Reject in Joint Coordination closes the loop. → Baseline Comparison is reachable at any time as *validation*, not a forced step — different judges want proof at different points in their own evaluation; forcing one order fights that.

**II. Station Master — the forced-choice case worth defending, not cutting.**
Login as SM-001 → a modal *forces* an explicit station selection before anything else loads. Interrogating this: *why must this exist?* Because a station master's job genuinely requires "which desk am I sitting at" to be an explicit, singular commitment — you cannot ambiguously be on duty at two yards simultaneously in real operations. *What if we cut it?* We'd misrepresent how the job actually works. **Verdict: keep it as designed.** This is a case where the interrogation loop confirms an existing decision rather than finding fault with it — not every finding should be a criticism. → Lands on the physical schematic first (space-first, not table-first), matching how a station master actually thinks: platforms/turnouts/signals, not corridor abstractions. → Clicking any track element opens the details drawer *in place*, never full-page. *Mechanism:* a station master's job is holding the whole yard in working memory at once — losing sight of the schematic while reading a spec sheet would be actively counterproductive for this specific role. → "Switch Station" stays reachable in the header at all times, because real station masters do get reassigned or relieve each other mid-shift.

**III. Department Engineer (PWay / S&T / TRD — one journey, run three times).**
Login → Infrastructure directory first (orientation: "here's what I'm responsible for" — a stable reference view). → Toggle to Work Management (action-oriented: "here's what's due"). → Log a defect via the TMS/SMMS/TDMS form. *Critical design point:* this form is often filled out under real operational pressure, sometimes relaying a report a train pilot just phoned in. Every extra required free-text field is a chance for a rushed report to be abandoned or mis-entered — which directly undermines the whole system's early-capture premise. Location fields should default from the department/corridor context already known, not start blank. → The Activity Log functions less as "an audit table" and more as *anxiety reduction* for the person who just filed a report ("did this actually go somewhere — did the Chief approve a block for it?"). That reframing changes a concrete design priority: the most recent entry tied to *this user's own* submission should be visually pinned, not buried in an undifferentiated 900-row timestamp-sorted list.

**IV. Train Pilot — field/mobile, scarcity-constrained.**
Login → lands on Movement Restrictions (read-first, correctly — before departure, "what's different today" outranks "let me file a report"). → Log En-Route Observation is correctly the secondary tab. *Mechanism:* this persona operates under genuine time/attention scarcity (they're driving a train), so Fitts's Law matters most of any persona here — large tap targets, minimal required fields. The current form asks for 3 department checkboxes *and* 3 target-system checkboxes (6 total decisions) for something that could often be a single tap ("this looks like a track problem" auto-checks P.Way + TMS). Recommend smart presets over raw checkbox grids.

### 2.3 Interrogation output — five load-bearing decisions, shown explicitly

**Decision: Keep the forced StationSelectionModal.**
*Why must it exist?* Mirrors a genuine real-world single-assignment constraint. *What if cut?* Misrepresents the job. **Verdict: keep, unchanged in behavior — restyle only.**

**Decision: Merge the Marey diagram's theme into shared design tokens.**
*Why must it change?* Its parchment/charcoal palette is visually disconnected from the rest of the app, undercutting the "we unified the system" thesis. *What if left alone?* The single most-cited inconsistency in the audit stays uncited-but-visible to every judge who opens it. **Verdict: re-derive both existing themes (light and dark) from the same token set; keep both modes — night-shift dark mode is operationally real, not decorative.**

**Decision: Add a "why deferred" content mode to the reasoning modal (net new).**
*Why must it exist?* The backend already computes `reason_code`/`reason_detail` (Part 2.2); today's UI only appears to show "why selected." Pillar 3 is explicitly about explaining *both* directions. *What if cut?* Half of your own explainability principle stays invisible to the one audience most likely to probe it. **Verdict: build it — highest-leverage net-new surface in this blueprint.**

**Decision: Collapse PWay/S&T/TRD into one parameterized template.**
*Why must it change?* Building the same shape three times triples redesign cost and triples the chance of the three copies drifting apart again. *What if left as three hand-built pages?* Exactly the kind of divergence that caused today's fragmentation in the first place. **Verdict: one config-driven component.**

**Decision: Deprioritize the Cmd+K command palette below every other phase.**
*Why consider it at all?* It's a strong pattern for a power user and was implicitly on the table via the "command-bar" paradigm option. *Why cut it from this phase specifically?* A live judge demo is watched, not typed at — an audience following a screen-share cannot see what was typed into a palette, which actively *weakens* the "watch me click through this" narrative a judge-facing demo depends on. **Verdict: valid post-MVP power-user feature; not judge-facing value — sequenced last, if at all, in §4.**

### 2.4 Why this keeps a judge engaged in the first 60 seconds

1. **Primacy/Von Restorff** — one dominant, high-contrast number is the first thing the eye lands on.
2. **Progressive disclosure via the existing 9-phase stepper** — elevate what's already there into the connective spine of the whole redesign, rather than inventing a new onboarding flow.
3. **Provenance badges as an anti-skepticism device** — a hackathon judge is trained to suspect fabricated demos; REAL_PUBLIC/SYNTHETIC badges pre-empt that doubt before it forms, so they deserve *more* visual weight post-redesign, not less.
4. **Switch-fatigue reduction** — the Corridor-Time Console paradigm (§1.2) cuts full-page navigations during a timed walkthrough, which matters enormously for demo pacing.
5. **Fitts's Law on repeat actions** — "Run CP-SAT Optimizer," "Why this task?", "Approve/Reject" get pressed repeatedly live; they should be the largest, most reachable targets on any screen they appear on. Rare actions (Regenerate 50 Blocks, Export) should visually recede.
6. **Recognition over recall via existing department colors** — COA purple, PWAY orange, TRD amber, SNT cyan already exist in your palette. When a presenter switches roles mid-demo (which the login page's account table is clearly built to invite), a judge should re-orient by color alone, without re-reading text.

---

## 3. FULL COMPONENT & EDGE CASE SPECIFICATION (THE ARCHITECTURAL BLUEPRINT)

*Method note:* `UI_INVENTORY_REPORT.md` already documents all 17 routes at the component/element level in real detail. Re-transcribing that here would waste your time. Instead, this section organizes those 17 routes into **six reusable templates**, and specifies the edge cases and consolidation work layered on top of each — which is also what makes the roadmap in §4 tractable.

### 3.1 Global shell (wraps every authenticated route)

- **Navbar:** live IST clock must resync cleanly on tab-wake-from-sleep (a stale clock on a control-room product is a bad look). Role-title truncation is already visibly happening ("Operating Department (Master C…" in the sidebar) — needs a defined truncate+tooltip rule, not silent clipping. Logout while a defect-log form has unsaved input needs a confirm-discard guard.
- **Sidebar:** must render coherently at both 9 items (COA) and 1 item (Train Pilot) — recommend the Safety Protocol callout scale to fill remaining vertical space proportionally at the low end, rather than leaving dead whitespace under one link.
- **Safety Protocol callout:** content already varies correctly per role. Edge case: define a generic fallback ("Follow General & Subsidiary Rules") for any role without a specific statutory note, rather than letting the callout disappear — an empty safety notice is a bad omission for a safety-of-life-adjacent product to ever visually imply.

### 3.2 Template A — Spatial Network Console
*Maps to:* Master Network Map, Corridor Directory, Corridor Detail, Station Schematic, Visual Junction Hubs.
*Pattern:* scope selector → pan/zoom schematic → selected-asset detail panel → asset's own possession ledger.
*Edge cases:*
- Station-count variance across corridors (11 locations on CORR-04 vs. 22 on CORR-03) must render on one canonical layout system, not per-corridor tuning.
- No-selection initial state is ambiguous in the current screenshots (all show a pre-selected station). Recommend explicit "showing: Itarsi Junction (first major hub)" framing so a default choice never reads as a deliberate system recommendation.
- Zero-block corridor state should read as a **success signal** ("No possessions currently required — full track availability"), not a neutral "no data" — a fully-optimized corridor with nothing scheduled is the point of Requirement #3, not an error.
- Junctions shared by two corridors (e.g., Itarsi ends CORR-01 and CORR-03) must resolve to one canonical station record regardless of which corridor's page linked there — a data-consistency edge case, not just visual.

### 3.3 Template B — Temporal Operations Console
*Maps to:* Marey Diagram, Block Planner.
*Pattern:* time-scoped canvas/Gantt + solver-health strip + proposal form + conflict overlay.
*Edge cases — this is where solver honesty (Part 2.3/3.6) needs first-class visual states:*
- Four distinct `solver_status` treatments needed: `OPTIMAL` ("optimal plan confirmed"), `FEASIBLE` time-limited (spec's own example copy: *"best plan found in 8s (97% of estimated optimum)"*), `FALLBACK_HEURISTIC` (must be visually distinct — labeling it as `FEASIBLE` is explicitly called out in the spec as dishonest at the exact moment honesty matters most), and `INFEASIBLE` (should essentially never fire post-Part-3.4 fix, but must still have a defined, non-broken treatment rather than nothing).
- `mandatory_items_dropped > 0` must "flash red" — this is the spec's own literal instruction, not my invention.
- Loading state during an active solve: spec 3.6 explicitly bans a bare spinner. Since a greedy warm-start heuristic already runs in milliseconds as a fallback, the loading state should show that provisional plan immediately with a "refining…" label, then swap in the CP-SAT result at the 8s cap — turning dead wait time into a "watch it improve" moment (which also directly serves §2.4's engagement goal).
- At full adversarial scale (500 trains, the spec's own stress-test number), the Marey canvas needs a defined line-density degradation strategy (auto-dim unselected categories, minimum line-weight floor) rather than becoming illegible.
- *Open question to verify, not an assumed bug:* does editing the proposal form's time window after running "Evaluate Conflicts" invalidate the prior conflict-clear status, or could a stale "no conflict" state silently carry over? On a safety system, a stale green light is one of the worst possible failure modes — worth confirming explicitly during implementation.

### 3.4 Template C — Department Workspace (parameterized)
*Maps to:* PWay, S&T, TRD control pages (structurally identical).
*Pattern:* Infrastructure directory ⇄ Work Management (Current/Weekly/Monthly/Issue/Activity) + defect form.
*Edge cases:*
- One component driven by a per-department config (icon, color, terminology — TMS/SMMS/TDMS — asset fields), with defined defaults for any config field a future department might leave incomplete.
- KM-chainage validation should check against the *actual* selected corridor's length (already known data — Corridor Directory states exact lengths) rather than a generic numeric-only check.
- The nested "two-tier toggle → 5 sub-tabs" pattern should collapse to *one* consistent tab-styling system — but keep the two conceptual levels (static reference vs. active workflow are genuinely different information types); the fix is visual consistency, not flattening a useful hierarchy.

### 3.5 Template D — Coordination & Sanction Desk
*Maps to:* Operations Control home, Joint Coordination Desk, Block Management tabs.
*Pattern:* priority queue/pending approvals + decision buttons + reasoning drill-in + historical ledger.
*Edge cases:*
- Concurrent-approval race: two authorized users acting on the same pending block simultaneously needs an explicit "already resolved by someone else" state on stale buttons, not a silent double-submit.
- Replace the purple/indigo gradient hero with the flat-card system, but preserve its *job* (headline KPI + primary CTA stays the loudest thing on the page) — a flat card can still dominate via size, border weight, and a sparingly-used accent color.
- *Open question:* the S-R-C-A-O breakdown data includes a "Low Tier" count, but the visible filter pills only show ALL/CRITICAL/HIGH/MEDIUM — worth confirming whether Low is filterable or only visible in the summary count.
- The good empty-ledger copy already on Joint Coordination Desk (§1.1) should become the literal template applied everywhere else that currently lacks it.

### 3.6 Template E — Audit & Analytics
*Maps to:* Events History, Maintenance Tasks, Baseline Comparison, Scenario Analysis, and each department's Activity Log (an instance of this template, scoped by department).
*Pattern:* KPI/summary header + filter/search toolbar + dense table or log.
*Edge cases:*
- The core fix: pagination/virtualization + a sane default filter (e.g., Events History defaulting to "today" rather than an unbounded historical scroll).
- Distinguish "no events match your search" from "no events exist yet" — different empty states, different copy.
- Scenario Analysis switching scenarios should visually *diff-highlight* which trains changed status, not silently re-render the whole table — "what changed" is the entire point of a disruption simulator.
- Baseline Comparison: confirm whether the "Show Co-located Windows Only" filter persists or resets across a "Recalculate Baseline" action.
- Maintenance Tasks decisions (Confirm/Override/Reject) should cross-link to their own Events History entry, so clicking a task jumps straight to its filtered audit trail rather than leaving the two views siloed.

### 3.7 Template F — Field/Mobile Console
*Maps to:* Train Pilot workspace.
*Pattern:* restrictions/read view + logging form.
*Edge cases:*
- The inventory's own evidence standard is 1440×900 desktop for all 36 screenshots — meaning this page's stated "mobile-responsive" design has not actually been visually verified at a phone/tablet width by the audit itself. Worth testing early rather than assuming.
- Poor-connectivity submission: a train in a cutting or tunnel is a realistic dead zone. A silently-lost safety observation (rail fracture, OHE damage) is a genuine safety-adjacent gap, not a nicety — recommend an offline-safe queue/retry and a submit-idempotency guard against double-taps on a shaky connection.
- The 6-checkbox department/system selection (§2.2.IV) should gain smart single-tap presets.

### 3.8 Overlay systems — edge cases

| Overlay | Edge case |
|---|---|
| BlockReasoningModal | Needs the new "why deferred" content mode (§2.3) alongside the existing "why selected" mode. |
| StationSelectionModal | If a station master's assigned station is ever removed/renamed between sessions, must fail gracefully to a current-roster picker, not error. |
| TrainDetailDrawer | A through-running express with no stops in the visible corridor window still needs a sensible drawer state. |
| StationDetailsDrawer | An asset showing "Possession Locked" mid-click should link back to *which* block/task locked it — tying back into Template D rather than stating the fact in isolation. |
| Pilot Observation form | Duplicate-submit guard on shaky connections — disable-on-submit, given the safety stakes raised above. |

### 3.9 Role-access matrix (derived directly from the inventory's stated authorized roles)

| Route | COA | COR | SM | PWAY | SNT | TRD | TRAIN |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| /operations-control | ✓ | | | | | | |
| /baseline-comparison | ✓ | ✓ | | | | | |
| /marey-diagram | ✓ | ✓ | | | | | |
| /block-planner | ✓ | | | | | | |
| /coordination | ✓ | | | | | | |
| /control | ✓ | ✓ | | | | | |
| /corridors, /corridors/:id | ✓ | ✓ | | | | | |
| /station-master | ✓ | | ✓ | | | | |
| /pway-control | | | | ✓ | | | |
| /snt-control | | | | | ✓ | | |
| /trd-control | | | | | | ✓ | |
| /train-pilot | | | | | | | ✓ |
| /maintenance | ✓ | | | | | | |
| /scenario-analysis | ✓ | | | | | | |
| /events | ✓ | | | | | | |

Note the real boundary this exposes: **Corridor Master can view impact data and navigate corridors but cannot run the optimizer, approve joint coordination, or see the audit trail.** This needs an explicit, designed "not authorized for this workspace" state (not a generic 404) for any role hitting a route outside its row — the inventory names `ProtectedRoute`/`RootRedirect` as existing guard components, so this is likely a routing-level behavior already; the *copy and visual treatment* when it fires isn't described anywhere, and is worth deciding deliberately for a judged demo.

### 3.10 Cross-cutting edge-case taxonomy (your named categories, answered directly)

- **Dynamic network state drops:** TanStack Query already supports refetch-on-reconnect natively — this is mostly a matter of surfacing a connectivity-lost banner visually, not new engineering.
- **Empty database states:** consolidated rule — every empty state must (a) name what's empty in domain terms, (b) frame it as good/neutral where applicable (per the "success signal" point in §3.2), and (c) offer one next action.
- **Loading states for intensive calculations:** the CP-SAT-aware "provisional plan, refining…" pattern from §3.3, generalized to any other slow backend computation (baseline recalculation, macro bucket regeneration).
- **String overflows in data cells:** one canonical truncate+tooltip pattern for desktop, truncate+tap-to-expand for touch contexts (tooltips don't work for a station master or pilot on a tablet) — a single Phase 1 primitive, not a per-page patch.
- **Form validation handling:** inline, field-level checks mirroring the backend's own stated rule (Part 8.2: START < END, END > NOW) so the error surfaces before submit, not after a round trip.
- **Unauthorized role access blocks:** one canonical "not authorized for this workspace" state per §3.9, with a clear path back to the user's own default workspace.

---

## 4. THE ANTIGRAVITY ROADMAP (THE AGENT PIPELINE)

Ordered by dependency, not by page count. No prompts below — just the phase structure we'll slice into Antigravity prompts next.

| # | Phase | Key deliverables | Depends on | Why sequenced here | Visual impact if we stop here |
|---|---|---|---|---|---|
| 0 | Design Token Foundation | Semantic colors (incl. the 4 lock-type colors + department colors already established), typography scale, spacing/radius/shadow scale, light+dark theme variables | — | Everything downstream consumes these; changing them later invalidates finished work | Low (invisible alone) |
| 1 | Core Primitive Library | Button (4 canonical variants), Badge (role/dept/lock-type/provenance/solver-status), Card, unified Tabs, virtualized+paginated Table, Modal/Drawer shell, Empty State, CP-SAT-aware Loading state | 0 | Every template below is *built from* these; building templates first means rebuilding primitives 6 times | Low alone — highest-leverage engineering phase in the roadmap |
| 2 | Global Shell Re-skin | Navbar, Sidebar (1-to-9-item graceful scaling), Safety Callout with fallback rule | 0, 1 | Every route inherits this frame — fixed once, fixes the wrapper of all 17 routes at once | **High** |
| 3 | Auth Guard & Access-Matrix Formalization | The §3.9 matrix as an explicit guard layer + "not authorized" state | 1 | Low visual risk, unblocks safely testing every later phase as any of the 8 demo personas | Low visually, high risk-reduction |
| 4 | Spatial Network Console (Template A) | Master Network Map, Corridor Directory/Detail, Station Schematic, Junction Hubs | 0, 1, 2 | Biggest, most "wow" surface for a judge — tackled while build-time budget is highest | **High** |
| 5 | Temporal Operations Console (Template B) | Marey re-theme (tokens, keep both light/dark), Block Planner re-skin, solver-status/gap%/dropped-item states | 0, 1 | Diagnosis finding #1 — highest "does this look unified" payoff per hour spent | **High** |
| 6 | Coordination & Sanction Desk (Template D) | Operations Control home, Joint Coordination Desk, Block Management tabs | 1, 2, 4, 5 | It's the first screen after login for the most judge-visible role, and deep-links into both 4 and 5 | **High** — it's the home screen |
| 7 | Explainability Expansion | "Why deferred" modal mode, reason-code iconography, Maintenance Tasks ↔ Events cross-linking | 1, 6 | Genuinely net-new — should land once the visual system is stable, or it gets rebuilt against shifting tokens | Medium visually, **high substantive value** — don't deprioritize on looks alone |
| 8 | Department Workspace Template (parameterized) | One config-driven component replacing 3 hand-built pages | 1, 2, 3 | Real refactor risk — benefits from every primitive already being locked | Medium (3 screens at once) |
| 9 | Macro/Long-Range Planning Surface | Net-new view of `macro_allocation_calendar`, explicit advisory framing, `unassignable_before_deadline` states | 1, 6 | Additive scope tied to Requirement #4 specifically; sequenced once the daily/micro view is solid so it doesn't compete for attention early | Medium, but high judge-relevance (one of only 4 explicit requirements, currently under-differentiated) |
| 10 | Field/Mobile Console | Train Pilot responsive pass, smart-preset checkboxes, submit-safety guard | 1 | Smallest, most isolated surface — nothing else depends on it, good fill-in if earlier phases run long | Low–Medium |
| 11 | Audit & Analytics Template | Events History, Maintenance Tasks, Baseline Comparison, Scenario Analysis, department Activity Logs | 1, 8 | Structurally near-identical, batched together; hard dependency on the virtualized-table primitive | Medium overall, **high specifically for Baseline Comparison** — arguably the single most important "prove the math" page (Part 7.3) |
| 12 | Cross-Cutting Edge-Case Hardening | Systematic verification of empty/loading/error/overflow/unauthorized/adversarial-scale states against §3.10; explicit rehearsal of the spec's own 3 demo scenarios | 4–11 | Can't harden templates that don't exist yet — this is literally spec Part 3.6's own demo-day checklist | Not new visually — but skipping it risks the exact failure (a crash/blank screen) the architecture was built to prevent |
| 13 | Motion & Narrative Polish | Framer Motion scoped per §2.4, elevate the existing 9-phase stepper into the connective spine, final rehearsal | Everything | Motion on a structurally-shifting UI is wasted rework — correctly last | Medium polish, **high specifically for live-demo pacing** |

---

That's the blueprint, fully grounded in what's actually built and what's actually specified. Whenever you're ready, we start slicing Phase 0 into the first Antigravity prompt — just say the word and I'll switch back into prompt-engineer mode. If it'd help to have this whole blueprint saved as a standing reference doc we check off phase by phase, I can do that too.