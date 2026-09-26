import React, { useState } from "react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import {
  Radio,
  Sliders,
  Layers,
  Cpu,
  ShieldCheck,
  Building2,
  GitBranch,
  Calendar,
  CalendarRange,
  AlertTriangle,
  History,
  Clock
} from "lucide-react";
import { DepartmentTaskSection } from "../components/department/DepartmentTaskSection";
import { DepartmentProblemSection } from "../components/department/DepartmentProblemSection";
import { DepartmentActivityLog } from "../components/department/DepartmentActivityLog";
import { api } from "../services/api";
import { BlockData } from "../types";
import { RoleBlockTable } from "../components/blocks/RoleBlockTable";

export const SignalSNTControl: React.FC = () => {
  // Navigation State: Infrastructure workspace (main) vs dedicated Department Control workspace
  const [activeWorkspace, setActiveWorkspace] = useState<"infrastructure" | "control">("infrastructure");
  const [controlTab, setControlTab] = useState<"current" | "monthly" | "weekly" | "issues" | "activity">("current");
  const [blocks, setBlocks] = useState<BlockData[]>([]);

  React.useEffect(() => {
    api.getBlocks(undefined, undefined, "SNT", undefined, undefined, true)
      .then(setBlocks)
      .catch((err) => console.error("Failed to load S&T blocks", err));
  }, []);

  const [selectedAsset, setSelectedAsset] = useState<any | null>({
    id: "EI-BPL-01",
    name: "Bhopal Junction Central Electronic Interlocking (EI)",
    make: "Siemens Simis IS Dual Host-Standby",
    safetyLevel: "CENELEC SIL-4 Fail-Safe",
    routes: 284,
    points: 76,
    signals: 64,
    axleCounters: 48,
    transmission: "Duplicated Single-Mode Optical Fiber Ring",
  });

  const INTERLOCKING_HUBS = [
    { code: "BPL", name: "Bhopal Junction", system: "Siemens Electronic Interlocking (EI)", routes: 284, signals: 64, points: 76, dac: 48 },
    { code: "ET", name: "Itarsi Junction", system: "Kyosan Electronic Interlocking (EI)", routes: 340, signals: 82, points: 94, dac: 62 },
    { code: "RKMP", name: "Rani Kamlapati", system: "Siemens EI Centralized CTC", routes: 160, signals: 42, points: 38, dac: 32 },
    { code: "BINA", name: "Bina Junction", system: "Medha Electronic Interlocking (EI)", routes: 240, signals: 56, points: 64, dac: 40 },
    { code: "BHS", name: "Vidisha", system: "Kyosan Dual EI with Point Machine 102", routes: 92, signals: 26, points: 18, dac: 16 },
    { code: "KNW", name: "Khandwa Junction", system: "Route Relay Interlocking (RRI)", routes: 190, signals: 48, points: 52, dac: 28 },
  ];

  const POINT_MACHINES = [
    { id: "PM-101A/B", station: "RKMP", type: "Siemens 143mm Stroke Rotary", motor: "110V DC / 220V AC", operatingTime: "4.5 sec", switch: "1 in 12 Thick Web Switch" },
    { id: "PM-102A/B", station: "BHS", type: "Kyosan Electric Point Machine", motor: "110V DC Non-Trailable", operatingTime: "4.2 sec", switch: "1 in 12 Curved Switch" },
    { id: "PM-104", station: "BPL", type: "Siemens BSG-9 Rotary Point", motor: "110V DC", operatingTime: "4.8 sec", switch: "1 in 12 Fan-Shaped" },
    { id: "PM-201A/B", station: "ET", type: "Medha IRS Rotary Drive", motor: "220V AC 3-Phase", operatingTime: "4.0 sec", switch: "1 in 16 High-Speed Crossover" },
  ];

  const SNT_LOCATION_OPTIONS = [
    "Bhopal Junction (BPL)",
    "Itarsi Junction (ET)",
    "Rani Kamlapati (RKMP)",
    "Bina Junction (BINA)",
    "Vidisha (BHS)",
    "Khandwa Junction (KNW)",
    "Guna Junction (GUNA)",
    "Gwalior Junction (GWL)",
    "Mandideep Interlocking Point #101",
    "Misrod Route Relay Zone",
    "Narmadapuram Automatic Signaling Block",
    "Harda Axle Counter Zone",
  ];

  const SNT_PROBLEM_CATEGORIES = [
    "Point Machine Failure / Slack / Obstruction",
    "Signal Lamp / LED Aspect Extinction",
    "Digital Axle Counter (DAC) Track Anomaly",
    "DC Track Circuit Drop / Failure",
    "Electronic Interlocking Card / Dual Host Sync",
    "Level Crossing Gate Interlocking Failure",
    "Optical Fiber Cable (OFC) Degradation",
    "Data Logger / Power Supply UPS Anomaly",
    "Point Detection Contacts Wear",
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* 1. TOP HEADER */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0b2545] text-white flex-shrink-0">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Signal & Telecommunications Department · S&T Infrastructure
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                S&T WORKSPACE & INTERLOCKING INFRASTRUCTURE (BPL DIVISION)
              </h1>
            </div>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-700">
            <div>
              Signaling: <strong>Continuous 4-Aspect MACLS</strong>
            </div>

            <div>
              Interlocking: <strong>Electronic Interlocking (EI Dual Host)</strong>
            </div>

            <div>
              Detection: <strong>Digital Axle Counters (DAC SIL-4)</strong>
            </div>

            <div>
              Point Machines: <strong>143 mm Electric Rotary Drives</strong>
            </div>

            <div>
              Backbone: <strong>Duplicated Single-Mode Optical Fiber</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              INFRASTRUCTURE: VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY WORKSPACE NAVIGATION */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {/* Main Infrastructure Workspace Button */}
          <button
            type="button"
            onClick={() => setActiveWorkspace("infrastructure")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeWorkspace === "infrastructure"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>S&T Infrastructure</span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
              activeWorkspace === "infrastructure" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              Main
            </span>
          </button>

          {/* Department Control Workspace Button */}
          <button
            type="button"
            onClick={() => setActiveWorkspace("control")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeWorkspace === "control"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>S&T Control</span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
              activeWorkspace === "control" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              Work Management
            </span>
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 hidden sm:block pr-2">
          {activeWorkspace === "infrastructure"
            ? "Signaling, Interlocking Hubs & Point Machines"
            : "Monthly, Weekly & Issue Management"}
        </div>
      </div>

      {/* 3. WORKSPACE 1: S&T INFRASTRUCTURE (MAIN WORKSPACE) */}
      {activeWorkspace === "infrastructure" && (
        <div className="space-y-4">
          <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700 uppercase">S&T Infrastructure Directory</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">Electronic Interlocking (EI), point machines & signaling specs</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold">
              3 ASSET CATALOGS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Panel 1: Interlocking Stations Directory */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                  <Cpu className="w-4 h-4 text-cyan-600" />
                  <span>Interlocking Hubs ({INTERLOCKING_HUBS.length})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Route Capacity</span>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[360px] text-xs font-mono">
                {INTERLOCKING_HUBS.map((hub) => (
                  <div
                    key={hub.code}
                    className={`py-2.5 first:pt-0 cursor-pointer px-2 rounded-lg transition-colors ${
                      selectedAsset?.id?.includes(hub.code) ? "bg-cyan-50/70 border border-cyan-200" : "hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      setSelectedAsset({
                        id: `EI-${hub.code}-01`,
                        name: `${hub.name} Electronic Interlocking (EI)`,
                        make: hub.system,
                        safetyLevel: "CENELEC SIL-4 Fail-Safe",
                        routes: hub.routes,
                        points: hub.points,
                        signals: hub.signals,
                        axleCounters: hub.dac,
                        transmission: "Duplicated OFC Ring (155 Mbps)",
                      })
                    }
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{hub.name} ({hub.code})</span>
                      <span className="text-cyan-700 text-[10px]">{hub.routes} Routes</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{hub.system}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Signals: {hub.signals} · Points: {hub.points} · DAC: {hub.dac}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Point Machine Assets */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                  <GitBranch className="w-4 h-4 text-indigo-600" />
                  <span>Point Machine Assets ({POINT_MACHINES.length})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">143mm Stroke</span>
              </div>

              <div className="p-3 divide-y divide-slate-100 overflow-y-auto max-h-[360px] text-xs font-mono">
                {POINT_MACHINES.map((pm) => (
                  <div
                    key={pm.id}
                    className={`py-2.5 first:pt-0 cursor-pointer px-2 rounded-lg transition-colors ${
                      selectedAsset?.id === pm.id ? "bg-indigo-50/70 border border-indigo-200" : "hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      setSelectedAsset({
                        id: pm.id,
                        name: `${pm.station} Point Machine Drive ${pm.id}`,
                        make: pm.type,
                        safetyLevel: "IRS / RDSO Spec S-24/2002",
                        routes: 1,
                        points: 1,
                        signals: 0,
                        axleCounters: 1,
                        transmission: pm.motor,
                        operatingTime: pm.operatingTime,
                        switchType: pm.switch,
                      })
                    }
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{pm.id} ({pm.station})</span>
                      <span className="text-indigo-700 text-[10px]">{pm.operatingTime}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{pm.type}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{pm.switch} · {pm.motor}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: S&T Engineering Inspector */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>S&T Technical Profile</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{selectedAsset?.id || "Asset"}</span>
              </div>

              <div className="p-4 space-y-3 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Selected Asset</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedAsset?.name}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">System Architecture:</span>
                    <span className="font-bold text-slate-800">{selectedAsset?.make || "Siemens Simis IS"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Safety Integrity Level:</span>
                    <span className="font-bold text-slate-800">{selectedAsset?.safetyLevel || "SIL-4 Fail-Safe"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Route Processing:</span>
                    <span className="font-bold text-slate-800">{selectedAsset?.routes || 284} Routes</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Backbone Medium:</span>
                    <span className="font-bold text-slate-800">{selectedAsset?.transmission || "Duplicated OFC"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                  <span>INDIAN RAILWAYS SEM SPEC</span>
                  <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* S&T Interlocking & Signaling Maintenance Blocks */}
          <RoleBlockTable
            blocks={blocks}
            title="S&T Interlocking & Signaling Maintenance Blocks"
            subtitle="Electronic interlocking disconnections, point machine overhaul, and signal cable maintenance blocks"
            emptyMessage="No S&T signaling blocks are currently active or awaiting clearance."
          />
        </div>
      )}

      {/* 4. WORKSPACE 2: S&T CONTROL (DEDICATED WORK-MANAGEMENT AREA) */}
      {activeWorkspace === "control" && (
        <div className="space-y-4">
          {/* Structured Navigation Area: S&T Control ├── Monthly ├── Weekly └── Issue Log */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-slate-400 font-bold">CONTROL AREA:</span>
                <span className="text-sm font-black text-slate-900 uppercase">S&T Control</span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-mono font-bold text-[#0b2545] uppercase">
                  {controlTab === "current" ? "Current / Due Now" : controlTab === "monthly" ? "Monthly" : controlTab === "weekly" ? "Weekly" : controlTab === "issues" ? "Issue Log" : "Activity Log"}
                </span>
              </div>

              {/* Visual hierarchy tree */}
              <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">S&T Control</span>
                <span className="text-slate-400">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("current")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "current" ? "font-bold text-amber-700 underline" : "hover:text-slate-900"
                  }`}
                >
                  Current / Due Now
                </button>
                <span className="text-slate-400">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("monthly")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "monthly" ? "font-bold text-[#0b2545] underline" : "hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <span className="text-slate-400">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("weekly")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "weekly" ? "font-bold text-[#0b2545] underline" : "hover:text-slate-900"
                  }`}
                >
                  Weekly
                </button>
                <span className="text-slate-400">├──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("issues")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "issues" ? "font-bold text-red-700 underline" : "hover:text-slate-900"
                  }`}
                >
                  Issue Log
                </button>
                <span className="text-slate-400">└──</span>
                <button
                  type="button"
                  onClick={() => setControlTab("activity")}
                  className={`cursor-pointer transition-colors ${
                    controlTab === "activity" ? "font-bold text-cyan-700 underline" : "hover:text-slate-900"
                  }`}
                >
                  Activity Log
                </button>
              </div>
            </div>

            {/* Sub-navigation buttons */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setControlTab("current")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  controlTab === "current"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Current / Due Now</span>
              </button>

              <button
                type="button"
                onClick={() => setControlTab("monthly")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  controlTab === "monthly"
                    ? "bg-[#0b2545] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>Monthly</span>
              </button>

              <button
                type="button"
                onClick={() => setControlTab("weekly")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  controlTab === "weekly"
                    ? "bg-[#0b2545] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Weekly</span>
              </button>

              <button
                type="button"
                onClick={() => setControlTab("issues")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  controlTab === "issues"
                    ? "bg-red-700 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <AlertTriangle className={`w-4 h-4 ${controlTab === "issues" ? "text-white" : "text-red-600"}`} />
                <span>Issue Log</span>
              </button>

              <button
                type="button"
                onClick={() => setControlTab("activity")}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  controlTab === "activity"
                    ? "bg-cyan-700 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <History className={`w-4 h-4 ${controlTab === "activity" ? "text-white" : "text-cyan-600"}`} />
                <span>Activity Log</span>
              </button>
            </div>
          </div>

          {/* Sub-tab 0: Current / Due Now Tasks */}
          {controlTab === "current" && (
            <div className="space-y-4">
              <DepartmentTaskSection
                department="SNT"
                departmentName="Signal & S&T"
                cadence="CURRENT"
                storageKey="krayasetu_snt_current_tasks"
                accentColor="cyan"
              />
            </div>
          )}

          {/* Sub-tab 1: Monthly Schedule & Tasks */}
          {controlTab === "monthly" && (
            <div className="space-y-4">
              <RoleBlockTable
                blocks={blocks}
                title="Monthly S&T Maintenance & Disconnection Schedule"
                subtitle="Approved and scheduled monthly signaling and telecommunication possessions"
                emptyMessage="No monthly S&T maintenance blocks are currently scheduled."
              />
              <DepartmentTaskSection
                department="SNT"
                departmentName="Signal & S&T"
                cadence="MONTHLY"
                storageKey="krayasetu_snt_monthly_tasks"
                accentColor="cyan"
              />
            </div>
          )}

          {/* Sub-tab 2: Weekly Schedule & Tasks */}
          {controlTab === "weekly" && (
            <div className="space-y-4">
              <RoleBlockTable
                blocks={blocks.filter((b) => b.duration_mins <= 360)}
                title="Weekly S&T Signaling Blocks"
                subtitle="Upcoming weekly signaling maintenance and testing windows"
                emptyMessage="No weekly S&T maintenance blocks are currently scheduled."
              />
              <DepartmentTaskSection
                department="SNT"
                departmentName="Signal & S&T"
                cadence="WEEKLY"
                storageKey="krayasetu_snt_weekly_tasks"
                accentColor="cyan"
              />
            </div>
          )}

          {/* Sub-tab 3: Issue Log */}
          {controlTab === "issues" && (
            <DepartmentProblemSection
              department="SNT"
              departmentName="Signal & S&T"
              storageKey="krayasetu_snt_problems"
              accentColor="cyan"
              categories={SNT_PROBLEM_CATEGORIES}
              locationOptions={SNT_LOCATION_OPTIONS}
            />
          )}

          {/* Sub-tab 4: Activity Log */}
          {controlTab === "activity" && (
            <DepartmentActivityLog
              department="SNT"
              departmentName="Signal & S&T"
              accentColor="cyan"
            />
          )}
        </div>
      )}
    </div>
  );
};
