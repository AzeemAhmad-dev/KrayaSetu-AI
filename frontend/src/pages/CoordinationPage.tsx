import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { BlockData } from "../types";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { useRole } from "../context/RoleContext";
import { useInvalidateCanonicalData } from "../hooks/useCanonicalData";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Send,
  Sparkles,
  Search,
  Building2,
  CheckCircle2,
  Layers,
  Calendar,
  X,
  RefreshCw,
  GitMerge,
} from "lucide-react";
import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";
import { formatDistanceKm, formatKmBadge, formatKmValue } from "../utils/formatDistance";

export const CoordinationPage: React.FC = () => {
  const { currentRole, hasPermission } = useRole();
  const invalidateCanonicalData = useInvalidateCanonicalData();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [reasoningBlockId, setReasoningBlockId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [datasetFingerprint, setDatasetFingerprint] = useState<string>("CANONICAL");

  const canApprove = hasPermission("canApproveTrafficBlocks");

  const handleRegenerateCanonical = async () => {
    setRegenerating(true);
    try {
      const res = await api.regenerateCanonicalBlocks();
      if (res.dataset_fingerprint) {
        setDatasetFingerprint(res.dataset_fingerprint);
      }
      setFeedback({
        type: "success",
        message: res.message || "50 planning blocks regenerated successfully.",
      });
      await invalidateCanonicalData();
      await loadBlocks();
      await loadCompletedTasks();
    } catch (err: any) {
      console.error("Failed to regenerate planning blocks:", err);
      const errMsg = err?.detail || err?.message || String(err);
      setFeedback({
        type: "error",
        message: "Error regenerating blocks: " + errMsg,
      });
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    loadBlocks();
    loadCompletedTasks();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadBlocks = async () => {
    try {
      const res = await api.getBlocks();
      // Joint Coordination Desk: only display blocks that have been submitted
      // (PENDING_APPROVAL or later). Raw PROPOSED blocks remain in Block Planner only.
      const submitted = res.filter((b: any) => b.status !== "PROPOSED");
      setBlocks(submitted);
    } catch (err) {
      console.error("Failed to load blocks", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedTasks = async () => {
    setLoadingCompleted(true);
    try {
      const data = await api.getCompletedTasks();
      setCompletedTasks(data);
    } catch (err) {
      console.error("Failed to load completed tasks", err);
    } finally {
      setLoadingCompleted(false);
    }
  };

  const handleAction = async (blockId: string, action: "APPROVE" | "REJECT" | "RESCHEDULE" | "SELECT") => {
    setSubmitting(blockId);
    try {
      if (action === "APPROVE") {
        if (!canApprove) {
          setFeedback({
            type: "error",
            message: "Unauthorized: Block sanction authority is strictly held by the Chief of Block Officer (COBO).",
          });
          setSubmitting(null);
          return;
        }
        await api.approveBlockDirect(blockId, {
          actor: "Chief of Block Officer (COA / Bhopal)",
          role: "CHIEF_OF_BLOCK_OFFICER",
          notes: activeNotes[blockId] || "Sanctioned at Joint Coordination Desk",
        });
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status: "APPROVED",
                  approval_status: "APPROVED",
                  approved_by: "Chief of Block Officer (COA / Bhopal)",
                  approval_notes: activeNotes[blockId] || "Sanctioned at Joint Coordination Desk",
                }
              : b
          )
        );
        setFeedback({
          type: "success",
          message: `Block ${blockId} sanctioned successfully by Chief of Block Officer (COBO). Marked as SANCTIONED and moved to Approved Blocks.`,
        });
      } else if (action === "REJECT") {
        await api.rejectBlockDirect(blockId, {
          actor: `${currentRole.name} (${currentRole.department})`,
          notes: activeNotes[blockId] || "Rejected at Joint Coordination Desk",
        });
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status: "REJECTED",
                  approval_status: "REJECTED",
                }
              : b
          )
        );
        setFeedback({
          type: "info",
          message: `Block ${blockId} rejected.`,
        });
      } else if (action === "SELECT") {
        await api.selectBlockDirect(blockId, {
          actor: `${currentRole.name} (${currentRole.department})`,
          notes: activeNotes[blockId] || "Selected into Operational Master Schedule",
        });
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status: "SELECTED",
                  approval_status: "SELECTED",
                }
              : b
          )
        );
        setFeedback({
          type: "success",
          message: `Block ${blockId} selected into Operational Master Schedule.`,
        });
      } else if (action === "RESCHEDULE") {
        await api.replanBlockDirect(blockId, {
          actor: `${currentRole.name} (${currentRole.department})`,
          notes: activeNotes[blockId] || "Returned for re-planning",
        });
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status: "RE_PLAN",
                  approval_status: "RE_PLAN",
                }
              : b
          )
        );
        setFeedback({
          type: "info",
          message: `Block ${blockId} returned for re-planning.`,
        });
      }
      await invalidateCanonicalData();
      await loadBlocks();
    } catch (err: any) {
      console.error("Action failed:", err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to execute block action",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleCompleteIndividualTask = async (taskId: string, dept: string) => {
    try {
      await api.completeTask(taskId, {
        completed_by: `Joint Coordination Desk (${currentRole.name})`,
        notes: `Individual ${dept} task completed by field gang`,
      });
      setFeedback({
        type: "success",
        message: `Task ${taskId} (${dept}) marked as COMPLETED. Note: Parent block remains in active operational schedule.`,
      });
      await loadBlocks();
      await loadCompletedTasks();
    } catch (err: any) {
      console.error("Failed to complete task:", err);
      setFeedback({
        type: "error",
        message: err.message || `Failed to complete task ${taskId}`,
      });
    }
  };

  /**
   * Search matching against backend block data and ALL bundled child tasks.
   * Searching by child task ID (e.g. TASK-SHD-01-3) or department (S&T)
   * preserves the complete parent Shadow Block with all associated department tasks.
   */
  const matchBlock = (b: BlockData, q: string): boolean => {
    if (!q || !q.trim()) return true;
    const lower = q.toLowerCase().trim();

    // 1. Match Block ID
    if (b.id.toLowerCase().includes(lower)) return true;

    // 2. Match Block Type (SHADOW, PLANNED, EMERGENT, RULING)
    if (b.block_type?.toLowerCase().includes(lower)) return true;

    // 3. Match Primary Task ID
    if (b.task_id?.toLowerCase().includes(lower)) return true;

    // 4. Match Corridor & Section
    if (b.corridor_id?.toLowerCase().includes(lower)) return true;
    if (b.section_id?.toLowerCase().includes(lower)) return true;
    if (b.section_name?.toLowerCase().includes(lower)) return true;
    if (b.track_name?.toLowerCase().includes(lower)) return true;
    if (b.from_station_code?.toLowerCase().includes(lower)) return true;
    if (b.to_station_code?.toLowerCase().includes(lower)) return true;
    if (b.station_codes?.some((s) => s.toLowerCase().includes(lower))) return true;

    // 5. Match Location KM (exact or partial string)
    if (b.location_km != null) {
      if (b.location_km.toString().includes(lower)) return true;
      if (formatDistanceKm(b.location_km).toLowerCase().includes(lower)) return true;
    }

    // 6. Match Department strings
    if (b.department_id?.toLowerCase().includes(lower)) return true;
    if (b.departments?.some((d) => d.toLowerCase().includes(lower))) return true;
    if (b.participating_departments?.toLowerCase().includes(lower)) return true;

    // 7. Match Status & Machine & Planner
    if (b.status?.toLowerCase().includes(lower)) return true;
    if (b.approval_status?.toLowerCase().includes(lower)) return true;
    if (b.conflict_status?.toLowerCase().includes(lower)) return true;
    if (b.conflict_summary?.toLowerCase().includes(lower)) return true;
    if (b.assigned_machine?.toLowerCase().includes(lower)) return true;
    if (b.proposed_by?.toLowerCase().includes(lower)) return true;

    // 8. Match in bundled tasks (Task ID, Fault ID, Department, Work Type, Title)
    if (b.tasks && b.tasks.length > 0) {
      const taskMatch = b.tasks.some((t: any) => {
        if (t.id?.toLowerCase().includes(lower)) return true;
        if (t.fault_id?.toLowerCase().includes(lower)) return true;
        if (t.department_id?.toLowerCase().includes(lower)) return true;
        if (t.work_type_id?.toLowerCase().includes(lower)) return true;
        if (t.title?.toLowerCase().includes(lower)) return true;
        if (t.track_name?.toLowerCase().includes(lower)) return true;
        if (t.status?.toLowerCase().includes(lower)) return true;
        return false;
      });
      if (taskMatch) return true;
    }

    // 9. Match in bundled_tasks string IDs
    if (b.bundled_tasks?.some((bt: string) => bt.toLowerCase().includes(lower))) return true;

    return false;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-mono">Loading Operational Coordination...</div>;
  }

  // Filter by selected tab
  const tabFilteredBlocks = blocks.filter((b) => {
    // If a search query is active, include any block matching that query across any child task or metadata
    if (searchQuery.trim() && matchBlock(b, searchQuery)) return true;
    if (selectedDept === "ALL" || selectedDept === "COMPLETED") return true;
    if (selectedDept === "MULTI") return b.is_multi_department || b.block_type === "SHADOW" || (b.tasks && b.tasks.length > 1);
    if (selectedDept === "TRD") {
      return (
        (b.departments && b.departments.includes("TRD")) ||
        b.department_id === "TRD" ||
        Boolean(b.power_isolation_required || b.trd_coordination_required) ||
        (b.tasks && b.tasks.some((t: any) => t.department_id === "TRD"))
      );
    }
    return (
      (b.departments && b.departments.includes(selectedDept)) ||
      (b.department_id || "PWAY") === selectedDept ||
      (b.tasks && b.tasks.some((t: any) => t.department_id === selectedDept))
    );
  });

  // Filter by search query
  const filteredBlocks = tabFilteredBlocks.filter((b) => matchBlock(b, searchQuery));

  const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedBlocks = [...filteredBlocks].sort((a, b) => {
    const rankA = priorityRank[a.task_priority || "MEDIUM"] ?? 4;
    const rankB = priorityRank[b.task_priority || "MEDIUM"] ?? 4;
    if (rankA !== rankB) return rankA - rankB;
    return a.id.localeCompare(b.id);
  });

  const pendingBlocks = sortedBlocks.filter((b) => ["PENDING", "PENDING_APPROVAL"].includes(b.status));
  const approvedBlocks = sortedBlocks.filter((b) => b.status === "APPROVED" || b.status === "SANCTIONED");
  const selectedBlocks = sortedBlocks.filter((b) => b.status === "SELECTED");
  const historicalBlocks = sortedBlocks.filter(
    (b) => !["PENDING", "PENDING_APPROVAL", "APPROVED", "SANCTIONED", "SELECTED"].includes(b.status)
  );

  // Filter completed tasks by search query if in COMPLETED tab
  const filteredCompletedTasks = completedTasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.id?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.department_id?.toLowerCase().includes(q) ||
      t.corridor_id?.toLowerCase().includes(q) ||
      t.section_id?.toLowerCase().includes(q) ||
      t.block_id?.toLowerCase().includes(q) ||
      t.assigned_crew?.toLowerCase().includes(q) ||
      (t.location_km != null && formatDistanceKm(t.location_km).toLowerCase().includes(q))
    );
  });

  /**
   * Sub-component to render the Unified Shadow Block / Multi-Department task breakdown.
   * Displays ALL associated department tasks under the block with independent statuses.
   */
  const renderMultiDepartmentTasks = (b: BlockData) => {
    const isShadow = b.block_type === "SHADOW" || b.is_multi_department || (b.tasks && b.tasks.length > 1);
    if (!isShadow) return null;

    const taskList = b.tasks && b.tasks.length > 0 ? b.tasks : [];

    return (
      <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/50 border border-indigo-200 rounded-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-indigo-600 text-white">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs text-indigo-950 font-mono uppercase tracking-wide">
                {b.block_type === "SHADOW"
                  ? "Unified Shadow Block Possession"
                  : "Multi-Department Joint Possession Window"}
              </span>
              <span className="text-[10px] text-indigo-700/80 block font-mono">
                1 Consolidated Possession · All Departments Visible Together (Zero Traffic Splitting)
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
            {taskList.length} Coordinated Department Tasks
          </span>
        </div>

        {/* Department Tasks Breakdown */}
        <div className="divide-y divide-slate-200 border border-slate-200/90 rounded-lg overflow-hidden bg-white shadow-2xs">
          {taskList.length > 0 ? (
            taskList.map((task: any, tidx: number) => {
              const isDone = task.status === "COMPLETED";
              const isRunning = task.status === "IN_PROGRESS" || task.status === "WORK_STARTED";
              const deptColors: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
                PWAY: { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200", label: "P.Way (Civil)", dot: "bg-blue-600" },
                SNT: { bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-200", label: "S&T (Signaling)", dot: "bg-purple-600" },
                TRD: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200", label: "TRD (25kV OHE)", dot: "bg-amber-600" },
              };
              const deptStyle = deptColors[task.department_id] || {
                bg: "bg-slate-50",
                text: "text-slate-800",
                border: "border-slate-200",
                label: task.department_id || "Dept",
                dot: "bg-slate-600",
              };

              return (
                <div key={task.id || tidx} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/75 transition-colors">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border flex-shrink-0 mt-0.5 flex items-center space-x-1 ${deptStyle.bg} ${deptStyle.text} ${deptStyle.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${deptStyle.dot}`}></span>
                      <span>{deptStyle.label}</span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono">
                        <strong className="text-slate-900 font-bold">{task.id}</strong>
                        {task.fault_id && (
                          <span className="text-[10px] text-slate-500">· Ref: {task.fault_id}</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {formatKmBadge(task.location_km ?? b.location_km)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({formatDistanceKm(task.location_km ?? b.location_km)})
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium text-[11px] mt-0.5 truncate">
                        {task.title || task.work_type_id}
                      </div>
                    </div>
                  </div>

                  {/* Independent Department Status */}
                  <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                    {isDone ? (
                      <span className="px-2.5 py-1 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          COMPLETED {task.completed_at ? `(${new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}
                        </span>
                      </span>
                    ) : isRunning ? (
                      <span className="px-2.5 py-1 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>IN PROGRESS</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-300">
                        {task.status || "NOT STARTED / PENDING"}
                      </span>
                    )}

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => handleCompleteIndividualTask(task.id, deptStyle.label)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] cursor-pointer shadow-2xs transition-colors flex items-center space-x-1"
                        title="Mark this department's task as finished (parent block remains active)"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Finish Task</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-xs text-slate-500 font-mono">
              Primary Task: {b.task_id} ({b.department_id || "PWAY"})
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-slate-800" />
            <span>Multi-Department Coordination & Block Approvals</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Active Desk: <span className="font-bold text-slate-800">{currentRole.name}</span> · Operating · Station Master · P.Way · S&T · TRD Joint Desk
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProvenanceBadge type="REAL_PUBLIC" />
          <Link
            to="/baseline-comparison"
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg border border-emerald-500/80 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            title="View Independent Baseline vs Co-located Optimizer Comparison"
          >
            <GitMerge className="w-3.5 h-3.5 text-emerald-200" />
            <span>Baseline Comparison (-24.9%)</span>
          </Link>
          <button
            onClick={handleRegenerateCanonical}
            disabled={regenerating}
            className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg border border-indigo-500 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
              regenerating ? "opacity-60 cursor-not-allowed" : ""
            }`}
            title="Generate a new validated 50-block planning scenario"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin text-white" : ""}`} />
            <span>{regenerating ? "Validating & Promoting..." : "Regenerate 50 Blocks"}</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs font-medium border shadow-xs transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : feedback.type === "error"
              ? "bg-red-50 text-red-900 border-red-300"
              : "bg-blue-50 text-blue-900 border-blue-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            {feedback.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
            {feedback.type === "info" && <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold px-1.5 py-0.5"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Department Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-500 mr-2 flex-shrink-0">Filter Workspace:</span>
        {[
          { id: "ALL", label: "All Departments", count: blocks.length },
          {
            id: "PWAY",
            label: "P.Way (Civil)",
            count: blocks.filter(
              (b) =>
                (b.departments ? b.departments.includes("PWAY") : (b.department_id || "PWAY") === "PWAY") ||
                (b.tasks && b.tasks.some((t: any) => t.department_id === "PWAY"))
            ).length,
          },
          {
            id: "SNT",
            label: "S&T (Signaling)",
            count: blocks.filter(
              (b) =>
                (b.departments ? b.departments.includes("SNT") : b.department_id === "SNT") ||
                (b.tasks && b.tasks.some((t: any) => t.department_id === "SNT"))
            ).length,
          },
          {
            id: "TRD",
            label: "TRD (Traction / OHE)",
            count: blocks.filter(
              (b) =>
                (b.departments ? b.departments.includes("TRD") : b.department_id === "TRD") ||
                Boolean(b.power_isolation_required || b.trd_coordination_required) ||
                (b.tasks && b.tasks.some((t: any) => t.department_id === "TRD"))
            ).length,
          },
          {
            id: "MULTI",
            label: "Multi-Department / Shadow",
            count: blocks.filter((b) => b.is_multi_department || b.block_type === "SHADOW" || (b.tasks && b.tasks.length > 1)).length,
          },
          {
            id: "COMPLETED",
            label: "Completed Tasks",
            count: completedTasks.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedDept(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer flex-shrink-0 ${
              selectedDept === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedDept === tab.id ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* COBO Multi-Department Search Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Block ID, Task ID (e.g. TASK-SHD-01-3), Fault ID, Corridor (BPL-ET), Station, Department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Execute Search across all departments and child tasks"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-600 font-mono">
          {searchQuery ? (
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-bold">
              Found {selectedDept === "COMPLETED" ? filteredCompletedTasks.length : filteredBlocks.length} matches (All coordinated tasks included)
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              {selectedDept === "COMPLETED" ? `${completedTasks.length} Completed Tasks Recorded` : `${blocks.length} Total Registered Blocks`}
            </span>
          )}
        </div>
      </div>

      {/* View: Dedicated "Completed Tasks" Ledger */}
      {selectedDept === "COMPLETED" ? (
        <div className="bg-white rounded-xl border border-emerald-300 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-emerald-950 text-xs tracking-wide flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>DEPARTMENT COMPLETED TASKS LEDGER ({filteredCompletedTasks.length})</span>
              </span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Individual department task completion recorded with timestamp. 
                <strong className="text-emerald-950 ml-1">Important:</strong> The parent block remains in active operational schedule until all participating squads conclude work.
              </p>
            </div>
            <button
              onClick={loadCompletedTasks}
              disabled={loadingCompleted}
              className="px-2.5 py-1 text-[11px] bg-white border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors flex items-center space-x-1 cursor-pointer font-medium"
            >
              <RefreshCw className={`w-3 h-3 ${loadingCompleted ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {filteredCompletedTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50/50 border-b border-emerald-100 font-mono uppercase text-[11px] text-slate-600">
                  <tr>
                    <th className="p-3 pl-4">Task ID</th>
                    <th className="p-3">Block ID</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Completed By</th>
                    <th className="p-3">Completion Time</th>
                    <th className="p-3">Block Status</th>
                    <th className="p-3 pr-4">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompletedTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-slate-900">
                        {t.task_id || t.id}
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {t.block_id || "Unlinked"}
                      </td>
                      <td className="p-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            t.department_id === "PWAY"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : t.department_id === "SNT"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {t.department_id}
                        </span>
                      </td>
                      <td className="p-3 text-slate-800 text-[11px] font-medium max-w-[200px] truncate" title={t.description || t.title}>
                        {t.description || t.title}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        <div>{t.corridor_id} · Track {t.track_name}</div>
                        <div className="text-slate-500 font-bold">{formatDistanceKm(t.location_km)}</div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium text-[11px]">
                        {t.completed_by || t.assigned_crew || "Field Squad"}
                      </td>
                      <td className="p-3 font-mono text-slate-900 text-[11px]">
                        {t.completed_at ? new Date(t.completed_at).toLocaleString() : "Recently Completed"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            t.block_status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : t.block_status === "SELECTED"
                              ? "bg-sky-100 text-sky-900 border-sky-300"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {t.block_status}
                        </span>
                      </td>
                      <td className="p-3 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            t.verification_status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          {t.verification_status || "VERIFIED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No completed departmental tasks found matching current filters.
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Pending Blocks for Approval */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs tracking-wide">
                PENDING BLOCK REQUESTS REQUIRING DIVISIONAL CLEARANCE ({pendingBlocks.length})
              </span>
              <ProvenanceBadge type="DERIVED" size="sm" />
            </div>

            {pendingBlocks.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {pendingBlocks.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 text-sm">{b.id}</span>
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                              b.conflict_status === "CONFLICT"
                                ? "bg-red-100 text-red-800"
                                : b.conflict_status === "POTENTIAL CONFLICT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {b.conflict_status}
                          </span>
                          {b.block_type && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                              {b.block_type} BLOCK
                            </span>
                          )}
                          {b.status && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              {b.status}
                            </span>
                          )}
                          {b.task_priority && (
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                b.task_priority === "CRITICAL" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {b.task_priority}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-mono">Proposed by {b.proposed_by}</span>
                        </div>

                        <div className="text-xs text-slate-700 mt-1.5 font-semibold">
                          Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                        </div>

                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {b.conflict_summary}
                        </p>

                        <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-3 font-mono">
                          <span>
                            Dept: <strong className="text-slate-800">{b.participating_departments || b.department_id || "PWAY"}</strong>
                          </span>
                          {b.is_multi_department && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              Multi-Department Block
                            </span>
                          )}
                          {(b.departments && b.departments.includes("TRD")) || b.department_id === "TRD" ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              TRD MAINTENANCE WORK
                            </span>
                          ) : b.power_isolation_required || b.trd_coordination_required ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              ⚡ POWER ISOLATION ONLY
                            </span>
                          ) : null}
                          <span>·</span>
                          <span>Protection: {b.protection_type}</span>
                          <span>·</span>
                          <span>Power Isolation: {b.power_isolation_required ? "YES (TRD 25kV)" : "NO"}</span>
                          <span>·</span>
                          <span>Machine: {b.assigned_machine || "Manual Squad"}</span>
                        </div>

                        {/* Coordinated Tasks Breakdown */}
                        {renderMultiDepartmentTasks(b)}
                      </div>

                      {/* Actions & Notes */}
                      <div className="flex flex-col items-end space-y-2 flex-shrink-0 min-w-[280px]">
                        <input
                          type="text"
                          placeholder={`${currentRole.name} remarks...`}
                          value={activeNotes[b.id] || ""}
                          onChange={(e) => setActiveNotes({ ...activeNotes, [b.id]: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded bg-slate-50"
                        />

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setReasoningBlockId(b.id)}
                            className="px-2.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                            title="View Explainable Decision Support & Train Impact"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Reasoning</span>
                          </button>

                          {canApprove ? (
                            <>
                              <button
                                onClick={() => handleAction(b.id, "REJECT")}
                                disabled={submitting === b.id}
                                className="px-3 py-1.5 rounded border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleAction(b.id, "RESCHEDULE")}
                                disabled={submitting === b.id}
                                className="px-3 py-1.5 rounded border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Reschedule</span>
                              </button>
                              <button
                                onClick={() => handleAction(b.id, "APPROVE")}
                                disabled={submitting === b.id}
                                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Sanction Block</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <span>Requires Chief of Block Officer (COBO) Sanction</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                No pending block clearance requests matching search criteria.
              </div>
            )}
          </div>

          {/* Approved Blocks Ready for Operational Selection */}
          {approvedBlocks.length > 0 && (
            <div className="bg-white rounded-lg border border-emerald-300 shadow-xs overflow-hidden">
              <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-xs tracking-wide flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>APPROVED BLOCKS READY FOR OPERATIONAL SELECTION ({approvedBlocks.length})</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-medium">Controller Sanctioned · Select for Operational Planning</span>
              </div>

              <div className="divide-y divide-emerald-100">
                {approvedBlocks.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-emerald-50/40 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 text-sm">{b.id}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>SANCTIONED</span>
                          </span>
                          {b.block_type && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                              {b.block_type} BLOCK
                            </span>
                          )}
                          {b.task_priority && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                              {b.task_priority}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-mono">Approved by {b.approved_by || "Controller"}</span>
                        </div>

                        <div className="text-xs text-slate-800 mt-1.5 font-semibold">
                          Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                        </div>

                        <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3 font-mono">
                          <span>
                            Dept: <strong className="text-slate-800">{b.participating_departments || b.department_id || "PWAY"}</strong>
                          </span>
                          <span>·</span>
                          <span>Machine: {b.assigned_machine || "Manual Squad"}</span>
                          {b.approval_notes && !b.approval_notes.trim().startsWith("{") && (
                            <>
                              <span>·</span>
                              <span>Remarks: {b.approval_notes}</span>
                            </>
                          )}
                        </div>

                        {renderMultiDepartmentTasks(b)}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 self-end md:self-center">
                        <button
                          onClick={() => setReasoningBlockId(b.id)}
                          className="px-2.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          title="View Explainable Decision Support & Train Impact"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Reasoning</span>
                        </button>
                        <button
                          onClick={() => handleAction(b.id, "RESCHEDULE")}
                          disabled={submitting === b.id}
                          className="px-3 py-1.5 rounded border border-purple-300 hover:bg-purple-50 text-purple-800 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Re-plan</span>
                        </button>
                        <button
                          onClick={() => handleAction(b.id, "SELECT")}
                          disabled={submitting === b.id}
                          className="px-3.5 py-1.5 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Select Block Plan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Blocks Cleared for Operational Master Schedule */}
          {selectedBlocks.length > 0 && (
            <div className="bg-white rounded-lg border border-sky-300 shadow-xs overflow-hidden">
              <div className="p-3 bg-sky-50 border-b border-sky-200 flex items-center justify-between">
                <span className="font-bold text-sky-950 text-xs tracking-wide flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-sky-700" />
                  <span>SELECTED BLOCKS CLEARED FOR OPERATIONAL PLANNING ({selectedBlocks.length})</span>
                </span>
                <span className="text-[11px] text-sky-800 font-medium">Selected into Master Schedule · Multi-Department Synchronized</span>
              </div>

              <div className="divide-y divide-sky-100">
                {selectedBlocks.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-sky-50/40 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 text-sm">{b.id}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-sky-600 inline" />
                            <span>SELECTED PLAN</span>
                          </span>
                          {b.block_type && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                              {b.block_type} BLOCK
                            </span>
                          )}
                          {b.task_priority && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                              {b.task_priority}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-mono">By {b.approved_by || "Controller"}</span>
                        </div>

                        <div className="text-xs text-slate-800 mt-1.5 font-semibold">
                          Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                        </div>

                        <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3 font-mono">
                          <span>
                            Dept: <strong className="text-slate-800">{b.participating_departments || b.department_id || "PWAY"}</strong>
                          </span>
                          {b.is_multi_department && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              Multi-Department Block
                            </span>
                          )}
                          <span>·</span>
                          <span>Machine: {b.assigned_machine || "Manual Squad"}</span>
                          {b.approval_notes && !b.approval_notes.trim().startsWith("{") && (
                            <>
                              <span>·</span>
                              <span>Remarks: {b.approval_notes}</span>
                            </>
                          )}
                        </div>

                        {renderMultiDepartmentTasks(b)}
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 self-end md:self-center">
                        <button
                          onClick={() => setReasoningBlockId(b.id)}
                          className="px-2.5 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="View AI Decision Rationale & Train Impact"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Reasoning</span>
                        </button>
                        <span className="text-xs font-mono font-bold text-sky-800 bg-sky-100 px-3 py-1.5 rounded border border-sky-300">
                          Cleared for Execution
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Processed Blocks */}
          {historicalBlocks.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs tracking-wide">
                  HISTORICAL & RE-PLAN LEDGER ({historicalBlocks.length})
                </span>
                <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5 pl-4">Block ID</th>
                      <th className="p-2.5">Dept</th>
                      <th className="p-2.5">Track / KM</th>
                      <th className="p-2.5">Slot</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Decision Maker</th>
                      <th className="p-2.5 pr-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historicalBlocks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2.5 pl-4 font-mono font-bold text-slate-900">{b.id}</td>
                        <td className="p-2.5 font-mono text-slate-600 font-semibold">{b.department_id || "PWAY"}</td>
                        <td className="p-2.5 font-mono text-slate-700">
                          {b.track_name} ({formatDistanceKm(b.location_km)})
                        </td>
                        <td className="p-2.5 font-mono text-slate-900">
                          {b.requested_start_time} – {b.requested_end_time}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              b.status === "REJECTED"
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : b.status === "RE_PLAN"
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : "bg-slate-100 text-slate-700 border border-slate-300"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-700">{b.approved_by || "System"}</td>
                        <td className="p-2.5 pr-4 text-slate-500 text-[11px]">
                          {b.approval_notes && !b.approval_notes.trim().startsWith("{") ? b.approval_notes : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <BlockReasoningModal
        isOpen={!!reasoningBlockId}
        onClose={() => setReasoningBlockId(null)}
        blockId={reasoningBlockId || undefined}
      />
    </div>
  );
};
