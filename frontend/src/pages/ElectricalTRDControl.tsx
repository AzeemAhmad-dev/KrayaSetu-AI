import React, { useState, useEffect } from "react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import {
  Zap,
  Sliders,
  Layers,
  Building2,
  ShieldCheck,
  GitBranch,
  Calendar,
  CalendarRange,
  AlertTriangle,
  History,
  Clock,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { DepartmentTaskSection } from "../components/department/DepartmentTaskSection";
import { DepartmentProblemSection } from "../components/department/DepartmentProblemSection";
import { DepartmentActivityLog } from "../components/department/DepartmentActivityLog";
import { api } from "../services/api";
import { BlockData } from "../types";
import { RoleBlockTable } from "../components/blocks/RoleBlockTable";

export const ElectricalTRDControl: React.FC = () => {
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

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("app-theme", nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  // Navigation State: Infrastructure workspace (main) vs dedicated Department Control workspace
  const [activeWorkspace, setActiveWorkspace] = useState<"infrastructure" | "control">("infrastructure");
  const [controlTab, setControlTab] = useState<"current" | "monthly" | "weekly" | "issues" | "activity">("current");
  const [blocks, setBlocks] = useState<BlockData[]>([]);

  React.useEffect(() => {
    api.getBlocks(undefined, undefined, "TRD", undefined, undefined, true)
      .then(setBlocks)
      .catch((err) => console.error("Failed to load TRD blocks", err));
  }, []);

  const [selectedAsset, setSelectedAsset] = useState<any | null>({
    id: "TSS-BPL-01",
    name: "Bhopal Junction Traction Substation (TSS)",
    voltageRatio: "132 kV Grid / 25 kV AC Single Phase",
    transformers: "2 x 21.6 MVA ONAN/ONAF Traction Power Transformers",
    feedingZone: "RKMP (KM 828) to Sukhi Sewaniyan (KM 848)",
    incomingGrid: "MPPTCL 132 kV Double Circuit Feeder",
    neutralSection: "PTFE Short Neutral Section at KM 830.4",
  });

  const TRACTION_SUBSTATIONS = [
    { id: "TSS-BINA", name: "Bina Traction Substation (TSS)", ratio: "132/25 kV", capacity: "2 x 21.6 MVA", grid: "MPPTCL Bina 220kV Grid", km: 218.0 },
    { id: "TSS-BHS", name: "Vidisha Traction Substation (TSS)", ratio: "132/25 kV", capacity: "2 x 21.6 MVA", grid: "MPPTCL Vidisha Substation", km: 146.0 },
    { id: "TSS-BPL", name: "Bhopal Traction Substation (TSS)", ratio: "132/25 kV", capacity: "2 x 21.6 MVA", grid: "MPPTCL Govindpura Grid", km: 92.0 },
    { id: "TSS-ET", name: "Itarsi Traction Substation (TSS)", ratio: "132/25 kV", capacity: "3 x 21.6 MVA", grid: "MPPTCL Itarsi 220kV Switchyard", km: 0.0 },
    { id: "TSS-HD", name: "Harda Traction Substation (TSS)", ratio: "132/25 kV", capacity: "2 x 21.6 MVA", grid: "MPPTCL Harda Feeder", km: 76.0 },
    { id: "TSS-KNW", name: "Khandwa Traction Substation (TSS)", ratio: "132/25 kV", capacity: "2 x 21.6 MVA", grid: "MPPTCL Khandwa Powerhouse", km: 184.0 },
  ];

  const SECTIONING_POSTS = [
    { id: "SP-NDPM", name: "Narmadapuram Sectioning Post (SP)", km: 17.5, type: "Sectioning Post with Bridging Interrupters", neutral: "PTFE Short Neutral Section" },
    { id: "SP-BAQ", name: "Ganj Basoda Sectioning Post (SP)", km: 185.0, type: "Sectioning Post with Bridging Interrupters", neutral: "PTFE Short Neutral Section" },
    { id: "SSP-RKMP", name: "Rani Kamlapati Sub-Sectioning Post (SSP)", km: 86.0, type: "Sub-Sectioning & Paralleling Post", neutral: "Continuous Overhead Catenary" },
    { id: "SSP-MABA", name: "Mandi Bamora Sub-Sectioning Post (SSP)", km: 202.0, type: "Sub-Sectioning & Paralleling Post", neutral: "Continuous Overhead Catenary" },
  ];

  const TRD_LOCATION_OPTIONS = [
    "TSS Bina (KM 218.0)",
    "TSS Vidisha (KM 146.0)",
    "TSS Bhopal (KM 92.0)",
    "TSS Itarsi (KM 0.0)",
    "TSS Harda (KM 76.0)",
    "TSS Khandwa (KM 184.0)",
    "SP Narmadapuram (KM 17.5)",
    "SP Ganj Basoda (KM 185.0)",
    "SSP Rani Kamlapati (KM 86.0)",
    "SSP Mandi Bamora (KM 202.0)",
    "Bhopal – Vidisha Section OHE Zone",
    "Itarsi Yard OHE Catenary Zone",
  ];

  const TRD_PROBLEM_CATEGORIES = [
    "Catenary / Contact Wire Sag or Twist",
    "Dropper / Cantilever Clamp Loose",
    "Insulator Flashover / Tracking / Crack",
    "Sectioning Post / Isolator Switch Malfunction",
    "PTFE Neutral Section Wear / Arcing",
    "TSS Traction Transformer / Breaker Anomaly",
    "Mast Earth Discharge / Bonding Disconnection",
    "Pantograph Entanglement Hazard",
    "Vegetation / Tree Infringement near OHE",
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans min-h-screen bg-[var(--surface-body)] text-[var(--text-primary)] transition-colors" data-theme={theme}>
      {/* 1. TOP HEADER */}
      <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[var(--brand-navy)] text-white flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-bold">
                Electrical Department (TRD) · Traction & OHE Infrastructure
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                OHE / TRACTION WORKSPACE & POWER DISTRIBUTION (BPL DIVISION)
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
              System: <strong>25 kV AC 50 Hz Single Phase</strong>
            </div>

            <div>
              Substations (TSS): <strong>6 Major 132/25kV TSS</strong>
            </div>

            <div>
              Sectioning Posts: <strong>14 SP / 24 SSP Posts</strong>
            </div>

            <div>
              Contact Wire: <strong>107 sq mm Hard-Drawn Copper</strong>
            </div>

            <div>
              Catenary Wire: <strong>65 sq mm Cadmium Copper</strong>
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
                  icon={<Zap className="w-4 h-4" />}
                  badge={
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      Main
                    </span>
                  }
                  className="px-4 py-2 text-xs sm:text-sm font-bold"
                >
                  <span>OHE / Traction Infrastructure</span>
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
                  <span>OHE / Traction Control</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="text-xs font-mono text-[var(--text-muted)] hidden sm:block pr-2 flex-shrink-0">
              {activeWorkspace === "infrastructure"
                ? "Traction Substations (TSS), Posts (SP/SSP) & OHE Specs"
                : "Monthly, Weekly & Issue Management"}
            </div>
          </div>
        </Tabs>
      </div>

      {/* 3. WORKSPACE 1: OHE / TRACTION INFRASTRUCTURE (MAIN WORKSPACE) */}
      {activeWorkspace === "infrastructure" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-secondary)] px-4 py-3 rounded-xl border border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[var(--text-primary)] uppercase">OHE / Traction Infrastructure Directory</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-secondary)]">132/25kV Traction Substations (TSS), Sectioning Posts (SP/SSP) & specifications</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-bold">
              3 ASSET CATALOGS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Panel 1: Traction Substations (TSS) Directory */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Traction Substations ({TRACTION_SUBSTATIONS.length})</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">132 / 25 kV</span>
              </div>

              <div className="p-3 divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[360px] text-xs font-mono">
                {TRACTION_SUBSTATIONS.map((tss) => (
                  <div
                    key={tss.id}
                    className={`py-2.5 first:pt-0 cursor-pointer px-2 rounded-lg transition-colors ${
                      selectedAsset?.id === tss.id ? "bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800" : "hover:bg-[var(--surface-secondary)]"
                    }`}
                    onClick={() =>
                      setSelectedAsset({
                        id: tss.id,
                        name: tss.name,
                        voltageRatio: "132 kV Grid / 25 kV AC Traction",
                        transformers: `${tss.capacity} Scott-Connected Power Transformers`,
                        feedingZone: `Corridor KM ${tss.km - 20} to KM ${tss.km + 20}`,
                        incomingGrid: tss.grid,
                        neutralSection: `PTFE Neutral Section at KM ${tss.km + 2.4}`,
                      })
                    }
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--text-primary)]">{tss.name}</span>
                      <span className="text-amber-700 dark:text-amber-400 text-[10px]">KM {tss.km}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{tss.capacity} · {tss.ratio}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{tss.grid}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Sectioning Posts (SP / SSP) */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
                  <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span>Sectioning Posts (SP / SSP) ({SECTIONING_POSTS.length})</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Isolators</span>
              </div>

              <div className="p-3 divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[360px] text-xs font-mono">
                {SECTIONING_POSTS.map((post) => (
                  <div
                    key={post.id}
                    className={`py-2.5 first:pt-0 cursor-pointer px-2 rounded-lg transition-colors ${
                      selectedAsset?.id === post.id ? "bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800" : "hover:bg-[var(--surface-secondary)]"
                    }`}
                    onClick={() =>
                      setSelectedAsset({
                        id: post.id,
                        name: post.name,
                        voltageRatio: "25 kV AC Single Phase Bus",
                        transformers: "Vacuum Interrupters (Bridging & Sectioning)",
                        feedingZone: `Station Section at KM ${post.km}`,
                        incomingGrid: "25 kV Overhead Catenary Feeder",
                        neutralSection: post.neutral,
                      })
                    }
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--text-primary)]">{post.name}</span>
                      <span className="text-orange-700 dark:text-orange-400 text-[10px]">KM {post.km}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{post.type}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{post.neutral}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: TRD Engineering Inspector */}
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>TRD Technical Profile</span>
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
                    <span className="text-[var(--text-muted)]">Operating Voltage:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.voltageRatio || "25 kV AC"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Transformer / Unit:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.transformers || "2 x 21.6 MVA"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)]">Neutral Section:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.neutralSection || "PTFE Neutral"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Grid Interface:</span>
                    <span className="font-bold text-[var(--text-secondary)]">{selectedAsset?.incomingGrid || "MPPTCL 132 kV"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>ACTM VOL-II TRD STANDARD</span>
                  <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* TRD 25kV OHE & Traction Power Maintenance Blocks */}
          <RoleBlockTable
            blocks={blocks}
            title="TRD 25kV OHE & Traction Power Maintenance Blocks"
            subtitle="Catenary inspection, neutral section overhaul, and 25kV power isolation possessions"
            emptyMessage="No TRD traction or power isolation blocks are currently active or awaiting clearance."
          />
        </div>
      )}

      {/* 4. WORKSPACE 2: OHE / TRACTION CONTROL (DEDICATED WORK-MANAGEMENT AREA) */}
      {activeWorkspace === "control" && (
        <div className="space-y-4">
          {/* Structured Navigation Area: OHE / Traction Control ├── Monthly ├── Weekly └── Issue Log */}
          <div className="bg-[var(--surface-card)] p-3.5 sm:p-4 rounded-xl border border-[var(--border-subtle)] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-[var(--text-muted)] font-bold">CONTROL AREA:</span>
                <span className="text-sm font-black text-[var(--text-primary)] uppercase">OHE / Traction Control</span>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                  {controlTab === "current" ? "Current / Due Now" : controlTab === "monthly" ? "Monthly" : controlTab === "weekly" ? "Weekly" : controlTab === "issues" ? "Issue Log" : "Activity Log"}
                </span>
              </div>

              {/* Visual hierarchy tree */}
              <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-secondary)] px-3 py-1 rounded-lg border border-[var(--border-subtle)]">
                <span className="font-bold text-[var(--text-primary)]">OHE / Traction Control</span>
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
                    controlTab === "monthly" ? "font-bold text-amber-600 dark:text-amber-400 underline" : "hover:text-[var(--text-primary)]"
                  }`}
                >
                  Monthly
                </button>
                <span className="text-[var(--text-muted)]">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("weekly")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "weekly" ? "font-bold text-amber-600 dark:text-amber-400 underline" : "hover:text-[var(--text-primary)]"
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
                    controlTab === "activity" ? "font-bold text-amber-600 dark:text-amber-400 underline" : "hover:text-[var(--text-primary)]"
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
                    icon={<CalendarRange className="w-4 h-4 text-amber-500" />}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold"
                  >
                    <span>Monthly</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="weekly"
                    icon={<Calendar className="w-4 h-4 text-amber-500" />}
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
                    icon={<History className="w-4 h-4 text-amber-500" />}
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
                department="TRD"
                departmentName="Traction / OHE"
                cadence="CURRENT"
                storageKey="krayasetu_trd_current_tasks"
                accentColor="amber"
              />
            </div>
          )}

          {/* Sub-tab 1: Monthly Power Block Schedule & Tasks */}
          {controlTab === "monthly" && (
            <div className="space-y-4">
              <RoleBlockTable
                blocks={blocks}
                title="Monthly TRD 25kV OHE Power Possession Schedule"
                subtitle="Approved monthly traction power shut-down and isolator maintenance possessions"
                emptyMessage="No monthly TRD power isolation blocks are currently scheduled."
              />
              <DepartmentTaskSection
                department="TRD"
                departmentName="Traction / OHE"
                cadence="MONTHLY"
                storageKey="krayasetu_trd_monthly_tasks"
                accentColor="amber"
              />
            </div>
          )}

          {/* Sub-tab 2: Weekly Power Block Schedule & Tasks */}
          {controlTab === "weekly" && (
            <div className="space-y-4">
              <RoleBlockTable
                blocks={blocks.filter((b) => b.duration_mins <= 360)}
                title="Weekly TRD OHE Maintenance Windows"
                subtitle="Upcoming weekly traction power shut-down windows and tower wagon runs"
                emptyMessage="No weekly TRD maintenance blocks are currently scheduled."
              />
              <DepartmentTaskSection
                department="TRD"
                departmentName="Traction / OHE"
                cadence="WEEKLY"
                storageKey="krayasetu_trd_weekly_tasks"
                accentColor="amber"
              />
            </div>
          )}

          {/* Sub-tab 3: Issue Log */}
          {controlTab === "issues" && (
            <DepartmentProblemSection
              department="TRD"
              departmentName="Traction / OHE"
              storageKey="krayasetu_trd_problems"
              accentColor="amber"
              categories={TRD_PROBLEM_CATEGORIES}
              locationOptions={TRD_LOCATION_OPTIONS}
            />
          )}

          {/* Sub-tab 4: Activity Log */}
          {controlTab === "activity" && (
            <DepartmentActivityLog
              department="TRD"
              departmentName="Traction / OHE"
              accentColor="amber"
            />
          )}
        </div>
      )}
    </div>
  );
};
