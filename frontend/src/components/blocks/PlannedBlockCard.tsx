import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Zap,
  ChevronRight,
  Sparkles,
  Layers,
  Flame,
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { formatDistanceKm } from "../../utils/formatDistance";
import { cleanApprovalRemarks } from "../../utils/plannedBlocksHelper";

export interface PlannedBlockCardData {
  id: string;
  block_type?: string;
  corridor_id?: string;
  corridor_name?: string;
  section_id?: string;
  section_name?: string;
  station_codes?: string[];
  track_name?: string;
  location_km?: number;
  department_id?: string;
  departments?: string[];
  is_multi_department?: boolean;
  participating_departments?: string;
  task_title?: string;
  work_type_name?: string;
  scheduled_date?: string;
  execution_date?: string;
  date?: string;
  planning_date?: string;
  requested_start_time?: string;
  requested_end_time?: string;
  duration_mins?: number;
  status: string;
  assigned_machine?: string;
  power_isolation_required?: boolean;
  conflict_summary?: string;
  approval_notes?: string;
  proposed_by?: string;
}

interface PlannedBlockCardProps {
  block: PlannedBlockCardData;
  onSelect?: (block: PlannedBlockCardData) => void;
  onOpenReasoning?: (blockId: string) => void;
  viewMode?: "card" | "row";
}

