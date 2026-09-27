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
  Train,
  ShieldCheck
} from "lucide-react";
import { formatDistanceKm } from "../../utils/formatDistance";
import { Button, EmptyState } from "../ui";

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
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            PROPOSED
          </span>
        );
      case "PENDING_APPROVAL":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
            PENDING APPROVAL
          </span>
        );
      case "APPROVED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
            APPROVED
          </span>
        );
      case "SELECTED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)] flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-[var(--status-success)] inline" />
            <span>SELECTED PLAN</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]">
            REJECTED
          </span>
        );
      case "RE_PLAN":
      case "DEFERRED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            RE-PLANNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (prio?: string) => {
    const p = (prio || "MEDIUM").toUpperCase();
    if (p === "CRITICAL") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-[var(--status-danger)] text-white animate-pulse">
          CRITICAL
        </span>
      );
    }
    if (p === "HIGH") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
          HIGH
        </span>
      );
    }
    if (p === "MEDIUM") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
        LOW
      </span>
    );
  };

  const getBlockTypeBadge = (blockType?: string) => {
    const bt = (blockType || "PLANNED").toUpperCase();
    switch (bt) {
      case "RULING":
        return (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--lock-ruling-bg)] text-[var(--lock-ruling-text)] border border-[var(--lock-ruling-border)] inline-flex items-center space-x-1"
            title="Ruling Block: Long-term Annual Maintenance Programme 2026"
          >
            <span>🏛️</span>
            <span>RULING</span>
          </span>
        );
      case "EMERGENT":
        return (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--lock-emergent-bg)] text-[var(--lock-emergent-text)] border border-[var(--lock-emergent-border)] inline-flex items-center space-x-1"
            title="Emergent Block: P1 Critical Safety Intervention"
          >
            <span>🚨</span>
            <span>EMERGENT</span>
          </span>
        );
      case "SHADOW":
        return (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--lock-shadow-bg)] text-[var(--lock-shadow-text)] border border-[var(--lock-shadow-border)] inline-flex items-center space-x-1"
            title="Shadow Block: Opportunistic multi-department possession"
          >
            <span>👥</span>
            <span>SHADOW</span>
          </span>
        );
      default:
        return (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--lock-planned-bg)] text-[var(--lock-planned-text)] border border-[var(--lock-planned-border)] inline-flex items-center space-x-1"
            title="Planned Block: Divisional Maintenance Programme"
          >
            <span>📋</span>
            <span>PLANNED</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
      {(title || subtitle) && (
        <div className="p-3.5 bg-[var(--surface-secondary)]/60 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <div>
            {title && (
              <h3 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm uppercase tracking-wider font-mono flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[var(--brand-navy)] dark:text-sky-400" />
                <span>{title}</span>
                <span className="text-[var(--text-muted)] font-normal">({blocks.length})</span>
              </h3>
            )}
            {subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="p-4">
          <EmptyState
            className="border-[var(--status-success-border)] bg-[var(--status-success-bg)]/20"
            icon={<ShieldCheck className="w-8 h-8 text-[var(--status-success)]" />}
            title="All Tracks Available — No Active Blocks"
            description={emptyMessage}
            advisoryNote="Divisional line-clear maintained · Single Source of Truth verified across central planning"
          />
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
                          <div className="flex flex-wrap items-center gap-1">
                            {getBlockTypeBadge(b.block_type)}
                            {getPriorityBadge(b.task_priority)}
                          </div>
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
                          {formatDistanceKm(b.location_km)}
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
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setReasoningBlockId(b.id)}
                            leftIcon={<Sparkles className="w-3 h-3 text-indigo-500" />}
                            className="text-[11px] h-7 px-2"
                            title="View AI Decision Rationale & Impact Analysis"
                          >
                            <span>Reasoning</span>
                          </Button>

                          <button
                            type="button"
                            onClick={() => toggleExpand(b.id)}
                            className="p-1.5 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--text-secondary)] text-xs cursor-pointer transition-colors border border-[var(--border-subtle)]"
                            title="Toggle expanded details"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {showActions && (
                            <>
                              {b.status === "PROPOSED" && onSubmit && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => onSubmit(b.id)}
                                  isLoading={actioningBlockId === b.id}
                                  leftIcon={<Send className="w-2.5 h-2.5" />}
                                  className="text-[10px] h-7 px-2"
                                >
                                  <span>Submit</span>
                                </Button>
                              )}

                              {b.status === "PENDING_APPROVAL" && (
                                <>
                                  {onReject && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => onReject(b.id)}
                                      disabled={actioningBlockId === b.id}
                                      className="text-[10px] h-7 px-2"
                                    >
                                      Reject
                                    </Button>
                                  )}
                                  {onApprove && (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => onApprove(b.id)}
                                      isLoading={actioningBlockId === b.id}
                                      className="text-[10px] h-7 px-2"
                                    >
                                      Approve
                                    </Button>
                                  )}
                                </>
                              )}

                              {b.status === "APPROVED" && (
                                <>
                                  {onReplan && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => onReplan(b.id)}
                                      disabled={actioningBlockId === b.id}
                                      className="text-[10px] h-7 px-2"
                                    >
                                      Re-plan
                                    </Button>
                                  )}
                                  {onSelect && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => onSelect(b.id)}
                                      isLoading={actioningBlockId === b.id}
                                      className="text-[10px] h-7 px-2"
                                    >
                                      Select Plan
                                    </Button>
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
                              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Participating Departments & Origin</span>
                              <div className="mt-1 font-bold text-slate-800">{b.participating_departments || b.department_id || "P.Way"}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Origin: <strong>{b.planning_origin || "DIVISIONAL_PLAN"}</strong>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Execution Date: <strong>{b.execution_date || b.date || "2026-09-25"}</strong>
                              </div>
                            </div>

                            <div className="p-2.5 bg-white rounded border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Approval Audit Trail</span>
                              <div className="mt-1 font-medium text-slate-800">
                                {b.approval_notes && !b.approval_notes.trim().startsWith("{")
                                  ? b.approval_notes
                                  : "Sanction pending review."}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Proposed by: {b.proposed_by} • Created: {b.created_at ? new Date(b.created_at).toLocaleTimeString() : "—"}
                              </div>
                            </div>
                          </div>

                          {/* Underlying Relational Tasks & Defects */}
                          {b.tasks && b.tasks.length > 0 && (
                            <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-slate-600 font-mono">
                                  Underlying Relational Tasks & Defects ({b.tasks.length})
                                </span>
                                {b.block_type === "SHADOW" && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded font-bold">
                                    Opportunistic Multi-Department Synergy
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {b.tasks.map((t: any, idx: number) => (
                                  <div key={t.id || idx} className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
                                    <div className="flex items-center justify-between font-mono">
                                      <span className="font-bold text-slate-800">{t.id}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                        {t.department_id}
                                      </span>
                                    </div>
                                    <p className="font-medium text-slate-900 line-clamp-1">{t.title}</p>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                      <span>Priority: {t.priority}</span>
                                      <span>{t.duration_hours || 2}h</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
