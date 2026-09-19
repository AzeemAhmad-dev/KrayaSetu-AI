import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { BlockData } from "../types";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { useRole } from "../context/RoleContext";
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
} from "lucide-react";
import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";

export const CoordinationPage: React.FC = () => {
  const { currentRole, hasPermission } = useRole();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNotes, setActiveNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [reasoningBlockId, setReasoningBlockId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const canApprove = hasPermission("canApproveTrafficBlocks");

  useEffect(() => {
    loadBlocks();
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
      setBlocks(res);
    } catch (err) {
      console.error("Failed to load blocks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (blockId: string, action: "APPROVE" | "REJECT" | "RESCHEDULE" | "SELECT") => {
    setSubmitting(blockId);
    try {
      if (action === "APPROVE") {
        await api.approveBlockDirect(blockId, {
          actor: `${currentRole.name} (${currentRole.department})`,
          notes: activeNotes[blockId] || "Sanctioned at Joint Coordination Desk",
        });
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  status: "APPROVED",
                  approval_status: "APPROVED",
                  approved_by: `${currentRole.name} (${currentRole.department})`,
                  approval_notes: activeNotes[blockId] || "Sanctioned at Joint Coordination Desk",
                }
              : b
          )
        );
        setFeedback({
          type: "success",
          message: `Block ${blockId} sanctioned successfully by ${currentRole.name}. Marked as SANCTIONED and moved to Approved Blocks.`,
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

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-mono">Loading Operational Coordination...</div>;
  }

  const filteredBlocks = blocks.filter((b) => {
    if (selectedDept === "ALL") return true;
    if (selectedDept === "MULTI") return b.is_multi_department;
    if (selectedDept === "TRD") {
      return (b.departments && b.departments.includes("TRD")) || b.department_id === "TRD" || Boolean(b.power_isolation_required || b.trd_coordination_required);
    }
    return (b.departments && b.departments.includes(selectedDept)) || (b.department_id || "PWAY") === selectedDept;
  });

  const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedBlocks = [...filteredBlocks].sort((a, b) => {
    const rankA = priorityRank[a.task_priority || "MEDIUM"] ?? 4;
    const rankB = priorityRank[b.task_priority || "MEDIUM"] ?? 4;
    if (rankA !== rankB) return rankA - rankB;
    return a.id.localeCompare(b.id);
  });

  const pendingBlocks = sortedBlocks.filter((b) => ["PENDING", "PENDING_APPROVAL", "PROPOSED"].includes(b.status));
  const approvedBlocks = sortedBlocks.filter((b) => b.status === "APPROVED" || b.status === "SANCTIONED");
  const selectedBlocks = sortedBlocks.filter((b) => b.status === "SELECTED");
  const historicalBlocks = sortedBlocks.filter((b) => !["PENDING", "PENDING_APPROVAL", "PROPOSED", "APPROVED", "SANCTIONED", "SELECTED"].includes(b.status));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Multi-Department Coordination & Block Approvals
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Active Desk: <span className="font-bold text-slate-800">{currentRole.name}</span> · Operating · Station Master · P.Way · TRD Joint Desk
          </p>
        </div>
        <ProvenanceBadge type="REAL_PUBLIC" />
      </div>

      {/* Inline Feedback Banner (No Alert Popups) */}
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
        <span className="text-xs font-semibold text-slate-500 mr-2 flex-shrink-0">Department:</span>
        {[
          { id: "ALL", label: "All Departments", count: blocks.length },
          { id: "PWAY", label: "P.Way (Civil)", count: blocks.filter((b) => (b.departments ? b.departments.includes("PWAY") : (b.department_id || "PWAY") === "PWAY")).length },
          { id: "SNT", label: "S&T (Signaling)", count: blocks.filter((b) => (b.departments ? b.departments.includes("SNT") : b.department_id === "SNT")).length },
          { id: "TRD", label: "TRD (Traction / OHE)", count: blocks.filter((b) => (b.departments ? b.departments.includes("TRD") : b.department_id === "TRD") || Boolean(b.power_isolation_required || b.trd_coordination_required)).length },
          { id: "MULTI", label: "Multi-Department", count: blocks.filter((b) => b.is_multi_department).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedDept(tab.id)}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer flex-shrink-0 ${
              selectedDept === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedDept === tab.id ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

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
                  <div>
                    <div className="flex items-center space-x-2">
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
                      {b.status && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {b.status}
                        </span>
                      )}
                      {b.task_priority && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          b.task_priority === "CRITICAL" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {b.task_priority}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">Proposed by {b.proposed_by}</span>
                    </div>

                    <div className="text-xs text-slate-700 mt-1 font-semibold">
                      Corridor: {b.corridor_id} · Track: {b.track_name} (KM {b.location_km}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {b.conflict_summary}
                    </p>

                    <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-3 font-mono">
                      <span>Dept: <strong className="text-slate-800">{b.participating_departments || b.department_id || "PWAY"}</strong></span>
                      {b.is_multi_department && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          Multi-Department Block
                        </span>
                      )}
                      {((b.departments && b.departments.includes("TRD")) || b.department_id === "TRD") ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          TRD MAINTENANCE WORK
                        </span>
                      ) : (b.power_isolation_required || b.trd_coordination_required) ? (
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
                          <span>Requires Operations Sanction</span>
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
            No pending block clearance requests at this time.
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
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold font-mono text-slate-900 text-sm">{b.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>SANCTIONED</span>
                      </span>
                      {b.task_priority && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                          {b.task_priority}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-mono">Approved by {b.approved_by || "Controller"}</span>
                    </div>

                    <div className="text-xs text-slate-800 mt-1 font-semibold">
                      Corridor: {b.corridor_id} · Track: {b.track_name} (KM {b.location_km}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                    </div>

                    <div className="mt-2 text-[11px] text-slate-600 flex items-center space-x-3 font-mono">
                      <span>Dept: <strong className="text-slate-800">{b.department_id || "PWAY"}</strong></span>
                      <span>·</span>
                      <span>Machine: {b.assigned_machine || "Manual Squad"}</span>
                      <span>·</span>
                      <span>Notes: {b.approval_notes || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
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
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold font-mono text-slate-900 text-sm">{b.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-sky-600 inline" />
                        <span>SELECTED PLAN</span>
                      </span>
                      {b.task_priority && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                          {b.task_priority}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-mono">By {b.approved_by || "Controller"}</span>
                    </div>

                    <div className="text-xs text-slate-800 mt-1 font-semibold">
                      Corridor: {b.corridor_id} · Track: {b.track_name} (KM {b.location_km}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                    </div>

                    <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3 font-mono">
                      <span>Dept: <strong className="text-slate-800">{b.participating_departments || b.department_id || "PWAY"}</strong></span>
                      {b.is_multi_department && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          Multi-Department Block
                        </span>
                      )}
                      <span>·</span>
                      <span>Machine: {b.assigned_machine || "Manual Squad"}</span>
                      <span>·</span>
                      <span>Notes: {b.approval_notes || "Selected for operational master plan."}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
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
                      {b.track_name} (KM {b.location_km})
                    </td>
                    <td className="p-2.5 font-mono text-slate-900">
                      {b.requested_start_time} – {b.requested_end_time}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        b.status === "REJECTED"
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : b.status === "RE_PLAN"
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-medium text-slate-700">{b.approved_by || "System"}</td>
                    <td className="p-2.5 pr-4 text-slate-500 text-[11px]">{b.approval_notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BlockReasoningModal
        isOpen={!!reasoningBlockId}
        onClose={() => setReasoningBlockId(null)}
        blockId={reasoningBlockId || undefined}
      />
    </div>
  );
};
