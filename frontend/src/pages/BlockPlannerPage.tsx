import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { BlockData, TrainMovementData } from "../types";
import { ConflictAlertBox } from "../components/blocks/ConflictAlertBox";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import {
  CalendarRange,
  PlusCircle,
  Cpu,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Zap,
  ArrowRight,
  Sparkles,
  RefreshCw,
  XCircle,
  Send,
  MapPin,
  Calendar,
  LayoutGrid,
} from "lucide-react";

import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";
import { GanttDashboard } from "../GanttDashboard";

export const BlockPlannerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTaskId = searchParams.get("taskId");

  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [movements, setMovements] = useState<TrainMovementData[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(urlTaskId || "");
  const [loading, setLoading] = useState(true);

  // Proposal Form State
  const [corridorId, setCorridorId] = useState("CORR-01");
  const [sectionId, setSectionId] = useState("SEC-CORR-01-BHS-SOI");
  const [trackName, setTrackName] = useState("DOWN_MAIN");
  const [locationKm, setLocationKm] = useState(152.2);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("14:00");
  const [durationMins, setDurationMins] = useState(120);
  const [protectionType, setProtectionType] = useState("TRAFFIC_BLOCK");
  const [powerIso, setPowerIso] = useState(false);
  const [machine, setMachine] = useState("Plasser 09-32 CSM Tamper #812");

  // Conflict Result State
  const [evalResult, setEvalResult] = useState<any>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<any>(null);
  const [reasoningTarget, setReasoningTarget] = useState<any>(null);
  const [showDeferred, setShowDeferred] = useState(false);
  const [actioningBlockId, setActioningBlockId] = useState<string | null>(null);
  const [proposingTaskId, setProposingTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"gantt" | "grid">("gantt");

  const handleProposeFromSchedule = async (item: any) => {
    if (proposingTaskId) return;
    setProposingTaskId(item.task_id);
    try {
      await api.proposeBlockFromSchedule({
        task_id: item.task_id,
        corridor_id: corridorId,
        section_id: item.section_id || sectionId,
        track_name: item.track_name || trackName,
        location_km: item.location_km || locationKm,
        requested_start_time: item.allocated_start_time,
        requested_end_time: item.allocated_end_time,
        duration_mins: item.duration_mins || 120,
        protection_type: item.required_protection || "TRAFFIC_BLOCK",
        power_isolation_required: item.requires_power_isolation || false,
        assigned_machine: item.assigned_machine,
        proposed_by: "CP-SAT Optimizer / Controller",
        auto_submit: false,
      });
      await loadData();
    } catch (err: any) {
      alert("Failed to create block proposal: " + (err.message || err));
    } finally {
      setProposingTaskId(null);
    }
  };

  const handleSubmitForClearance = async (blockId: string) => {
    if (actioningBlockId) return;
    setActioningBlockId(blockId);
    try {
      await api.submitBlockForApproval(blockId, {
        actor: "Permanent Way Section Engineer",
        role: "ENGINEER",
        notes: "Submitted for Divisional Clearance",
      });
      await loadData();
    } catch (err: any) {
      alert("Submission failed: " + (err.message || err));
    } finally {
      setActioningBlockId(null);
    }
  };

  const handleApproveBlock = async (blockId: string) => {
    if (actioningBlockId) return;
    if (window.confirm("Are you sure you want to approve this maintenance block?")) {
      setActioningBlockId(blockId);
      try {
        await api.approveBlockDirect(blockId, {
          actor: "Divisional Section Controller",
          role: "CONTROLLER",
          notes: "Approved maintenance block window",
        });
        await loadData();
      } catch (err: any) {
        alert("Approval failed: " + (err.message || err));
      } finally {
        setActioningBlockId(null);
      }
    }
  };

  const handleRejectBlock = async (blockId: string) => {
    if (actioningBlockId) return;
    setActioningBlockId(blockId);
    try {
      await api.rejectBlockDirect(blockId, {
        actor: "Divisional Section Controller",
        role: "CONTROLLER",
        notes: "Rejected block proposal",
      });
      await loadData();
    } catch (err: any) {
      alert("Rejection failed: " + (err.message || err));
    } finally {
      setActioningBlockId(null);
    }
  };

  const handleSelectBlock = async (blockId: string) => {
    if (actioningBlockId) return;
    setActioningBlockId(blockId);
    try {
      await api.selectBlockDirect(blockId, {
        actor: "Chief Controller",
        role: "CONTROLLER",
        notes: "Selected block into operational plan",
      });
      await loadData();
    } catch (err: any) {
      alert("Selection failed: " + (err.message || err));
    } finally {
      setActioningBlockId(null);
    }
  };

  const handleReplanBlock = async (blockId: string) => {
    if (actioningBlockId) return;
    setActioningBlockId(blockId);
    try {
      await api.replanBlockDirect(blockId, {
        actor: "Divisional Section Controller",
        role: "CONTROLLER",
        notes: "Sent for re-planning",
      });
      await loadData();
    } catch (err: any) {
      alert("Re-planning failed: " + (err.message || err));
    } finally {
      setActioningBlockId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [blkRes, movRes, prioRes] = await Promise.all([
        api.getBlocks(),
        api.getTrainMovements(),
        api.getTaskPriorities(undefined, undefined, 50).catch(() => ({ tasks: [], prioritized_tasks: [] })),
      ]);
      setBlocks(blkRes);
      setMovements(movRes);
      const tasks = prioRes.tasks || prioRes.prioritized_tasks || [];
      setPriorityTasks(tasks);

      const targetTaskId = urlTaskId || selectedTaskId;
      if (targetTaskId) {
        const found = tasks.find((t: any) => t.task_id === targetTaskId);
        if (found) {
          setSelectedTaskId(found.task_id);
          if (found.corridor_id) setCorridorId(found.corridor_id);
          if (found.section_id) setSectionId(found.section_id);
          if (found.track_name) setTrackName(found.track_name);
          if (found.location_km) setLocationKm(found.location_km);
          if (found.duration_mins) setDurationMins(found.duration_mins);
          if (found.requires_power_isolation !== undefined) setPowerIso(found.requires_power_isolation);
          if (found.required_protection) setProtectionType(found.required_protection);
          runConflictCheck("12:00", "14:00", found.location_km, found.track_name || "DOWN_MAIN");
          return;
        }
      }
      // Run initial conflict check for default values
      runConflictCheck("12:00", "14:00", 152.2, "DOWN_MAIN");
    } catch (err) {
      console.error("Failed to load block planner data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (tId: string) => {
    setSelectedTaskId(tId);
    if (!tId) return;
    const found = priorityTasks.find((t: any) => t.task_id === tId);
    if (found) {
      if (found.corridor_id) setCorridorId(found.corridor_id);
      if (found.section_id) setSectionId(found.section_id);
      if (found.track_name) setTrackName(found.track_name);
      if (found.location_km) setLocationKm(found.location_km);
      if (found.duration_mins) setDurationMins(found.duration_mins);
      if (found.requires_power_isolation !== undefined) setPowerIso(found.requires_power_isolation);
      if (found.required_protection) setProtectionType(found.required_protection);
      runConflictCheck(startTime, endTime, found.location_km, found.track_name || trackName);
    }
  };

  const runConflictCheck = async (sTime: string, eTime: string, km: number, track: string) => {
    setCheckingConflict(true);
    try {
      const res = await api.checkBlockConflict({
        corridor_id: corridorId,
        section_id: sectionId,
        track_name: track,
        location_km: km,
        requested_start_time: sTime,
        requested_end_time: eTime,
        duration_mins: durationMins,
        protection_type: protectionType,
        power_isolation_required: powerIso,
      });
      setEvalResult(res.evaluation);
    } catch (err) {
      console.error("Conflict evaluation failed", err);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleProposeBlock = async () => {
    if (!selectedTaskId) {
      alert("Please select a maintenance task from the priority queue before proposing a block.");
      return;
    }
    setProposing(true);
    try {
      await api.proposeBlock({
        task_id: selectedTaskId,
        corridor_id: corridorId,
        section_id: sectionId,
        track_name: trackName,
        location_km: locationKm,
        requested_start_time: startTime,
        requested_end_time: endTime,
        duration_mins: durationMins,
        protection_type: protectionType,
        power_isolation_required: powerIso,
        assigned_machine: machine,
        proposed_by: "Permanent Way Section Engineer (BHS)",
      });
      await loadData();
    } catch (err) {
      console.error("Failed to propose block", err);
    } finally {
      setProposing(false);
    }
  };

  const handleRunOptimizer = async () => {
    setOptimizing(true);
    try {
      const res = await api.optimizeBlocks({
        corridor_id: corridorId,
        time_window_start: "08:00",
        time_window_end: "20:00",
        allow_bundling: true,
      });
      setOptResult(res);
      await loadData();
    } catch (err) {
      console.error("Optimization failed", err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyAlternative = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    runConflictCheck(newStart, newEnd, locationKm, trackName);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Maintenance Block Planner & Conflict Resolver
            </h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded">
              OR-Tools CP-SAT
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Bhopal Division · Multi-Corridor Safety Headway & Machinery Allocation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunOptimizer}
            disabled={optimizing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#0b2545] hover:bg-[#13315c] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>{optimizing ? "Solving CP-SAT..." : "Run CP-SAT Optimizer"}</span>
          </button>
          <ProvenanceBadge type="DERIVED" />
        </div>
      </div>

      {/* Schedule Area: Interactive Gantt Timeline & CP-SAT Schedule Queue */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Header & View Toggle */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2">
              <CalendarRange className="w-4 h-4 text-sky-600" />
              <span className="font-bold text-slate-800 text-xs tracking-wide uppercase">
                Corridor Maintenance Schedule & Timeline
              </span>
            </div>
            {optResult && (
              <span className="text-[11px] bg-sky-100 border border-sky-300 text-sky-900 font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-sky-600 mr-1" />
                {optResult.status === "OPTIMAL_SCHEDULE_FOUND"
                  ? "Optimal Schedule Proven"
                  : "Best Feasible Plan Found"}
              </span>
            )}
          </div>

          {/* View Toggle Pill Buttons */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("gantt")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "gantt"
                  ? "bg-white text-sky-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Interactive Gantt Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-sky-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <span>Queue / Grid View</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* KPI Chips & Summary when optResult is present */}
          {optResult && (
            <div className="bg-sky-50 border border-sky-300 p-3.5 rounded-lg text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="flex items-center text-sm font-bold text-sky-950">
                    <Sparkles className="w-4 h-4 text-sky-600 mr-1.5" />
                    AI CP-SAT Optimization Metrics
                  </span>
                </div>
                <span className="text-[11px] text-sky-800 font-medium italic">
                  Best feasible plan found within the 8-second optimization window
                </span>
              </div>

              {/* KPI Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded border border-sky-200 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Optimization Time</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {optResult.metrics?.solve_time_seconds ?? optResult.solve_time_seconds ?? 0}s
                  </span>
                  <span className="text-[10px] text-sky-600">8.0s bounded limit</span>
                </div>

                <div className="bg-white p-2.5 rounded border border-sky-200 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tasks Scheduled</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {optResult.metrics?.tasks_scheduled ?? optResult.schedule?.length ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500">Critical: {optResult.metrics?.critical_scheduled ? "Protected" : "0"}</span>
                </div>

                <div className="bg-white p-2.5 rounded border border-sky-200 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tasks Deferred</span>
                  <span className="text-base font-bold text-amber-700 font-mono">
                    {optResult.metrics?.tasks_deferred ?? optResult.deferred_tasks?.length ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500">Capacity / Headway</span>
                </div>

                <div className="bg-white p-2.5 rounded border border-sky-200 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Train Conflicts</span>
                  <span className="text-base font-bold text-sky-900 font-mono">
                    {optResult.metrics?.train_conflicts ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500">15m safety headway</span>
                </div>
              </div>

              <p className="text-sky-900 leading-relaxed font-medium bg-sky-100/50 p-2 rounded border border-sky-200/60">
                {optResult.summary}
              </p>
            </div>
          )}

          {/* Schedule View: Gantt vs Queue/Grid */}
          {viewMode === "gantt" ? (
            <GanttDashboard
              blocks={blocks}
              trainMovements={movements}
              optResult={optResult}
              onRefresh={loadData}
              onOpenReasoning={(taskId, fallbackItem) => setReasoningTarget({ taskId, fallbackItem })}
            />
          ) : (
            /* Queue / Grid View */
            optResult && optResult.schedule && optResult.schedule.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {optResult.schedule.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white p-2.5 rounded border border-sky-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between font-bold">
                        <span className="font-mono text-slate-800">{item.task_id}</span>
                        <span className="text-emerald-700 font-mono font-bold">
                          {item.allocated_start_time} – {item.allocated_end_time}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 font-medium">
                        {item.task_title}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Track: {item.track_name} · Machine: {item.assigned_machine ?? "Unassigned"}
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-sky-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-sky-800 font-semibold">{item.duration_mins}m Slot</span>
                        <button
                          onClick={() => setReasoningTarget({ taskId: item.task_id, fallbackItem: item })}
                          className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          title="View AI Decision Rationale & Impact Analysis"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                          <span>Reasoning</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleProposeFromSchedule(item)}
                        disabled={proposingTaskId === item.task_id}
                        className="px-2.5 py-1 rounded bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>{proposingTaskId === item.task_id ? "Creating..." : "Create Block Proposal"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed text-slate-500 text-xs font-mono space-y-2">
                <CalendarRange className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">CP-SAT Schedule Queue is Empty</p>
                <p className="text-[11px] text-slate-500">
                  Click <span className="font-bold text-sky-700">"Run CP-SAT Optimizer"</span> above to calculate optimal maintenance slots across Bhopal corridors, or switch to the <span className="font-bold text-sky-700">Interactive Gantt Timeline</span>.
                </p>
              </div>
            )
          )}

          {/* Deferred Tasks & Explanations Banner */}
          {optResult?.deferred_tasks && optResult.deferred_tasks.length > 0 && (
            <div className="mt-4 bg-red-50 border-2 border-red-500 rounded-lg shadow-sm overflow-hidden">
              <div className="p-3 bg-red-600 flex items-center space-x-2 text-white">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
                <span className="font-bold tracking-wide uppercase text-sm">
                  {optResult.deferred_tasks.length} Task(s) Dropped via Graceful Degradation
                </span>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {optResult.deferred_tasks.map((dt: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded border border-red-200 space-y-2 text-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <div className="flex items-center justify-between font-bold pl-2">
                      <span className="font-mono text-slate-900">{dt.task_id}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[9px] font-mono font-bold uppercase border border-red-200">
                          {dt.reason_code}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {dt.priority_tier}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-700 leading-snug pl-2">
                      <span className="font-bold text-red-900">Reason: </span>
                      {dt.human_readable_reason || dt.reason}
                    </div>
                    {dt.mitigation && (
                      <div className="ml-2 text-[10px] text-emerald-900 bg-emerald-50 px-2 py-1 rounded font-medium border border-emerald-200">
                        <span className="font-bold">Mitigation: </span>{dt.mitigation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Proposal Builder & Real-Time Conflict Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Block Proposal Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm flex items-center">
              <PlusCircle className="w-4 h-4 text-sky-600 mr-1.5" />
              Propose New Maintenance Block
            </span>
            <ProvenanceBadge type="DERIVED" size="sm" />
          </div>

          {selectedTaskId && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-red-600 text-white rounded font-mono font-bold text-[10px]">
                  PRIORITY TASK: {selectedTaskId}
                </span>
                <span className="font-semibold text-red-950">
                  Targeted Block Proposal for {selectedTaskId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskId("")}
                className="text-red-700 hover:text-red-950 font-mono text-[11px] underline cursor-pointer"
              >
                Clear Link
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Task Selector */}
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Originating Maintenance Task (Priority Queue)</span>
                {selectedTaskId && (
                  <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                    Linked: {selectedTaskId}
                  </span>
                )}
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => handleSelectTask(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium text-xs font-mono"
              >
                <option value="">-- No Direct Task Link (Generic Section Block) --</option>
                {priorityTasks.slice(0, 30).map((pt: any) => (
                  <option key={pt.task_id} value={pt.task_id}>
                    {pt.task_id} | {pt.priority_tier} | {pt.corridor_id} {pt.track_name} KM {pt.location_km} | {pt.department_id || "PWAY"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Corridor</label>
              <select
                value={corridorId}
                onChange={(e) => setCorridorId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
              >
                <option value="CORR-01">Itarsi – Bhopal – Bina</option>
                <option value="CORR-02">Khandwa – Itarsi</option>
                <option value="CORR-03">Bina – Guna</option>
                <option value="CORR-04">Guna – Gwalior</option>
                <option value="CORR-05">Ruthiyai – Maksi</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Track Line</label>
              <select
                value={trackName}
                onChange={(e) => {
                  setTrackName(e.target.value);
                  runConflictCheck(startTime, endTime, locationKm, e.target.value);
                }}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
              >
                <option value="DOWN_MAIN">DOWN MAIN (Towards Bina/Delhi)</option>
                <option value="UP_MAIN">UP MAIN (Towards Itarsi/Mumbai)</option>
                <option value="THIRD_LINE">THIRD LINE (Spine Section)</option>
                <option value="BOTH">BOTH LINES (Complete Island Block)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location (KM Chainage)</label>
              <input
                type="number"
                step="0.1"
                value={locationKm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setLocationKm(val);
                  runConflictCheck(startTime, endTime, val, trackName);
                }}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Required Protection</label>
              <select
                value={protectionType}
                onChange={(e) => setProtectionType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
              >
                <option value="TRAFFIC_BLOCK">TRAFFIC BLOCK</option>
                <option value="POWER_ISOLATION">POWER ISOLATION (25kV OHE OFF)</option>
                <option value="TRAFFIC_AND_POWER_ISOLATION">TRAFFIC & POWER ISOLATION</option>
                <option value="TRAFFIC_CAUTION">TRAFFIC CAUTION (Gap Work)</option>
                <option value="EMERGENCY_PROTECTION">EMERGENCY PROTECTION</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Time (HH:MM)</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  runConflictCheck(e.target.value, endTime, locationKm, trackName);
                }}
                className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Time (HH:MM)</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  runConflictCheck(startTime, e.target.value, locationKm, trackName);
                }}
                className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-slate-800"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Assigned Machine / Machinery</label>
              <select
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-slate-50 font-medium"
              >
                <option value="Plasser 09-32 CSM Tamper #812">Plasser 09-32 CSM Tamper #812 (Base: BPL)</option>
                <option value="Points Tamper Unimat 08-275 #404">Points Tamper Unimat 08-275 #404 (Base: BINA)</option>
                <option value="8-Wheeler DETC Tower Wagon #09">8-Wheeler DETC Tower Wagon #09 (Base: BPL)</option>
                <option value="8-Wheeler DETC Tower Wagon #14">8-Wheeler DETC Tower Wagon #14 (Base: BINA)</option>
                <option value="Manual Track Gang">Manual Track Gang (P.Way Squad)</option>
              </select>
            </div>

            <div className="col-span-2 flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="powerIsoCheck"
                checked={powerIso}
                onChange={(e) => {
                  setPowerIso(e.target.checked);
                  runConflictCheck(startTime, endTime, locationKm, trackName);
                }}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="powerIsoCheck" className="text-slate-700 font-semibold cursor-pointer">
                Requires 25kV Traction Power Isolation (TRD Permit to Work)
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => runConflictCheck(startTime, endTime, locationKm, trackName)}
              disabled={checkingConflict}
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center"
            >
              {checkingConflict && <RefreshCw className="w-3 h-3 animate-spin mr-1 text-slate-500" />}
              <span>Re-evaluate Conflict</span>
            </button>
            <button
              onClick={handleProposeBlock}
              disabled={proposing}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {proposing ? "Submitting..." : "Submit Proposed Block"}
            </button>
          </div>
        </div>

        {/* Right: Live Conflict Evaluation */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 font-mono flex items-center justify-between">
              <span>Real-Time Traffic Conflict Assessment</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Window: {startTime}–{endTime} · Track: {trackName}
              </span>
            </div>

            {evalResult ? (
              <ConflictAlertBox
                conflictStatus={evalResult.conflict_status}
                summary={evalResult.summary}
                conflictingPassengerTrains={evalResult.conflicting_passenger_trains}
                freightImpacts={evalResult.freight_impacts}
                alternativeWindow={evalResult.alternative_window}
                onApplyAlternative={handleApplyAlternative}
              />
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs font-mono">
                Evaluating physical track occupancy...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Planned & Active Blocks Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarRange className="w-4 h-4 text-sky-600" />
            <span className="font-bold text-slate-800 text-xs tracking-wide">
              DIVISIONAL BLOCKS LEDGER ({blocks.length} Records)
            </span>
          </div>
          <ProvenanceBadge type="SIMULATED" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-mono uppercase text-[11px]">
              <tr>
                <th className="p-2.5 pl-4">Block ID & Priority</th>
                <th className="p-2.5">Originating Task</th>
                <th className="p-2.5">Corridor / Section</th>
                <th className="p-2.5">Track / KM</th>
                <th className="p-2.5">Slot (IST)</th>
                <th className="p-2.5">Department(s)</th>
                <th className="p-2.5">Machine / Protection</th>
                <th className="p-2.5">Conflict Status</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 pr-4 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blocks.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 pl-4 font-mono font-bold text-slate-900">
                    <div className="flex flex-col">
                      <span>{b.id}</span>
                      {b.task_priority && (
                        <span className={`text-[9px] font-mono font-bold uppercase ${
                          b.task_priority === "CRITICAL" ? "text-red-700" : b.task_priority === "HIGH" ? "text-amber-700" : "text-slate-400"
                        }`}>
                          {b.task_priority} Priority
                        </span>
                      )}
                      <button
                        onClick={() => setReasoningTarget({ blockId: b.id })}
                        className="mt-1 inline-flex items-center space-x-1 text-[9px] font-sans font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200/60 transition-colors cursor-pointer w-fit"
                        title="View AI Decision Rationale & Train Impact"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        <span>Why this Block?</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-2.5">
                    {b.task_id ? (
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {b.task_id}
                        </span>
                        <div className="text-[11px] text-slate-600 truncate max-w-[180px]" title={b.task_title || ""}>
                          {b.task_title || "Maintenance Task"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">Direct Proposal</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-900">{b.corridor_id}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{b.section_name || b.section_id}</div>
                  </td>
                  <td className="p-2.5 font-mono text-slate-700 font-semibold">
                    <div>{b.track_name}</div>
                    <div className="text-[11px] text-slate-500 font-normal">KM {b.location_km}</div>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-900">
                    <div>{b.requested_start_time} – {b.requested_end_time}</div>
                    <div className="text-[11px] text-slate-500 font-normal">{b.duration_mins}m · {b.date || "2026-03-15"}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {b.participating_departments || b.department_id || "PWAY"}
                      </span>
                      {b.power_isolation_required && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5" />
                          <span>TRD ISO</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-slate-600">
                    <div>{b.assigned_machine || "Manual Gang"}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{b.protection_type}</div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        b.conflict_status === "CONFLICT"
                          ? "bg-red-100 text-red-800"
                          : b.conflict_status === "POTENTIAL CONFLICT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {b.conflict_status}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      b.status === "PROPOSED"
                        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                        : b.status === "PENDING_APPROVAL"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : b.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : b.status === "SELECTED"
                        ? "bg-sky-50 text-sky-800 border-sky-200"
                        : b.status === "REJECTED"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : b.status === "RE_PLAN"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-2.5 pr-4 text-right">
                    {b.status === "PROPOSED" && (
                      <button
                        onClick={() => handleSubmitForClearance(b.id)}
                        disabled={actioningBlockId === b.id}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>{actioningBlockId === b.id ? "Submitting..." : "Submit Clearance"}</span>
                      </button>
                    )}
                    {b.status === "PENDING_APPROVAL" && (
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleRejectBlock(b.id)}
                          disabled={actioningBlockId === b.id}
                          className="px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApproveBlock(b.id)}
                          disabled={actioningBlockId === b.id}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>{actioningBlockId === b.id ? "Approving..." : "Approve"}</span>
                        </button>
                      </div>
                    )}
                    {b.status === "APPROVED" && (
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleReplanBlock(b.id)}
                          disabled={actioningBlockId === b.id}
                          className="px-2 py-1 rounded border border-purple-300 text-purple-800 hover:bg-purple-50 disabled:opacity-50 text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Re-plan</span>
                        </button>
                        <button
                          onClick={() => handleSelectBlock(b.id)}
                          disabled={actioningBlockId === b.id}
                          className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{actioningBlockId === b.id ? "Selecting..." : "Select Plan"}</span>
                        </button>
                      </div>
                    )}
                    {b.status === "SELECTED" && (
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded inline-flex items-center space-x-1 border border-sky-200">
                        <CheckCircle2 className="w-3 h-3 text-sky-600" />
                        <span>Selected Plan</span>
                      </span>
                    )}
                    {b.status === "REJECTED" && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded inline-flex items-center space-x-1 border border-red-200">
                        <XCircle className="w-3 h-3 text-red-500" />
                        <span>Rejected</span>
                      </span>
                    )}
                    {b.status === "RE_PLAN" && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded inline-flex items-center space-x-1 border border-purple-200">
                        <Clock className="w-3 h-3 text-purple-500" />
                        <span>Re-planning</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BlockReasoningModal
        isOpen={!!reasoningTarget}
        onClose={() => setReasoningTarget(null)}
        blockId={reasoningTarget?.blockId}
        taskId={reasoningTarget?.taskId}
        candidateId={reasoningTarget?.candidateId}
        fallbackItem={reasoningTarget?.fallbackItem}
      />
    </div>
  );
};
