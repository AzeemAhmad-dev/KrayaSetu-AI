import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { BlockData, TrainMovementData, ScenarioData } from "../types";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { formatDistanceKm } from "../utils/formatDistance";
import {
  Clock,
  Train,
  AlertTriangle,
  Activity,
  CheckCircle,
  RefreshCw,
  Sliders,
  Layers,
  AlertOctagon,
  Info
} from "lucide-react";

interface Props {
  activeScenario?: string;
  onScenarioChange?: (scenarioId: string) => void;
}

const SCENARIO_META: Record<
  string,
  { label: string; badge: string; icon: React.ComponentType<{ className?: string }>; activeColor: string; inactiveColor: string }
> = {
  NORMAL: {
    label: "Standard Timetable",
    badge: "NORMAL",
    icon: CheckCircle,
    activeColor: "bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-500/20",
    inactiveColor: "border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-300 text-slate-800",
  },
  HEAVY_DELAY: {
    label: "Compounding Express Delays",
    badge: "HEAVY DELAY",
    icon: Clock,
    activeColor: "bg-amber-700 text-white border-amber-800 shadow-xs ring-2 ring-amber-500/20",
    inactiveColor: "border-slate-200 bg-white hover:bg-amber-50/50 hover:border-amber-300 text-slate-800",
  },
  FREIGHT_HEAVY: {
    label: "Peak Freight Flow",
    badge: "FREIGHT HEAVY",
    icon: Train,
    activeColor: "bg-blue-700 text-white border-blue-800 shadow-xs ring-2 ring-blue-500/20",
    inactiveColor: "border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-300 text-slate-800",
  },
  MAINTENANCE_DISRUPTION: {
    label: "Corridor Engineering Outage",
    badge: "DISRUPTION",
    icon: AlertTriangle,
    activeColor: "bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-500/20",
    inactiveColor: "border-slate-200 bg-white hover:bg-rose-50/50 hover:border-rose-300 text-slate-800",
  },
  BLOCK_CONFLICT: {
    label: "Direct Traffic Contention",
    badge: "BLOCK CONFLICT",
    icon: AlertOctagon,
    activeColor: "bg-purple-700 text-white border-purple-800 shadow-xs ring-2 ring-purple-500/20",
    inactiveColor: "border-slate-200 bg-white hover:bg-purple-50/50 hover:border-purple-300 text-slate-800",
  },
};

const DEFAULT_SCENARIOS: ScenarioData[] = [
  {
    id: "NORMAL",
    name: "Normal Operational Rhythm",
    description: "Standard timetable execution, minor operational buffers (0-15m), balanced freight flow, routine maintenance windows available.",
    active: true,
  },
  {
    id: "HEAVY_DELAY",
    name: "Cascading Heavy Delay Scenario",
    description: "Major delays on key passenger trains (12615 GT Express delayed +3h55m, 12137 Punjab Mail delayed +1h45m), shifting expected paths and overlapping planned maintenance slots.",
    active: false,
  },
  {
    id: "FREIGHT_HEAVY",
    name: "Freight Surge & Coal Corridor Priority",
    description: "Additional bulk rakes (Singrauli coal & Western container rakes) introduced into the Bhopal division. Heavy loop holding at Sumer, Bir and Mandideep.",
    active: false,
  },
  {
    id: "MAINTENANCE_DISRUPTION",
    name: "Urgent P.Way & OHE Defect Escalation",
    description: "Rail fracture detected between Vidisha and Gulabganj + OHE catenary sag at Mandideep requiring emergency protection blocks.",
    active: false,
  },
  {
    id: "BLOCK_CONFLICT",
    name: "Overlapping Block Window Stress Test",
    description: "Simultaneous block requests for CSM tamper and Tower Wagon on adjacent sections testing conflict resolution and CP-SAT re-optimization.",
    active: false,
  },
];

