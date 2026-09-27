import React, { useState } from "react";
import {
  Button,
  DepartmentBadge,
  LockTypeBadge,
  ProvenanceBadge,
  RoleBadge,
  SolverStatusBadge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  MetricCard,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
  ModalDrawer,
  ModalDrawerTrigger,
  ModalDrawerContent,
  ModalDrawerHeader,
  ModalDrawerTitle,
  ModalDrawerDescription,
  ModalDrawerBody,
  ModalDrawerFooter,
  EmptyState,
  LoadingState,
} from "../../components/ui";
import {
  Sun,
  Moon,
  Sparkles,
  Zap,
  Play,
  Check,
  Trash2,
  Layers,
  Clock,
  Cpu,
  ShieldCheck,
  Train,
  Sliders,
  Inbox,
  Filter
} from "lucide-react";

export const ComponentGalleryPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [buttonLoading, setButtonLoading] = useState(false);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // Sample table data
  const sampleBlocks = [
    { id: "BLK-01", type: "RULING", dept: "PWAY", section: "Vidisha – Sorai", time: "11:00 – 14:00", dur: "180m", solver: "OPTIMAL" },
    { id: "BLK-02", type: "SHADOW", dept: "TRD", section: "Bhopal – Misrod", time: "12:30 – 15:00", dur: "150m", solver: "FEASIBLE" },
    { id: "BLK-03", type: "EMERGENT", dept: "SNT", section: "Midghat – Barkhera", time: "09:00 – 10:30", dur: "90m", solver: "FALLBACK_HEURISTIC" },
    { id: "BLK-04", type: "PLANNED", dept: "PWAY", section: "Itarsi – Narmadapuram", time: "13:00 – 16:00", dur: "180m", solver: "OPTIMAL" },
    { id: "BLK-05", type: "PLANNED", dept: "COA", section: "Bina – Mandi Bamora", time: "14:00 – 17:00", dur: "180m", solver: "INFEASIBLE" },
    { id: "BLK-06", type: "SHADOW", dept: "TRD", section: "Budni – Midghat", time: "10:00 – 12:00", dur: "120m", solver: "FEASIBLE" },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-body)] text-[var(--text-primary)] p-4 sm:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Gallery Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-[var(--radius-xl)] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-xs">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[var(--text-floor)] font-mono font-bold uppercase tracking-wider text-[var(--brand-navy)] bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800">
                PHASE 1 PRIMITIVE LIBRARY
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                /dev/component-gallery
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
              KrayaSetu AI Component Gallery
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Isolated verification showcase of all 8 core primitives themed via Phase 0 design tokens.
            </p>
          </div>

          <Button
            variant="secondary"
            size="default"
            onClick={toggleTheme}
            leftIcon={isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          >
            <span>Switch to {isDark ? "Light Theme" : "Dark Theme"}</span>
          </Button>
        </div>

        {/* SECTION 1: BUTTONS */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              1. Button Primitive (4 Canonical Variants + Sizes + States)
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setButtonLoading(!buttonLoading)}
            >
              Toggle Loading State ({buttonLoading ? "Active" : "Off"})
            </Button>
          </div>

          <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-6">
            {/* Primary Action */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Primary Action Variant (Deep Navy `#0b2545`)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="large" isLoading={buttonLoading} leftIcon={<Play className="w-4 h-4" />}>
                  Run CP-SAT Optimizer (Large)
                </Button>
                <Button variant="primary" size="default" isLoading={buttonLoading} leftIcon={<Sparkles className="w-4 h-4" />}>
                  Evaluate Conflicts (Default)
                </Button>
                <Button variant="primary" size="sm" isLoading={buttonLoading}>
                  Submit (Small)
                </Button>
                <Button variant="primary" disabled>
                  Disabled Primary
                </Button>
              </div>
            </div>

            {/* Secondary / Neutral */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Secondary / Neutral Variant (Surface Card / Subtle Border)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="large">
                  Recalculate Baseline (Large)
                </Button>
                <Button variant="secondary" size="default" leftIcon={<Filter className="w-4 h-4" />}>
                  Filter Corridor (Default)
                </Button>
                <Button variant="secondary" size="sm">
                  Cancel (Small)
                </Button>
                <Button variant="secondary" disabled>
                  Disabled Secondary
                </Button>
              </div>
            </div>

            {/* Destructive & Success */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Semantic Variants: Destructive / Override (Red) & Success / Endorsement (Emerald)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="success" size="large" leftIcon={<Check className="w-5 h-5" />}>
                  Approve Traffic Possession (Large)
                </Button>
                <Button variant="success" size="default">
                  Endorse Multi-Dept Window
                </Button>
                <Button variant="destructive" size="large" leftIcon={<Trash2 className="w-5 h-5" />}>
                  Reject Block Proposal (Large)
                </Button>
                <Button variant="destructive" size="default">
                  Cancel Possession
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: BADGES */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              2. Badge Primitive (5 Distinct Token-Driven Families)
            </h2>
          </div>

          <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-6">
            {/* Family 1: Department Badges */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Family 1: Department Badges (--dept-* tokens)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <DepartmentBadge department="COA" />
                <DepartmentBadge department="PWAY" />
                <DepartmentBadge department="TRD" />
                <DepartmentBadge department="SNT" />
                <DepartmentBadge department="PWAY" size="sm" />
                <DepartmentBadge department="TRD" size="sm" />
              </div>
            </div>

            {/* Family 2: Lock-Type Badges */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Family 2: Four Railway Lock-Type Badges (--lock-* tokens)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <LockTypeBadge type="RULING" />
                <LockTypeBadge type="PLANNED" />
                <LockTypeBadge type="EMERGENT" />
                <LockTypeBadge type="SHADOW" />
                <LockTypeBadge type="RULING" size="sm" />
                <LockTypeBadge type="EMERGENT" size="sm" />
              </div>
            </div>

            {/* Family 3: Provenance Badges */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Family 3: Provenance Badges (Prominent Trust-Building Badges)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <ProvenanceBadge type="REAL_PUBLIC" />
                <ProvenanceBadge type="SYNTHETIC" />
                <ProvenanceBadge type="DERIVED" />
                <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
              </div>
            </div>

            {/* Family 4: Role Personas */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Family 4: Official Railway Persona Badges (8 Demo Roles)
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <RoleBadge persona="COA-001" />
                <RoleBadge persona="COR-001" />
                <RoleBadge persona="SM-001" />
                <RoleBadge persona="PWAY-001" />
                <RoleBadge persona="PWAY-002" />
                <RoleBadge persona="SNT-001" />
                <RoleBadge persona="TRD-001" />
                <RoleBadge persona="TRAIN-001" />
              </div>
            </div>

            {/* Family 5: Solver-Status Badges */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)]">
                Family 5: Solver-Status Badges (Safety-Critical Distinct States)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <SolverStatusBadge status="OPTIMAL" />
                <SolverStatusBadge status="FEASIBLE" />
                <SolverStatusBadge status="FALLBACK_HEURISTIC" />
                <SolverStatusBadge status="INFEASIBLE" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CARDS & METRIC CARDS */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              3. Card & MetricCard Primitives
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Downtime Hours Saved"
              value="33.0"
              unit="hours"
              delta={{ value: "+24.9%", trend: "positive" }}
              subtext="vs. Uncoordinated baseline"
              icon={<Clock className="w-5 h-5 text-[var(--status-success)]" />}
              badge={<ProvenanceBadge type="DERIVED" size="sm" />}
            />

            <MetricCard
              title="Track Windows Eliminated"
              value="14"
              unit="windows"
              delta={{ value: "64 → 50", trend: "positive" }}
              subtext="Bundled possessions"
              icon={<Layers className="w-5 h-5 text-[var(--dept-coa)]" />}
            />

            <MetricCard
              title="Aggregate Delay Risk"
              value="0"
              unit="mins"
              delta={{ value: "Zero conflicts", trend: "neutral" }}
              subtext="Full passenger protection"
              icon={<ShieldCheck className="w-5 h-5 text-[var(--status-info)]" />}
            />

            <MetricCard
              title="Active CP-SAT Status"
              value="Optimal"
              delta={{ value: "8.0s solve", trend: "positive" }}
              subtext="Mathematical proof"
              icon={<Cpu className="w-5 h-5 text-[var(--brand-navy)]" />}
              badge={<SolverStatusBadge status="OPTIMAL" size="sm" />}
            />
          </div>

          {/* Standard Content Card */}
          <Card hoverable className="p-0 overflow-hidden">
            <CardHeader>
              <CardTitle>Bhopal Division Central Trunk Line (CORR-01)</CardTitle>
              <CardDescription>
                Detailed track geometry, electrification status, and engineering line string.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono text-[var(--text-secondary)]">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span>Route Length:</span>
                <strong className="text-[var(--text-primary)]">92.0 Route KM (Double/Triple Mainline)</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span>Traction:</span>
                <strong className="text-[var(--text-primary)]">25 kV AC 50 Hz Traction Distribution (TRD)</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>Interlocking:</span>
                <strong className="text-[var(--text-primary)]">Siemens & Kyosan CENELEC SIL-4 Electronic Interlocking</strong>
              </div>
            </CardContent>
            <CardFooter>
              <span className="text-[var(--text-floor)] font-mono text-[var(--text-muted)]">
                Verified: Bhopal Division Official WTT (2026)
              </span>
              <Button variant="primary" size="sm">
                Open Section Detail
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* SECTION 4: TABS PRIMITIVE */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              4. Tabs Primitive (Unified Pills vs. Underlined Styles)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pills Style */}
            <Card className="p-5 space-y-4">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] block">
                Variant 1: Pills Style (Department / Mode Selectors)
              </span>
              <Tabs defaultValue="all" variant="pills">
                <TabsList>
                  <TabsTrigger value="all">All Departments</TabsTrigger>
                  <TabsTrigger value="pway" icon={<DepartmentBadge department="PWAY" size="sm" showIcon={false} />}>
                    Civil P.Way
                  </TabsTrigger>
                  <TabsTrigger value="trd" icon={<DepartmentBadge department="TRD" size="sm" showIcon={false} />}>
                    Traction TRD
                  </TabsTrigger>
                  <TabsTrigger value="snt" icon={<DepartmentBadge department="SNT" size="sm" showIcon={false} />}>
                    Signal S&T
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  Displaying combined cross-departmental maintenance possession windows.
                </TabsContent>
                <TabsContent value="pway" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  Displaying 28 track machine, tamping, and ultrasound rail flaw inspections.
                </TabsContent>
                <TabsContent value="trd" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  Displaying 12 OHE power isolation, cantilever adjustment, and neutral section windows.
                </TabsContent>
                <TabsContent value="snt" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  Displaying 24 point machine overhaul, DAC maintenance, and signal lamp replacements.
                </TabsContent>
              </Tabs>
            </Card>

            {/* Underlined Style */}
            <Card className="p-5 space-y-4">
              <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] block">
                Variant 2: Underlined Style (Dashboard / Page Sub-Views)
              </span>
              <Tabs defaultValue="map" variant="underlined">
                <TabsList>
                  <TabsTrigger value="map" icon={<Layers className="w-4 h-4" />}>
                    Topographic Map
                  </TabsTrigger>
                  <TabsTrigger value="schematic" icon={<Train className="w-4 h-4" />}>
                    Yard Schematic
                  </TabsTrigger>
                  <TabsTrigger value="ledger" icon={<Sliders className="w-4 h-4" />} badge={<span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 text-sky-800">50</span>}>
                    Block Ledger
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  Topographic geographic map canvas active for Bhopal Division.
                </TabsContent>
                <TabsContent value="schematic" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  Station yard layout rendering platforms, turnouts, and signal clearance limits.
                </TabsContent>
                <TabsContent value="ledger" className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono">
                  50 canonical block proposals registered in division ledger.
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </section>

        {/* SECTION 5: TABLE & PAGINATION */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              5. Table & TablePagination Primitives
            </h2>
          </div>

          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block ID</TableHead>
                  <TableHead>Lock Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Corridor Section</TableHead>
                  <TableHead>Requested Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Solver State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleBlocks.map((blk) => (
                  <TableRow key={blk.id}>
                    <TableCell className="font-mono font-bold text-[var(--text-primary)]">{blk.id}</TableCell>
                    <TableCell><LockTypeBadge type={blk.type} size="sm" /></TableCell>
                    <TableCell><DepartmentBadge department={blk.dept} size="sm" /></TableCell>
                    <TableCell className="font-medium">{blk.section}</TableCell>
                    <TableCell className="font-mono">{blk.time}</TableCell>
                    <TableCell className="font-mono font-bold">{blk.dur}</TableCell>
                    <TableCell><SolverStatusBadge status={blk.solver} size="sm" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalPages={10}
              totalItems={50}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </section>

        {/* SECTION 6: MODAL & DRAWER SHELL */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              6. Modal / Drawer Shell Primitive (Centered Modal vs. Slide-Over Drawer)
            </h2>
          </div>

          <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--surface-card)] border border-[var(--border-subtle)] flex flex-wrap gap-4">
            {/* Centered Modal */}
            <ModalDrawer presentation="modal">
              <ModalDrawerTrigger asChild>
                <Button variant="primary" size="default">
                  Open Centered Modal Demo
                </Button>
              </ModalDrawerTrigger>
              <ModalDrawerContent>
                <ModalDrawerHeader>
                  <ModalDrawerTitle>Operational Decision Rationale (S-R-C-A-O)</ModalDrawerTitle>
                  <ModalDrawerDescription>
                    Structured explainability breakdown answering the 5 official SIH Judge Questions.
                  </ModalDrawerDescription>
                </ModalDrawerHeader>
                <ModalDrawerBody>
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-xs font-mono space-y-2">
                    <div><strong>Situation:</strong> Ultrasonic Rail Flaw at KM 848.2 (Bhopal – Vidisha).</div>
                    <div><strong>Recommendation:</strong> Schedule 180-minute co-located window at 12:00.</div>
                    <div><strong>Constraints Satisfied:</strong> Zero conflicts with #12002 Shatabdi.</div>
                  </div>
                </ModalDrawerBody>
                <ModalDrawerFooter>
                  <Button variant="secondary" size="default">Close</Button>
                  <Button variant="primary" size="default">Confirm Sanction</Button>
                </ModalDrawerFooter>
              </ModalDrawerContent>
            </ModalDrawer>

            {/* Slide-Over Drawer */}
            <ModalDrawer presentation="drawer">
              <ModalDrawerTrigger asChild>
                <Button variant="secondary" size="default">
                  Open Slide-Over Drawer Demo
                </Button>
              </ModalDrawerTrigger>
              <ModalDrawerContent>
                <ModalDrawerHeader>
                  <ModalDrawerTitle>Train Telemetry Inspector</ModalDrawerTitle>
                  <ModalDrawerDescription>
                    Live GPS radar speed and headway tracker for #12002 Shatabdi Express.
                  </ModalDrawerDescription>
                </ModalDrawerHeader>
                <ModalDrawerBody>
                  <div className="space-y-3 text-xs font-mono">
                    <div className="p-3 rounded bg-[var(--surface-secondary)] flex justify-between">
                      <span>Speed:</span>
                      <strong>130 km/h</strong>
                    </div>
                    <div className="p-3 rounded bg-[var(--surface-secondary)] flex justify-between">
                      <span>Status:</span>
                      <strong className="text-[var(--status-success-text)]">ON TIME</strong>
                    </div>
                    <div className="p-3 rounded bg-[var(--surface-secondary)] flex justify-between">
                      <span>Next Station ETA:</span>
                      <strong>Bhopal Jn (BPL) in 12 min</strong>
                    </div>
                  </div>
                </ModalDrawerBody>
                <ModalDrawerFooter>
                  <Button variant="secondary" size="default">Dismiss</Button>
                </ModalDrawerFooter>
              </ModalDrawerContent>
            </ModalDrawer>
          </div>
        </section>

        {/* SECTION 7: EMPTY STATE */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              7. Empty State Primitive
            </h2>
          </div>

          <EmptyState
            icon={<Inbox className="w-8 h-8 text-[var(--brand-canvas-blue)]" />}
            title="No Pending Block Clearance Requests"
            description="All multi-disciplinary track possession requests across Civil P.Way, Traction TRD, and Signal S&T have been reviewed and sanctioned. No outstanding possession requests require action."
            actionLabel="Create New Block Proposal"
            onAction={() => alert("Action triggered: Create proposal")}
            advisoryNote="Statutory Rule: Divisional block permits expire after 240 minutes if unexercised."
          />
        </section>

        {/* SECTION 8: LOADING STATE */}
        <section className="space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono uppercase">
              8. Loading State Primitive (CP-SAT Aware Solver Loading)
            </h2>
          </div>

          <LoadingState
            variant="cpsat"
            title="CP-SAT Multi-Department Optimizer Active…"
            subtitle="Resolving spatial-temporal possession windows for 50 canonical blocks across 5 Bhopal corridors."
            elapsedSeconds={3.4}
            maxSeconds={8.0}
            provisionalScore={{
              blocksScheduled: 48,
              totalBlocks: 50,
              delayMinutes: 0,
              hoursSaved: 33.0,
            }}
          />
        </section>
      </div>
    </div>
  );
};
