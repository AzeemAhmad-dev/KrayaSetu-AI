import React, { useState } from "react";
import { BlockData } from "../../types";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import { BlockReasoningModal } from "./BlockReasoningModal";
import {
  Sparkles,
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  Send,
  Layers,
  ChevronDown,
  ChevronUp,
  Train
} from "lucide-react";

interface RoleBlockTableProps {
  blocks: BlockData[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  showActions?: boolean;
  onApprove?: (blockId: string) => Promise<void>;
  onReject?: (blockId: string) => Promise<void>;
  onSelect?: (blockId: string) => Promise<void>;
  onReplan?: (blockId: string) => Promise<void>;
  onSubmit?: (blockId: string) => Promise<void>;
  actioningBlockId?: string | null;
  showDepartmentColumn?: boolean;
}

export const RoleBlockTable: React.FC<RoleBlockTableProps> = ({
  blocks,
  title,
  subtitle,
  emptyMessage = "No maintenance blocks found matching this role criteria.",
  showActions = false,
  onApprove,
  onReject,
  onSelect,
  onReplan,
  onSubmit,
  actioningBlockId,
}) => {
  const [reasoningBlockId, setReasoningBlockId] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedBlockId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PROPOSED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            PROPOSED
          </span>
        );
      case "PENDING_APPROVAL":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
            PENDING APPROVAL
          </span>
        );
      case "APPROVED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            APPROVED
          </span>
        );
      case "SELECTED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-300 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-sky-600 inline" />
            <span>SELECTED PLAN</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-800 border border-red-200">
            REJECTED
          </span>
        );
      case "RE_PLAN":
      case "DEFERRED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200">
            RE-PLANNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (prio?: string) => {
    const p = (prio || "MEDIUM").toUpperCase();
    if (p === "CRITICAL") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-red-600 text-white animate-pulse">
          CRITICAL
        </span>
      );
    }
    if (p === "HIGH") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
          HIGH
        </span>
      );
    }
    if (p === "MEDIUM") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
        LOW
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {(title || subtitle) && (
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && (
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider font-mono flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#0b2545]" />
                <span>{title}</span>
                <span className="text-slate-500 font-normal">({blocks.length})</span>
              </h3>
            )}
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <div className="text-xs text-slate-500 font-mono">{emptyMessage}</div>
          <div className="text-[11px] text-slate-400">
            Blocks created or cleared in the central planning workflow will appear here in real time.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Block ID & Priority</th>
                <th className="py-2.5 px-3">Corridor & Section</th>
                <th className="py-2.5 px-3">Location / Track</th>
                <th className="py-2.5 px-3">Department(s)</th>
                <th className="py-2.5 px-3">Slot & Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {blocks.map((b) => {
                const isExpanded = expandedBlockId === b.id;
                const hasTrainConflict = b.conflicting_trains && b.conflicting_trains.length > 0;

                return (
                  <React.Fragment key={b.id}>
                    <tr className={`hover:bg-slate-50/70 transition-colors ${b.task_priority === "CRITICAL" ? "bg-red-50/20" : ""}`}>
                      {/* Block ID & Priority */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col space-y-1">
                          <span className="font-mono font-black text-slate-900 text-xs">{b.id}</span>
                          <div>{getPriorityBadge(b.task_priority)}</div>
                          {b.task_id && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Task: <strong>{b.task_id}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Corridor & Section */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{b.corridor_id}</div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {b.section_id || "Mainline Section"}
                        </div>
                      </td>

                      {/* Location / Track */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-slate-800">{b.track_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          KM {b.location_km.toFixed(3)}
                        </div>
                        {b.assigned_machine && (
                          <div className="text-[10px] text-sky-800 font-mono mt-0.5 truncate max-w-[150px]" title={b.assigned_machine}>
                            Mach: {b.assigned_machine}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-block w-fit">
                            {b.department_id || "PWAY"}
                          </span>
                          {b.is_multi_department && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-200 inline-block w-fit">
                              Multi-Dept Block
                            </span>
                          )}
                          {b.power_isolation_required && (
                            <span className="text-[10px] font-mono font-semibold text-amber-700 flex items-center space-x-1">
                              <Zap className="w-3 h-3 text-amber-600 inline" />
                              <span>25kV Power Cut</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Slot & Duration */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">
                          {b.requested_start_time} – {b.requested_end_time}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{b.duration_mins} mins</span>
                        </div>
                        {hasTrainConflict && (
                          <span className="text-[10px] text-red-700 font-mono font-semibold mt-0.5 inline-flex items-center space-x-0.5">
                            <Train className="w-2.5 h-2.5 text-red-600" />
                            <span>{b.conflicting_trains.length} Train(s) Impacted</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {getStatusBadge(b.status)}
                          {b.approved_by && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              By: {b.approved_by}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions & Reasoning */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setReasoningBlockId(b.id)}
                            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                            title="View AI Decision Rationale & Impact Analysis"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Reasoning</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpand(b.id)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer transition-colors"
                            title="Toggle expanded details"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {showActions && (
                            <>
                              {b.status === "PROPOSED" && onSubmit && (
                                <button
                                  type="button"
                                  onClick={() => onSubmit(b.id)}
                                  disabled={actioningBlockId === b.id}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>{actioningBlockId === b.id ? "Submitting..." : "Submit"}</span>
                                </button>
                              )}

                              {b.status === "PENDING_APPROVAL" && (
                                <>
                                  {onReject && (
                                    <button
                                      type="button"
                                      onClick={() => onReject(b.id)}
                                      disabled={actioningBlockId === b.id}
                                      className="px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 text-[10px] font-bold cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  )}
                                  {onApprove && (
                                    <button
                                      type="button"
                                      onClick={() => onApprove(b.id)}
                                      disabled={actioningBlockId === b.id}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      {actioningBlockId === b.id ? "Approving..." : "Approve"}
                                    </button>
                                  )}
                                </>
                              )}

                              {b.status === "APPROVED" && (
                                <>
                                  {onReplan && (
                                    <button
                                      type="button"
                                      onClick={() => onReplan(b.id)}
                                      disabled={actioningBlockId === b.id}
                                      className="px-2 py-1 rounded border border-purple-300 text-purple-800 hover:bg-purple-50 disabled:opacity-50 text-[10px] font-bold cursor-pointer"
                                    >
                                      Re-plan
                                    </button>
                                  )}
                                  {onSelect && (
                                    <button
                                      type="button"
                                      onClick={() => onSelect(b.id)}
                                      disabled={actioningBlockId === b.id}
                                      className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      {actioningBlockId === b.id ? "Selecting..." : "Select Plan"}
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={7} className="p-3 text-xs space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-2.5 bg-white rounded border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Conflict Analysis</span>
                              <div className="mt-1 font-medium text-slate-800">{b.conflict_summary || "No active conflict identified."}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Protection: {b.protection_type}</div>
                            </div>

                            <div className="p-2.5 bg-white rounded border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Participating Departments</span>
                              <div className="mt-1 font-bold text-slate-800">{b.participating_departments || b.department_id || "P.Way"}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Proposed by: {b.proposed_by}
                              </div>
                            </div>

                            <div className="p-2.5 bg-white rounded border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Approval Audit Trail</span>
                              <div className="mt-1 font-medium text-slate-800">{b.approval_notes || "Sanction pending review."}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Created: {b.created_at ? new Date(b.created_at).toLocaleTimeString() : "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
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