export const ScenarioAnalysisPage: React.FC<Props> = ({
  activeScenario,
  onScenarioChange,
}) => {
  const [movements, setMovements] = useState<TrainMovementData[]>([]);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioData[]>(DEFAULT_SCENARIOS);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(activeScenario || "NORMAL");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const loadData = async (fetchScenarios = false) => {
    try {
      const promises: Promise<any>[] = [api.getTrainMovements(), api.getBlocks(undefined, undefined, undefined, undefined, undefined, true)];
      if (fetchScenarios) {
        promises.push(
          api.getScenarios().catch((err) => {
            console.warn("Could not load scenarios from API, using defaults", err);
            return null;
          })
        );
      }
      const [movRes, blkRes, scenRes] = await Promise.all(promises);
      setMovements(movRes || []);
      setBlocks(blkRes || []);

      if (scenRes && Array.isArray(scenRes.scenarios) && scenRes.scenarios.length > 0) {
        setScenarios(scenRes.scenarios);
        if (scenRes.active_scenario_id) {
          setActiveScenarioId(scenRes.active_scenario_id);
        }
      }
    } catch (err) {
      console.error("Failed to load operational telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  useEffect(() => {
    if (activeScenario && activeScenario !== activeScenarioId) {
      setActiveScenarioId(activeScenario);
    }
  }, [activeScenario]);

  const handleScenarioChange = async (scenarioId: string) => {
    if (applying) return;
    setApplying(true);
    setFeedback(null);

    try {
      const res = await api.applyScenario(scenarioId);
      setActiveScenarioId(scenarioId);
      if (onScenarioChange) {
        onScenarioChange(scenarioId);
      }

      // Re-fetch operational telemetry immediately so KPI cards and lists refresh
      const [movRes, blkRes] = await Promise.all([
        api.getTrainMovements(),
        api.getBlocks(undefined, undefined, undefined, undefined, undefined, true),
      ]);
      setMovements(movRes || []);
      setBlocks(blkRes || []);

      // Update active flag across local scenarios
      setScenarios((prev) =>
        prev.map((s) => ({
          ...s,
          active: s.id === scenarioId,
        }))
      );

      const targetMeta = SCENARIO_META[scenarioId];
      const scenarioName = targetMeta?.label || scenarioId;
      const trainCount = res?.train_movements_updated ?? movRes?.length ?? 0;
      const blockCount = res?.recalculated_blocks?.length ?? blkRes?.length ?? 0;

      setFeedback({
        type: "success",
        message: `Scenario "${scenarioName}" (${scenarioId}) applied successfully. Operational telemetry recomputed: ${trainCount} trains tracked, ${blockCount} blocks evaluated.`,
      });
    } catch (err: any) {
      console.error("Failed to apply scenario:", err);
      setFeedback({
        type: "error",
        message:
          err?.message ||
          "Failed to switch operational scenario. Please verify backend service connection.",
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono flex items-center justify-center space-x-2">
        <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
        <span>Loading Simulation & Telemetry Lab...</span>
      </div>
    );
  }

  const delayedTrains = movements.filter((m) => m.delay_minutes > 15);
  const maxDelay = Math.max(...movements.map((m) => m.delay_minutes), 0);
  const conflictingBlocks = blocks.filter(
    (b) => b.conflict_status === "CONFLICT" || b.conflict_status === "HIGH OPERATIONAL RISK"
  );

  const activeScenarioObj =
    scenarios.find((s) => s.id === activeScenarioId) ||
    DEFAULT_SCENARIOS.find((s) => s.id === activeScenarioId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header Card with Interactive Scenario Selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-600" />
                Operational Simulation & Disruption Analysis Lab
              </h1>
              <span className="text-xs bg-sky-100 text-sky-800 font-mono font-bold px-2 py-0.5 rounded border border-sky-200">
                Live Network Telemetry
              </span>
              <ProvenanceBadge type="SIMULATED" />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Evaluate downstream block feasibility, train path shifts, and freight regulation across Bhopal Division
            </p>
          </div>

          {/* Interactive Scenario Dropdown Selector */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <label
              htmlFor="scenario-select"
              className="text-xs font-bold font-mono text-slate-600 uppercase tracking-wider hidden sm:inline-block"
            >
              Scenario:
            </label>
            <div className="relative inline-flex items-center">
              <select
                id="scenario-select"
                aria-label="Select Operational Simulation Scenario"
                value={activeScenarioId}
                disabled={applying}
                onChange={(e) => handleScenarioChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 hover:border-sky-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 text-slate-900 text-xs font-mono font-bold rounded-lg px-3 py-2 pr-8 shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed outline-none"
              >
                {scenarios.map((sc) => {
                  const meta = SCENARIO_META[sc.id];
                  const labelText = meta
                    ? `${sc.id} — ${meta.label}`
                    : `${sc.id} — ${sc.name}`;
                  return (
                    <option key={sc.id} value={sc.id}>
                      {labelText}
                    </option>
                  );
                })}
              </select>
              {applying && (
                <div className="absolute right-2.5 pointer-events-none">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5 Standard Scenarios Pill-Button Group */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              Scenario Disruption Injector (5 Core Scenarios)
            </span>
            {applying ? (
              <span className="text-[11px] font-mono font-bold text-sky-700 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Calculating network impact & re-solving conflicts...
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-400">
                Click any scenario to inject conditions and re-solve downstream conflicts
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {scenarios.map((sc) => {
              const meta = SCENARIO_META[sc.id] || {
                label: sc.name,
                badge: sc.id,
                icon: Activity,
                activeColor: "bg-slate-800 text-white border-slate-900 shadow-xs",
                inactiveColor: "border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
              };
              const Icon = meta.icon;
              const isActive = activeScenarioId === sc.id;

              return (
                <button
                  key={sc.id}
                  type="button"
                  disabled={applying}
                  onClick={() => handleScenarioChange(sc.id)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all text-xs font-mono relative ${
                    isActive ? meta.activeColor : meta.inactiveColor
                  } ${applying ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold flex items-center gap-1.5 text-[11px]">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {sc.id}
                    </span>
                    {isActive ? (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-white/20 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-400 uppercase">
                        {meta.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                      isActive ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Scenario Parameter Summary */}
        {activeScenarioObj && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">
                Active Scenario Parameters: {activeScenarioObj.name} ({activeScenarioObj.id})
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {activeScenarioObj.description}
              </p>
            </div>
          </div>
        )}

        {/* Inline Feedback Banner (No Alert Popups) */}
        {feedback && (
          <div
            className={`p-3 rounded-lg flex items-center justify-between text-xs font-mono font-medium border shadow-xs transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : feedback.type === "error"
                ? "bg-red-50 text-red-900 border-red-300"
                : "bg-blue-50 text-blue-900 border-blue-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === "success" && (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              {feedback.type === "error" && (
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              {feedback.type === "info" && (
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded font-bold"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Operational Simulation KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-500 text-[11px] font-mono uppercase">
            <Activity className="w-3.5 h-3.5 text-sky-600" />
            <span>Monitored Services</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {movements.length} Trains
          </div>
          <span className="text-[10px] text-slate-400">Sectional active tracking</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-500 text-[11px] font-mono uppercase">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Delayed Services (&gt;15m)</span>
          </div>
          <div className="text-xl font-black text-amber-600 mt-1 font-mono">
            {delayedTrains.length} Services
          </div>
          <span className="text-[10px] text-slate-400">Max delay: +{maxDelay}m</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-500 text-[11px] font-mono uppercase">
            <Clock className="w-3.5 h-3.5 text-red-600" />
            <span>Active Block Conflicts</span>
          </div>
          <div className="text-xl font-black text-red-600 mt-1 font-mono">
            {conflictingBlocks.length} Conflicts
          </div>
          <span className="text-[10px] text-slate-400">Requires precedence regulation</span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-500 text-[11px] font-mono uppercase">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Planned Blocks Viable</span>
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1 font-mono">
            {blocks.length - conflictingBlocks.length} / {blocks.length}
          </div>
          <span className="text-[10px] text-slate-400">Clear path windows</span>
        </div>
      </div>

      {/* Side-by-Side Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Disrupted Train Movement Telemetry */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center">
              <Train className="w-4 h-4 text-sky-600 mr-1.5" />
              Train Path Telemetry & Section Traversal ({movements.length} Trains)
            </span>
            <ProvenanceBadge type="SIMULATED" size="sm" />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
            {movements.map((tm) => (
              <div
                key={tm.train_number}
                className="p-2.5 rounded border border-slate-100 hover:border-slate-300 transition-colors bg-slate-50/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold font-mono text-slate-900">{tm.train_number}</span>
                    <span className="text-slate-600 ml-1.5 font-medium">{tm.train_name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      tm.delay_minutes > 120
                        ? "bg-red-100 text-red-800"
                        : tm.delay_minutes > 20
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {tm.delay_minutes > 0 ? `+${tm.delay_minutes}m (${tm.delay_category})` : "ON TIME"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
                  <span>Location: {tm.current_location}</span>
                  <span>
                    Sched: {tm.scheduled_time} &rarr; <span className="font-bold text-slate-800">Est: {tm.estimated_time}</span>
                  </span>
                </div>

                {tm.hold_reason && (
                  <div className="mt-1.5 text-[10px] bg-amber-50 text-amber-900 p-1.5 rounded border border-amber-200">
                    <span className="font-bold">Hold:</span> {tm.hold_reason} ({tm.hold_location})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Block Conflict Impact */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono flex items-center">
              <Clock className="w-4 h-4 text-amber-600 mr-1.5" />
              Maintenance Block Viability & Conflict Analysis ({blocks.length} Blocks)
            </span>
            <ProvenanceBadge type="DERIVED" size="sm" />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="font-mono text-slate-900">{b.id}</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      b.conflict_status === "CONFLICT"
                        ? "bg-red-100 text-red-800"
                        : b.conflict_status === "POTENTIAL CONFLICT"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {b.conflict_status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 font-medium">
                  Track {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time}
                </div>

                <p className="text-[11px] text-slate-600 leading-snug">
                  {b.conflict_summary}
                </p>

                {(() => {
                  const rawCt: any = b.conflicting_trains;
                  const ctList: any[] = Array.isArray(rawCt)
                    ? rawCt
                    : typeof rawCt === "string" && rawCt.trim().startsWith("[")
                    ? (() => {
                        try {
                          return JSON.parse(rawCt);
                        } catch {
                          return [];
                        }
                      })()
                    : [];

                  if (!ctList || ctList.length === 0) return null;

                  return (
                    <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-red-700 font-mono">
                      Direct Collision with:{" "}
                      {ctList
                        .map((ct: any) => `${ct.train_name || ct.train_number} (${ct.estimated_time || ct.scheduled_time || "En Route"})`)
                        .join(", ")}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