export const PlannedBlockCard: React.FC<PlannedBlockCardProps> = ({
  block,
  onSelect,
  onOpenReasoning,
  viewMode = "card",
}) => {
  const blockType = (block.block_type || "PLANNED").toUpperCase();
  const plannedDate =
    block.execution_date || block.scheduled_date || block.date || block.planning_date || "2026-09-25";
  const startTime = block.requested_start_time || "00:00";
  const endTime = block.requested_end_time || "04:00";
  const duration = block.duration_mins || 120;
  const kmFormatted = formatDistanceKm(block.location_km);
  const locationLabel =
    block.section_name ||
    block.section_id ||
    (block.station_codes && block.station_codes.length > 0
      ? block.station_codes.join(" ⇄ ")
      : `${block.track_name || "Mainline"} (${kmFormatted})`);
  const corridorLabel = block.corridor_name
    ? `${block.corridor_id}: ${block.corridor_name}`
    : block.corridor_id || "Bhopal Division";
  const departmentLabel = block.participating_departments || block.department_id || "PWAY";
  const taskTitle =
    block.task_title ||
    block.work_type_name ||
    (block.block_type === "EMERGENT"
      ? "Critical Emergency Rectification"
      : block.block_type === "SHADOW"
      ? "Coordinated Multi-Department Block"
      : "Scheduled Track Maintenance");

  const humanRemarks = cleanApprovalRemarks(block.approval_notes);

  // Status Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "SANCTIONED":
        return "bg-sky-100 text-sky-900 border-sky-300";
      case "SELECTED":
      case "ACTIVE":
        return "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "PENDING_APPROVAL":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "PROPOSED":
      case "PLANNED":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "REJECTED":
      case "CANCELLED":
        return "bg-rose-100 text-rose-900 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Block Type Styling
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "EMERGENT":
        return {
          label: "EMERGENT",
          className: "bg-rose-100 text-rose-900 border-rose-300",
          icon: Flame,
        };
      case "SHADOW":
        return {
          label: "SHADOW",
          className: "bg-amber-100 text-amber-900 border-amber-300",
          icon: Layers,
        };
      case "RULING":
        return {
          label: "RULING",
          className: "bg-purple-100 text-purple-900 border-purple-300",
          icon: FileCheck,
        };
      default:
        return {
          label: type || "PLANNED",
          className: "bg-sky-50 text-sky-800 border-sky-200",
          icon: Calendar,
        };
    }
  };

  const typeConfig = getTypeBadge(blockType);
  const TypeIcon = typeConfig.icon;

  if (viewMode === "row") {
    return (
      <tr
        onClick={() => onSelect && onSelect(block)}
        className="hover:bg-slate-50 border-b border-slate-200 transition-colors cursor-pointer text-xs"
      >
        {/* Block ID & Type */}
        <td className="p-3 pl-4">
          <div className="font-mono font-bold text-slate-900">{block.id}</div>
          <div className="flex items-center space-x-1 mt-0.5">
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border inline-flex items-center space-x-1 ${typeConfig.className}`}
            >
              <TypeIcon className="w-2.5 h-2.5" />
              <span>{typeConfig.label}</span>
            </span>
          </div>
        </td>

        {/* Corridor */}
        <td className="p-3 font-medium text-slate-800">
          <div className="font-semibold">{corridorLabel}</div>
        </td>

        {/* Station / Location & Exact KM */}
        <td className="p-3">
          <div className="text-slate-900 font-medium truncate max-w-[200px]" title={locationLabel}>
            {locationLabel}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            Track: {block.track_name || "Mainline"} · <strong>{kmFormatted}</strong>
          </div>
        </td>

        {/* Department / Task */}
        <td className="p-3">
          <div className="font-semibold text-slate-900 truncate max-w-[220px]" title={taskTitle}>
            {taskTitle}
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-600 mt-0.5">
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
              {departmentLabel}
            </span>
            {block.power_isolation_required && (
              <span className="text-amber-700 flex items-center space-x-0.5">
                <Zap className="w-2.5 h-2.5 text-amber-600" />
                <span>25kV Cut</span>
              </span>
            )}
          </div>
        </td>

        {/* Planned Date */}
        <td className="p-3 font-mono font-medium text-slate-800 whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{plannedDate}</span>
          </div>
        </td>

        {/* Time Window & Duration */}
        <td className="p-3 font-mono whitespace-nowrap">
          <div className="font-bold text-slate-900">
            {startTime} – {endTime}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">({duration} mins)</div>
        </td>

        {/* Status */}
        <td className="p-3">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getStatusBadge(
              block.status
            )}`}
          >
            {block.status}
          </span>
        </td>

        {/* Action */}
        <td className="p-3 pr-4 text-right">
          <div className="flex items-center justify-end space-x-1.5">
            {onOpenReasoning && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReasoning(block.id);
                }}
                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                title="View AI Decision Rationale"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </td>
      </tr>
    );
  }

  // Card View
  return (
    <div
      onClick={() => onSelect && onSelect(block)}
      className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-3"
    >
      <div className="space-y-2">
        {/* Top Header: ID, Block Type, Status */}
        <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-600">{block.id}</span>
            <span
              className={`px-2 py-0.5 rounded font-bold border inline-flex items-center space-x-1 ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              <span>{typeConfig.label}</span>
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded font-bold border text-[10px] ${getStatusBadge(block.status)}`}
          >
            {block.status}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-bold text-slate-900 text-sm leading-snug">{taskTitle}</h4>

        {/* Corridor Identification */}
        <div className="text-[11px] font-semibold text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
          {corridorLabel}
        </div>

        {/* Location & Exact KM */}
        <div className="flex items-start space-x-1.5 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-slate-800">{locationLabel}</span>
            <span className="text-slate-500 font-mono text-[11px]">
              {" "}
              · {block.track_name || "Mainline"} (<strong>{kmFormatted}</strong>)
            </span>
          </div>
        </div>

        {/* Department & Machine */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold border border-slate-200">
            {departmentLabel}
          </span>
          {block.assigned_machine && (
            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded border border-sky-200">
              Mach: {block.assigned_machine}
            </span>
          )}
          {block.power_isolation_required && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 flex items-center space-x-1">
              <Zap className="w-2.5 h-2.5 text-amber-600" />
              <span>25kV Power Cut</span>
            </span>
          )}
        </div>

        {/* Clean Human Remarks (only if clean human text exists) */}
        {humanRemarks && !humanRemarks.startsWith("{") && (
          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic">
            Remarks: "{humanRemarks}"
          </div>
        )}
      </div>

      {/* Bottom strip: Date, Time Window, Duration, Manage */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1 font-semibold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{plannedDate}</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              {startTime} – {endTime} ({duration}m)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 font-bold text-[#0b2545]">
          {onOpenReasoning && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReasoning(block.id);
              }}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg mr-1 transition-colors"
              title="Decision Rationale"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          <span>Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
