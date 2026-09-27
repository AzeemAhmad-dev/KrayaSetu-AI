import React, { useState, useEffect } from "react";
import { 
  Hammer, 
  Layers, 
  Building2, 
  ShieldCheck, 
  Calendar, 
  CalendarRange, 
  AlertTriangle,
  Sliders,
  History,
  Clock,
  Sun,
  Moon
} from "lucide-react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { DepartmentTaskSection } from "../components/department/DepartmentTaskSection";
import { DepartmentProblemSection } from "../components/department/DepartmentProblemSection";
import { DepartmentActivityLog } from "../components/department/DepartmentActivityLog";
import { api } from "../services/api";
import { BlockData } from "../types";
import { RoleBlockTable } from "../components/blocks/RoleBlockTable";
import { Button, Tabs, TabsList, TabsTrigger } from "../components/ui";

export const EngineeringPWayControl: React.FC = () => {
  // Theme state synchronized with document.documentElement
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get("theme");
      if (urlTheme === "dark" || urlTheme === "light") return urlTheme;
      const saved = localStorage.getItem("app-theme");
      if (saved === "dark" || saved === "light") return saved;
      if (document.documentElement.getAttribute("data-theme") === "dark") return "dark";
    }
    return "light";
  });

  const handleThemeToggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("app-theme", next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

  // Navigation State: Infrastructure workspace (main) vs dedicated Department Control workspace
  const [activeWorkspace, setActiveWorkspace] = useState<"infrastructure" | "control">("infrastructure");
  const [controlTab, setControlTab] = useState<"current" | "monthly" | "weekly" | "issues" | "activity">("current");
  const [blocks, setBlocks] = useState<BlockData[]>([]);

  React.useEffect(() => {
    api.getBlocks(undefined, undefined, "PWAY", undefined, undefined, true)
      .then(setBlocks)
      .catch((err) => console.error("Failed to load P.Way blocks", err));
  }, []);

  const [selectedAsset, setSelectedAsset] = useState<any>({
    id: "SEC-BPL-ET",
    name: "Bhopal – Itarsi 3rd Line Section",
    rail: "60 kg 90 UTS (LWR)",
    sleeper: "PSC-1660 / KM",
    ballast: "300 mm Clean Stone",
    speed: 130,
  });

  const TRACK_SECTIONS = [
    { id: "SEC-ET-NDPM", name: "Itarsi – Narmadapuram Up/Down Main", lengthKm: 18.2, rail: "60 kg 90 UTS", sleeper: "PSC-1660", ballast: "300mm", speed: 130 },
    { id: "SEC-NDPM-RKMP", name: "Narmadapuram – Rani Kamlapati (Ghat)", lengthKm: 65.4, rail: "60 kg 90 UTS", sleeper: "PSC-1660", ballast: "350mm", speed: 110 },
    { id: "SEC-RKMP-BPL", name: "Rani Kamlapati – Bhopal Jn Quad", lengthKm: 6.2, rail: "60 kg 90 UTS", sleeper: "PSC-1660", ballast: "300mm", speed: 100 },
    { id: "SEC-BPL-BHS", name: "Bhopal Jn – Vidisha 3rd Line", lengthKm: 54.1, rail: "60 kg 90 UTS", sleeper: "PSC-1660", ballast: "300mm", speed: 130 },
    { id: "SEC-BHS-BINA", name: "Vidisha – Bina Jn High-Speed", lengthKm: 85.3, rail: "60 kg 90 UTS", sleeper: "PSC-1660", ballast: "300mm", speed: 130 },
  ];

  const MAJOR_BRIDGES = [
    { id: "BR-382", name: "Narmada River Bridge (NDPM)", km: 18.2, spans: "14 x 45.7m Steel Through Girders", type: "MAJOR WATERWAY", pierType: "Mass Concrete Well Foundation" },
    { id: "BR-512", name: "Betwa River Bridge (BHS)", km: 148.6, spans: "9 x 30.5m Composite Plate Girders", type: "MAJOR WATERWAY", pierType: "Reinforced Concrete Piers" },
    { id: "BR-604", name: "Bina River Viaduct (BINA)", km: 214.1, spans: "6 x 24.4m Pre-stressed Concrete Girders", type: "MAJOR WATERWAY", pierType: "Raft Foundation on Rock" },
    { id: "BR-220", name: "Tawa River Bridge (ET Approach)", km: 8.4, spans: "12 x 30.5m Steel Open Web Girders", type: "MAJOR WATERWAY", pierType: "Well Foundation" },
  ];

  const PWAY_LOCATION_OPTIONS = [
    "Itarsi – Narmadapuram Up/Down Main",
    "Narmadapuram – Rani Kamlapati (Ghat Section)",
    "Rani Kamlapati – Bhopal Jn Quad Track",
    "Bhopal Jn – Vidisha 3rd Line Section",
    "Vidisha – Bina Jn High-Speed Mainline",
    "Khandwa – Harda Feeder Track",
    "Bhopal Station Yard",
    "Itarsi Station Yard",
    "Rani Kamlapati (RKMP) Yard",
    "Bina Junction Yard",
    "Narmada River Bridge (KM 18.2)",
    "Betwa River Bridge (KM 148.6)",
  ];

  const PWAY_PROBLEM_CATEGORIES = [
    "Rail Surface / Gauge Deviation",
    "Weld Joint Defect / USFD Flaw",
    "Ballast Deficiency / Fouling",
    "Sleeper / Fastening Damage",
    "Turnout / Switch & Crossing Geometry",
    "Bridge Structure / Pier / Bearing",
    "Level Crossing Track Roughness",
    "Track Settlement / Formation Instability",
    "Fishplate / Gap Lubrication Issue",
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans min-h-screen bg-[var(--surface-body)] text-[var(--text-primary)] transition-colors" data-theme={theme}>
      {/* 1. TOP HEADER */}
      <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[var(--brand-navy)] text-white flex-shrink-0">
              <Hammer className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold">
                Civil Engineering Department · Permanent Way Infrastructure
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                TRACK / P.WAY WORKSPACE & ASSET DIRECTORY (BPL DIVISION)
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleThemeToggle}
              leftIcon={theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              className="border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold"
            >
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </Button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[var(--text-secondary)]">
            <div>
              Rail Profile: <strong>60 kg 90 UTS (LWR/CWR)</strong>
            </div>

            <div>
              Sleepers: <strong>PSC-1660 / KM Density</strong>
            </div>

            <div>
              Ballast Cushion: <strong>300 mm Deep Stone Cushion</strong>
            </div>

            <div>
              Route Coverage: <strong>720+ Track KM Verified</strong>
            </div>

            <div>
              Major Bridges: <strong>140+ Engineered Structures</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-bold">
              INFRASTRUCTURE: VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY WORKSPACE NAVIGATION */}
      <div className="bg-[var(--surface-card)] p-2 sm:p-2.5 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
        <Tabs
          value={activeWorkspace}
          onValueChange={(val) => setActiveWorkspace(val as "infrastructure" | "control")}
          variant="pills"
          className="w-full min-w-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 w-full min-w-0">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <TabsList className="bg-transparent border-0 p-0 space-x-2 overflow-visible min-w-max">
                <TabsTrigger
                  value="infrastructure"
                  icon={<Layers className="w-4 h-4" />}
                  badge={
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      Main
                    </span>
                  }
                  className="px-4 py-2 text-xs sm:text-sm font-bold"
                >
                  <span>Track / P.Way Infrastructure</span>
                </TabsTrigger>
                <TabsTrigger
                  value="control"
                  icon={<Sliders className="w-4 h-4" />}
                  badge={
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      Work Management
                    </span>
                  }
                  className="px-4 py-2 text-xs sm:text-sm font-bold"
                >
                  <span>Track / P.Way Control</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="text-xs font-mono text-[var(--text-muted)] hidden sm:block pr-2 flex-shrink-0">
              {activeWorkspace === "infrastructure"
                ? "Track Sections, Major Bridges & Asset Specs"
                : "Monthly, Weekly & Issue Management"}
            </div>
          </div>
        </Tabs>
      </div>

      {/* 3. WORKSPACE 1: DEPARTMENT INFRASTRUCTURE (MAIN WORKSPACE) */}
      {activeWorkspace === "infrastructure" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-secondary)] px-4 py-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[var(--text-primary)] uppercase">Track / P.Way Infrastructure Directory</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-muted)]">Underlying permanent way engineering records & specifications</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-bold">
              3 ASSET CATALOGS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Panel 1: Track Sections Engineering Inventory */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
                  <Layers className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>Track Sections ({TRACK_SECTIONS.length})</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">60kg CWR Profile</span>
              </div>

              <div className="p-3 divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[360px] text-xs font-mono">
                {TRACK_SECTIONS.map((sec) => (
                  <div
                    key={sec.id}
                    className={`py-2.5 first:pt-0 cursor-pointer px-2 rounded-lg transition-colors ${
                      selectedAsset?.id === sec.id ? "bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800" : "hover:bg-[var(--surface-secondary)]"
                    }`}
                    onClick={() => setSelectedAsset(sec)}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--text-primary)]">{sec.name}</span>
                      <span className="text-orange-700 dark:text-orange-400 text-[10px]">{sec.speed} km/h</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {sec.lengthKm} KM · {sec.rail} · {sec.sleeper}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Major Bridges & Engineered Structures */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
                  <Building2 className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                  <span>Major Bridges & Viaducts ({MAJOR_BRIDGES.length})</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Span Details</span>
              </div>

              <div className="p-3 divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[360px] text-xs font-mono">
                {MAJOR_BRIDGES.map((b) => (
                  <div
                    key={b.id}
                    className={`py-2.5 first:pt-0 cursor-pointer px-2 rounded-lg transition-colors ${
                      selectedAsset?.id === b.id ? "bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800" : "hover:bg-[var(--surface-secondary)]"
                    }`}
                    onClick={() => setSelectedAsset(b)}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--text-primary)]">{b.name}</span>
                      <span className="text-sky-700 dark:text-sky-400 text-[10px]">{b.id}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{b.spans}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{b.pierType}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: Asset Engineering Inspector (Selected Asset) */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Asset Technical Profile</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{selectedAsset?.id || "Asset"}</span>
              </div>

              <div className="p-4 space-y-3 text-xs font-mono">
                <div className="p-2.5 bg-[var(--surface-secondary)] rounded border border-[var(--border-subtle)]">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Selected Asset</div>
                  <div className="font-bold text-[var(--text-primary)] text-sm mt-0.5">{selectedAsset?.name}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Rail Section:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.rail || selectedAsset?.spans || "60 kg 90 UTS"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Sleeper Type:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.sleeper || selectedAsset?.pierType || "PSC Monoblock"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Permitted Speed:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.speed ? `${selectedAsset.speed} km/h` : "130 km/h"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Ballast Depth:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.ballast || "300 mm Clean Stone"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* P.Way Track Maintenance Blocks & Possessions */}
          <RoleBlockTable
            blocks={blocks}
            title="P.Way Track Maintenance Blocks & Possessions"
            subtitle="Civil engineering track possessions, tamping slots, and rail defect repair blocks (Single Source of Truth)"
            emptyMessage="No P.Way maintenance blocks are currently active or awaiting clearance."
          />
        </div>
      )}

      {/* 4. WORKSPACE 2: DEPARTMENT CONTROL (DEDICATED WORK-MANAGEMENT AREA) */}
      {activeWorkspace === "control" && (
        <div className="space-y-4">
          {/* Structured Navigation Area: [Department] Control ├── Monthly ├── Weekly └── Issue Log */}
          <div className="bg-[var(--surface-card)] p-3.5 sm:p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-[var(--text-muted)] font-bold">CONTROL AREA:</span>
                <span className="text-sm font-black text-[var(--text-primary)] uppercase">Track / P.Way Control</span>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-xs font-mono font-bold text-[var(--brand-navy)] dark:text-sky-400 uppercase">
                  {controlTab === "current" ? "Current / Due Now" : controlTab === "monthly" ? "Monthly" : controlTab === "weekly" ? "Weekly" : controlTab === "issues" ? "Issue Log" : "Activity Log"}
                </span>
              </div>

              {/* Visual hierarchy tree */}
              <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-secondary)] px-3 py-1 rounded-lg border border-[var(--border-subtle)]">
                <span className="font-bold text-[var(--text-primary)]">Track / P.Way Control</span>
                <span className="text-[var(--text-muted)]">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("current")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "current" ? "font-bold text-amber-600 dark:text-amber-400 underline" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  Current / Due Now
                </button>
                <span className="text-[var(--text-muted)]">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("monthly")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "monthly" ? "font-bold text-[var(--brand-navy)] dark:text-sky-400 underline" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  Monthly
                </button>
                <span className="text-[var(--text-muted)]">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("weekly")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "weekly" ? "font-bold text-[var(--brand-navy)] dark:text-sky-400 underline" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  Weekly
                </button>
                <span className="text-[var(--text-muted)]">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("issues")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "issues" ? "font-bold text-red-600 dark:text-red-400 underline" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  Issue Log
                </button>
                <span className="text-[var(--text-muted)]">└──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("activity")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "activity" ? "font-bold text-emerald-600 dark:text-emerald-400 underline" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  Activity Log
                </button>
              </div>
            </div>

            {/* Sub-navigation tabs with overflow protection */}
            <Tabs
              value={controlTab}
              onValueChange={(val) => setControlTab(val as any)}
              variant="pills"
              className="w-full min-w-0"
            >
              <div className="w-full min-w-0 overflow-x-auto">
                <TabsList className="bg-transparent border-0 p-0 space-x-2 overflow-visible min-w-max">
                  <TabsTrigger
                    value="current"
                    icon={<Clock className="w-4 h-4 text-amber-500" />}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold"
                  >
                    <span>Current / Due Now</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="monthly"
                    icon={<CalendarRange className="w-4 h-4" />}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold"
                  >
                    <span>Monthly</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="weekly"
                    icon={<Calendar className="w-4 h-4" />}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold"
                  >
                    <span>Weekly</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="issues"
                    icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold"
                  >
                    <span>Issue Log</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    icon={<History className="w-4 h-4 text-emerald-500" />}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold"
                  >
                    <span>Activity Log</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>

          {/* Sub-tab 0: Current / Due Now Tasks */}
          {controlTab === "current" && (
            <div className="space-y-4">
              <DepartmentTaskSection
                department="PWAY"
                departmentName="Track / P.Way"
                cadence="CURRENT"
                storageKey="krayasetu_pway_current_tasks"
                accentColor="orange"
              />
            </div>
          )}

          {/* Sub-tab 1: Monthly Tasks & Schedule */}
          {controlTab === "monthly" && (
            <div className="space-y-4">
              <RoleBlockTable
                blocks={blocks}
                title="Monthly P.Way Track Possession Schedule"
                subtitle="Approved and scheduled monthly permanent way maintenance possessions (Bhopal Division)"
                emptyMessage="No monthly P.Way track possession blocks are currently scheduled."
              />
              <DepartmentTaskSection
                department="PWAY"
                departmentName="Track / P.Way"
                cadence="MONTHLY"
                storageKey="krayasetu_pway_monthly_tasks"
                accentColor="orange"
              />
            </div>
          )}

          {/* Sub-tab 2: Weekly Tasks & Schedule */}
          {controlTab === "weekly" && (
            <div className="space-y-4">
              <RoleBlockTable
                blocks={blocks.filter((b) => b.duration_mins <= 360)}
                title="Weekly P.Way Maintenance Possessions"
                subtitle="Upcoming weekly permanent way maintenance possessions & tamping operations"
                emptyMessage="No weekly P.Way maintenance blocks are currently scheduled."
              />
              <DepartmentTaskSection
                department="PWAY"
                departmentName="Track / P.Way"
                cadence="WEEKLY"
                storageKey="krayasetu_pway_weekly_tasks"
                accentColor="orange"
              />
            </div>
          )}

          {/* Sub-tab 3: Issue Log */}
          {controlTab === "issues" && (
            <DepartmentProblemSection
              department="PWAY"
              departmentName="Track / P.Way"
              storageKey="krayasetu_pway_problems"
              accentColor="orange"
              categories={PWAY_PROBLEM_CATEGORIES}
              locationOptions={PWAY_LOCATION_OPTIONS}
            />
          )}

          {/* Sub-tab 4: Activity Log */}
          {controlTab === "activity" && (
            <DepartmentActivityLog
              department="PWAY"
              departmentName="Track / P.Way"
              accentColor="orange"
            />
          )}
        </div>
      )}
    </div>
  );
};
