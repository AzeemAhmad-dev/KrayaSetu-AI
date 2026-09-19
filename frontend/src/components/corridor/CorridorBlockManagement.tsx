import React, { useState, useEffect } from "react";
import {
  CalendarRange,
  Calendar,
  AlertTriangle,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Tag,
  Info,
  Layers,
  Wrench,
  Edit2,
  Trash2,
  ArrowRight,
  RotateCcw,
  Flame
} from "lucide-react";
import { DetailedCorridor } from "../../data/corridorsData";
import { CorridorBlock, CorridorBlockType, CorridorBlockStatus, CorridorIssue, BlockData } from "../../types";
import { api } from "../../services/api";
import { RoleBlockTable } from "../blocks/RoleBlockTable";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface CorridorBlockManagementProps {
  corridor: DetailedCorridor;
}

const STATUS_CONFIG: Record<
  CorridorBlockStatus,
  { label: string; badgeClass: string }
> = {
  PLANNED: { label: "Planned", badgeClass: "bg-slate-100 text-slate-800 border-slate-300" },
  APPROVED: { label: "Approved", badgeClass: "bg-sky-100 text-sky-900 border-sky-300" },
  IN_PROGRESS: { label: "In Progress", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" },
  COMPLETED: { label: "Completed", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  RESCHEDULED: { label: "Rescheduled", badgeClass: "bg-purple-100 text-purple-900 border-purple-300" },
  CANCELLED: { label: "Cancelled", badgeClass: "bg-rose-100 text-rose-900 border-rose-300" },
  REJECTED: { label: "Rejected", badgeClass: "bg-red-100 text-red-900 border-red-300" },
};

export const CorridorBlockManagement: React.FC<CorridorBlockManagementProps> = ({ corridor }) => {
  const { user } = useAuth();

  // Sub-section tab inside Block Management
  const [activeSection, setActiveSection] = useState<"monthly" | "weekly" | "critical" | "issues">("monthly");

  // Real backend blocks for this corridor from SQLite database
  const [backendBlocks, setBackendBlocks] = useState<BlockData[]>([]);
  const [loadingBackendBlocks, setLoadingBackendBlocks] = useState(false);
  const [submittingBlock, setSubmittingBlock] = useState(false);
  const [blockServerError, setBlockServerError] = useState<string | null>(null);
  const [blockServerSuccess, setBlockServerSuccess] = useState<string | null>(null);

  const loadBackendBlocks = async () => {
    setLoadingBackendBlocks(true);
    setBlockServerError(null);
    try {
      const data = await api.getBlocks(undefined, corridor.id);
      setBackendBlocks(data || []);
    } catch (e: any) {
      console.warn("Could not load backend blocks for corridor", corridor.id, e);
      setBlockServerError(e?.message || "Failed to load corridor blocks from database.");
    } finally {
      setLoadingBackendBlocks(false);
    }
  };

  useEffect(() => {
    loadBackendBlocks();
  }, [corridor.id]);

  // Issues state
  const issuesStorageKey = `krayasetu_corridor_issues_${corridor.id.toLowerCase()}`;
  const [issues, setIssues] = useState<CorridorIssue[]>(() => {
    try {
      const saved = localStorage.getItem(issuesStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load corridor issues", e);
    }
    return [];
  });

  // Reload issues when corridor changes
  useEffect(() => {
    try {
      const savedIssues = localStorage.getItem(issuesStorageKey);
      setIssues(savedIssues ? JSON.parse(savedIssues) : []);
    } catch (e) {
      console.warn("Could not reload corridor issues", e);
    }
  }, [issuesStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(issuesStorageKey, JSON.stringify(issues));
    } catch (e) {
      console.warn("Could not save corridor issues", e);
    }
  }, [issues, issuesStorageKey]);

  // Modal States
  const [isNewBlockModalOpen, setIsNewBlockModalOpen] = useState(false);
  const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<CorridorBlock | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<CorridorBlock | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<CorridorIssue | null>(null);

  // Form State: Block
  const [blockType, setBlockType] = useState<CorridorBlockType>("MONTHLY");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockSection, setBlockSection] = useState("");
  const [customSection, setCustomSection] = useState("");
  const [blockLine, setBlockLine] = useState("Up Main");
  const [blockDepartment, setBlockDepartment] = useState<"PWAY" | "SNT" | "TRD" | "JOINT">("PWAY");
  const [blockDate, setBlockDate] = useState("");
  const [blockWindow, setBlockWindow] = useState("");
  const [blockDuration, setBlockDuration] = useState<number>(120);
  const [blockDescription, setBlockDescription] = useState("");
  const [blockFormError, setBlockFormError] = useState<string | null>(null);

  // Form State: Issue
  const [issueTitle, setIssueTitle] = useState("");
  const [issueLocation, setIssueLocation] = useState("");
  const [customIssueLoc, setCustomIssueLoc] = useState("");
  const [issueDepartment, setIssueDepartment] = useState<"PWAY" | "SNT" | "TRD" | "JOINT">("PWAY");
  const [issueSeverity, setIssueSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [issueRequiresBlock, setIssueRequiresBlock] = useState(true);
  const [issueBlockType, setIssueBlockType] = useState<CorridorBlockType>("WEEKLY");
  const [issueDuration, setIssueDuration] = useState<number>(90);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueFormError, setIssueFormError] = useState<string | null>(null);

  // Location options from current corridor
  const locationOptions = corridor.locations.map((loc) => `${loc.name} (${loc.code})`);

  const parseTimeSlot = (timeWindowStr: string, durationMins: number = 120) => {
    const parts = timeWindowStr.split(/[-–—to]/i).map((s) => s.trim());
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    let start = "01:00";
    let end = "03:00";

    if (parts.length >= 2 && timeRegex.test(parts[0]) && timeRegex.test(parts[1])) {
      start = parts[0].padStart(5, "0");
      end = parts[1].padStart(5, "0");
    } else if (parts.length >= 1 && timeRegex.test(parts[0])) {
      start = parts[0].padStart(5, "0");
      const [h, m] = start.split(":").map(Number);
      const endMinutes = (h * 60 + m + (durationMins || 120)) % (24 * 60);
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");
      end = `${endH}:${endM}`;
    } else {
      const endMinutes = (1 * 60 + (durationMins || 120)) % (24 * 60);
      const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");
      end = `${endH}:${endM}`;
    }
    return { start, end };
  };

  const mapTrackName = (line: string): string => {
    const lower = (line || "").toLowerCase();
    if (lower.includes("up")) return "UP_MAIN";
    if (lower.includes("down")) return "DOWN_MAIN";
    if (lower.includes("3rd") || lower.includes("quad")) return "3RD_LINE";
    if (lower.includes("loop")) return "LOOP_LINE";
    if (lower.includes("yard")) return "YARD_LINE";
    return "DOWN_MAIN";
  };

  const mappedBackendBlocks: CorridorBlock[] = backendBlocks.map((b) => ({
    id: b.id,
    corridorId: b.corridor_id,
    type: (b.task_priority === "CRITICAL" || b.protection_type === "EMERGENCY_PROTECTION"
      ? "CRITICAL"
      : b.duration_mins <= 120
      ? "WEEKLY"
      : "MONTHLY") as CorridorBlockType,
    title: b.task_title || (b.task_id ? `Assigned Block for ${b.task_id}` : `Maintenance Block: ${b.corridor_id} ${b.track_name}`),
    sectionOrStation: b.section_name || b.section_id || corridor.name,
    lineOrTrack: `${b.track_name} (KM ${b.location_km})`,
    department: (b.is_multi_department ? "JOINT" : (b.department_id as any) || "PWAY"),
    scheduledDate: b.date || b.scheduled_date || "2026-03-25",
    timeWindow: `${b.requested_start_time} – ${b.requested_end_time}`,
    durationMinutes: b.duration_mins,
    status: (b.status === "APPROVED" || b.status === "SANCTIONED" || b.status === "SELECTED") ? "APPROVED" : b.status === "REJECTED" ? "REJECTED" : "PLANNED",
    description: b.conflict_summary || (b.is_multi_department ? `Coordinated with ${b.participating_departments}` : "Scheduled maintenance block"),
    isCritical: b.task_priority === "CRITICAL" || b.protection_type === "EMERGENCY_PROTECTION",
    createdBy: b.proposed_by || "Divisional Operations Control",
    createdAt: b.created_at || new Date().toISOString(),
  }));

  const allBlocks = mappedBackendBlocks;

  // Filtered blocks by type
  const monthlyBlocks = allBlocks.filter((b) => (b.type === "MONTHLY" || !b.type) && !b.isCritical);
  const weeklyBlocks = allBlocks.filter((b) => b.type === "WEEKLY" && !b.isCritical);
  const criticalBlocks = allBlocks.filter((b) => b.isCritical || b.type === "CRITICAL");

  // Open New Block Modal helper
  const handleOpenNewBlock = (type: CorridorBlockType, critical: boolean = false) => {
    setBlockType(type);
    setBlockTitle("");
    setBlockSection(locationOptions[0] || "");
    setCustomSection("");
    setBlockLine("Up Main");
    setBlockDepartment("PWAY");
    setBlockDate("");
    setBlockWindow("");
    setBlockDuration(critical ? 60 : type === "MONTHLY" ? 180 : 120);
    setBlockDescription("");
    setBlockFormError(null);
    setIsNewBlockModalOpen(true);
  };

  // Open Edit Block Modal helper
  const handleOpenEditBlock = (blk: CorridorBlock) => {
    setBlockToEdit(blk);
    setBlockType(blk.type);
    setBlockTitle(blk.title);
    setBlockSection(blk.sectionOrStation);
    setCustomSection("");
    setBlockLine(blk.lineOrTrack);
    setBlockDepartment(blk.department);
    setBlockDate(blk.scheduledDate);
    setBlockWindow(blk.timeWindow || "");
    setBlockDuration(blk.durationMinutes);
    setBlockDescription(blk.description);
    setBlockFormError(null);
    setIsEditBlockModalOpen(true);
  };

  // Create Block submit - Persists directly to SQLite database via api.proposeBlock()
  const handleCreateBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockFormError(null);
    setBlockServerError(null);
    setBlockServerSuccess(null);

    if (!blockTitle.trim()) {
      setBlockFormError("Please enter a block title or work scope.");
      return;
    }

    const sec = customSection.trim() || blockSection || corridor.name;
    if (!sec) {
      setBlockFormError("Please select or specify a corridor section or station.");
      return;
    }

    setSubmittingBlock(true);

    try {
      const { start: startTime, end: endTime } = parseTimeSlot(blockWindow, blockDuration);
      const trackName = mapTrackName(blockLine);
      const protectionType =
        blockType === "CRITICAL"
          ? "EMERGENCY_PROTECTION"
          : blockDepartment === "TRD"
          ? "POWER_BLOCK"
          : blockDepartment === "JOINT"
          ? "TRAFFIC_AND_POWER_ISOLATION"
          : "TRAFFIC_BLOCK";

      const powerIsolationRequired = blockDepartment === "TRD" || blockDepartment === "JOINT";
      const kmMatch = (customSection || sec).match(/(\d+(\.\d+)?)/);
      const locationKm = kmMatch ? parseFloat(kmMatch[1]) : 25.0;

      const proposalPayload = {
        corridor_id: corridor.id,
        section_id: sec,
        track_name: trackName,
        location_km: locationKm,
        requested_start_time: startTime,
        requested_end_time: endTime,
        duration_mins: Number(blockDuration) || 120,
        protection_type: protectionType,
        power_isolation_required: powerIsolationRequired,
        proposed_by: user?.username ? `${user.username} (${corridor.name} Controller)` : "Corridor Operations Master",
        departments: blockDepartment === "JOINT" ? ["PWAY", "SNT", "TRD"] : [blockDepartment],
      };

      const res = await api.proposeBlock(proposalPayload);

      // Refresh corridor block list from api.getBlocks() upon successful submission
      await loadBackendBlocks();

      setBlockServerSuccess(
        `Block proposal ${res?.block_id || ""} successfully created and persisted to database. Conflict status: ${res?.conflict_status || "EVALUATED"}.`
      );
      setIsNewBlockModalOpen(false);

      // Reset form
      setBlockTitle("");
      setCustomSection("");
      setBlockWindow("");
      setBlockDescription("");
    } catch (err: any) {
      console.error("Failed to propose block to database:", err);
      const msg = err?.message || "Failed to submit block proposal to database.";
      setBlockFormError(msg);
      setBlockServerError(msg);
    } finally {
      setSubmittingBlock(false);
    }
  };

  // Update Block submit
  const handleUpdateBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockToEdit) return;

    const sec = customSection.trim() || blockSection || blockToEdit.sectionOrStation;

    setBackendBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockToEdit.id) {
          const { start, end } = parseTimeSlot(blockWindow, blockDuration);
          return {
            ...b,
            task_title: blockTitle.trim() || b.task_title,
            section_id: sec,
            section_name: sec,
            track_name: mapTrackName(blockLine),
            department_id: blockDepartment,
            date: blockDate || b.date,
            requested_start_time: start,
            requested_end_time: end,
            duration_mins: blockDuration,
            task_priority: blockType === "CRITICAL" ? "CRITICAL" : b.task_priority,
            protection_type: blockType === "CRITICAL" ? "EMERGENCY_PROTECTION" : b.protection_type,
          };
        }
        return b;
      })
    );

    setIsEditBlockModalOpen(false);
    setBlockToEdit(null);
  };

  // Quick status update
  const handleUpdateStatus = async (blockId: string, newStatus: CorridorBlockStatus) => {
    try {
      if (newStatus === "APPROVED") {
        await api.approveBlockDirect(blockId);
      } else if (newStatus === "REJECTED") {
        await api.rejectBlockDirect(blockId);
      }
      await loadBackendBlocks();
    } catch (err: any) {
      console.warn("Backend status update failed, updating local state:", err);
      setBackendBlocks((prev) =>
        prev.map((b) => {
          if (b.id === blockId) {
            return {
              ...b,
              status: (newStatus === "IN_PROGRESS"
                ? "ACTIVE"
                : newStatus === "CANCELLED"
                ? "REJECTED"
                : newStatus) as any,
            };
          }
          return b;
        })
      );
    }

    if (selectedBlock && selectedBlock.id === blockId) {
      setSelectedBlock((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Delete Block
  const handleDeleteBlock = (blockId: string) => {
    if (window.confirm(`Are you sure you want to remove block ${blockId}?`)) {
      setBackendBlocks((prev) => prev.filter((b) => b.id !== blockId));
      if (selectedBlock?.id === blockId) setSelectedBlock(null);
    }
  };

  // Create Issue submit
  const handleCreateIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueFormError(null);

    if (!issueTitle.trim()) {
      setIssueFormError("Please enter an issue title / defect summary.");
      return;
    }

    const loc = customIssueLoc.trim() || issueLocation || corridor.name;

    const newIssueId = `ISS-${corridor.id}-${Date.now().toString().slice(-5)}`;
    let generatedBlockId: string | undefined = undefined;

    // If block is required, create the corresponding block via backend API
    if (issueRequiresBlock) {
      try {
        const protectionType =
          issueBlockType === "CRITICAL"
            ? "EMERGENCY_PROTECTION"
            : issueDepartment === "TRD"
            ? "POWER_BLOCK"
            : issueDepartment === "JOINT"
            ? "TRAFFIC_AND_POWER_ISOLATION"
            : "TRAFFIC_BLOCK";

        const res = await api.proposeBlock({
          corridor_id: corridor.id,
          section_id: loc,
          track_name: "DOWN_MAIN",
          location_km: 25.0,
          requested_start_time: "02:00",
          requested_end_time: "03:30",
          duration_mins: Number(issueDuration) || 90,
          protection_type: protectionType,
          power_isolation_required: issueDepartment === "TRD" || issueDepartment === "JOINT",
          proposed_by: user?.username ? `${user.username} (Issue Requisition)` : "Corridor Issue Master",
          departments: issueDepartment === "JOINT" ? ["PWAY", "SNT", "TRD"] : [issueDepartment],
        });
        generatedBlockId = res?.block_id;
        await loadBackendBlocks();
      } catch (err: any) {
        console.warn("Could not automatically propose block for issue:", err);
      }
    }

    const newIssue: CorridorIssue = {
      id: newIssueId,
      corridorId: corridor.id,
      title: issueTitle.trim(),
      sectionOrLocation: loc,
      department: issueDepartment,
      severity: issueSeverity,
      blockRequired: issueRequiresBlock,
      blockTypeRequired: issueRequiresBlock ? issueBlockType : undefined,
      requestedDurationMinutes: issueRequiresBlock ? issueDuration : undefined,
      description: issueDescription.trim(),
      status: issueRequiresBlock ? "BLOCK_SCHEDULED" : "OPEN",
      associatedBlockId: generatedBlockId,
      loggedBy: user?.username || "CORRIDOR-MASTER",
      createdAt: new Date().toISOString(),
    };

    setIssues((prev) => [newIssue, ...prev]);
    setIsIssueModalOpen(false);

    // Reset form
    setIssueTitle("");
    setCustomIssueLoc("");
    setIssueDescription("");
  };

  const renderBlockCard = (blk: CorridorBlock) => {
    const statusCfg = STATUS_CONFIG[blk.status] || {
      label: blk.status,
      badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    };

    return (
      <div
        key={blk.id}
        onClick={() => setSelectedBlock(blk)}
        className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-500">{blk.id}</span>
              {blk.isCritical && (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[9px] uppercase">
                  Critical
                </span>
              )}
            </div>

            {/* Status Badge */}
            <span className={`px-2 py-0.5 rounded font-bold border ${statusCfg.badgeClass}`}>
              {statusCfg.label}
            </span>
          </div>

          <h4 className="font-bold text-slate-900 text-sm leading-snug">{blk.title}</h4>

          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{blk.sectionOrStation} · {blk.lineOrTrack}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-1">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">
              {blk.department}
            </span>
            <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded">
              {blk.durationMinutes} Minutes
            </span>
          </div>
        </div>

        {/* Bottom bar with action buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{blk.scheduledDate}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditBlock(blk);
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
              title="Edit Block"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBlock(blk.id);
              }}
              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
              title="Remove Block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-0.5 font-bold text-[#0b2545] pl-1">
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 font-sans">
      {/* ============================================================== */}
      {/* 1. CORRIDOR CONTEXT COMMAND HEADER                             */}
      {/* ============================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-bold tracking-wider text-sky-800 uppercase">
                CORRIDOR MASTER · BLOCK MANAGEMENT
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Bhopal Division · Indian Railways
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <span className="px-3 py-1 rounded-lg text-sm font-mono font-black bg-[#0b2545] text-white shadow-xs">
                {corridor.id}
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 font-sans">
                {corridor.name.toUpperCase()}
              </h1>
              <span className="text-sm sm:text-base font-semibold text-slate-500 font-sans">
                ({corridor.origin} ⇄ {corridor.destination} · {corridor.total_distance_km} KM)
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Refresh from SQLite Button */}
            <button
              type="button"
              onClick={loadBackendBlocks}
              disabled={loadingBackendBlocks}
              title="Refresh blocks from database"
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBackendBlocks ? "animate-spin text-sky-600" : ""}`} />
            </button>

            {/* New Block Button */}
            <button
              type="button"
              onClick={() => handleOpenNewBlock("MONTHLY")}
              className="px-3.5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Block</span>
            </button>

            {/* Critical Block Button */}
            <button
              type="button"
              onClick={() => handleOpenNewBlock("CRITICAL", true)}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Critical Block</span>
            </button>

            {/* Issue / Request Button */}
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Raise Issue</span>
            </button>
          </div>
        </div>

        {/* Telemetry strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-700">
            <div>
              Scope: <strong>{corridor.id} Isolated</strong>
            </div>
            <div>
              Monthly Blocks: <strong className="text-slate-900 font-bold">{monthlyBlocks.length}</strong>
            </div>
            <div>
              Weekly Blocks: <strong className="text-slate-900 font-bold">{weeklyBlocks.length}</strong>
            </div>
            <div>
              Critical Blocks: <strong className="text-rose-700 font-bold">{criticalBlocks.length}</strong>
            </div>
            <div>
              Issues Logged: <strong className="text-amber-700 font-bold">{issues.length}</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              MANAGEMENT CONTROL: ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Inline Feedback / Server Banners */}
      {blockServerError && (
        <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs font-mono flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{blockServerError}</span>
          </div>
          <button
            type="button"
            onClick={() => setBlockServerError(null)}
            className="text-red-700 hover:text-red-900 text-xs px-2 py-0.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {blockServerSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-mono flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{blockServerSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setBlockServerSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs px-2 py-0.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SUB-NAVIGATION TABS                                         */}
      {/* ============================================================== */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {/* Monthly Blocks */}
          <button
            type="button"
            onClick={() => setActiveSection("monthly")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "monthly"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Monthly Blocks</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
              activeSection === "monthly" ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
            }`}>
              {monthlyBlocks.length}
            </span>
          </button>

          {/* Weekly Blocks */}
          <button
            type="button"
            onClick={() => setActiveSection("weekly")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "weekly"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Weekly Blocks</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
              activeSection === "weekly" ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
            }`}>
              {weeklyBlocks.length}
            </span>
          </button>

          {/* Critical Blocks */}
          <button
            type="button"
            onClick={() => setActiveSection("critical")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "critical"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <Flame className={`w-4 h-4 ${activeSection === "critical" ? "text-white" : "text-rose-600"}`} />
            <span>Critical Blocks</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
              activeSection === "critical" ? "bg-white/20 text-white" : "bg-white text-rose-700 border border-rose-200"
            }`}>
              {criticalBlocks.length}
            </span>
          </button>

          {/* Issue Log / Requests */}
          <button
            type="button"
            onClick={() => setActiveSection("issues")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSection === "issues"
                ? "bg-amber-700 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeSection === "issues" ? "text-white" : "text-amber-600"}`} />
            <span>Issue Log</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
              activeSection === "issues" ? "bg-white/20 text-white" : "bg-white text-amber-800 border border-amber-200"
            }`}>
              {issues.length}
            </span>
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 hidden sm:block pr-2">
          Managing {corridor.id} ({corridor.name})
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SECTION 1: MONTHLY BLOCKS                                   */}
      {/* ============================================================== */}
      {activeSection === "monthly" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Monthly Possessory Blocks — {corridor.name} ({corridor.id})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage monthly periodic engineering overhauls, bridge inspections, and track possession cycles
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNewBlock("MONTHLY")}
              className="px-3.5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Monthly Block</span>
            </button>
          </div>

          {monthlyBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <CalendarRange className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Monthly Blocks Scheduled
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The monthly block register for <strong>{corridor.name} ({corridor.id})</strong> is currently clean. Use the <strong>"Add Monthly Block"</strong> button above to schedule a possession window.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleOpenNewBlock("MONTHLY")}
                  className="px-4 py-2 bg-slate-100 hover:bg-[#0b2545] hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Monthly Block</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyBlocks.map((blk) => renderBlockCard(blk))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SECTION 2: WEEKLY BLOCKS                                    */}
      {/* ============================================================== */}
      {activeSection === "weekly" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Weekly Maintenance Blocks — {corridor.name} ({corridor.id})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage 7-day maintenance routines, tamping sessions, point machine testing, and gang possessions
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNewBlock("WEEKLY")}
              className="px-3.5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Weekly Block</span>
            </button>
          </div>

          {weeklyBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Weekly Blocks Scheduled
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The weekly block schedule for <strong>{corridor.name} ({corridor.id})</strong> is currently clean. Click <strong>"Add Weekly Block"</strong> above to plan a new departmental possession.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleOpenNewBlock("WEEKLY")}
                  className="px-4 py-2 bg-slate-100 hover:bg-[#0b2545] hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Weekly Block</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyBlocks.map((blk) => renderBlockCard(blk))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SECTION 3: CRITICAL BLOCKS                                  */}
      {/* ============================================================== */}
      {activeSection === "critical" && (
        <div className="space-y-4">
          <div className="bg-rose-50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-rose-950">
                  Critical & Emergency Blocks — {corridor.name} ({corridor.id})
                </h3>
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Urgent safety-critical possessions, track fracture rectifications, and emergency OHE de-energization
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenNewBlock("CRITICAL", true)}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Flame className="w-4 h-4" />
              <span>Create Critical Block</span>
            </button>
          </div>

          {criticalBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-3">
                <Flame className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Critical Blocks Active
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                There are currently no emergency or critical possessions active on <strong>{corridor.name} ({corridor.id})</strong>. If an urgent defect requires immediate possession, use the <strong>"Create Critical Block"</strong> button above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalBlocks.map((blk) => renderBlockCard(blk))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SECTION 4: ISSUE LOG & BLOCK REQUISITIONS                    */}
      {/* ============================================================== */}
      {activeSection === "issues" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Corridor Issue Log & Block Requisitions — {corridor.name} ({corridor.id})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Raise infrastructure problems, USFD flaws, or signaling faults, and link them to required block possessions
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsIssueModalOpen(true)}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Raise New Issue</span>
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Issues Logged
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The issue register for <strong>{corridor.name} ({corridor.id})</strong> is clean. Use the <strong>"Raise New Issue"</strong> button above to record an infrastructure problem and request possession.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-[#0b2545] hover:text-white text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Raise First Corridor Issue</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {issues.map((iss) => (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssue(iss)}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-400 p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                      <span className="font-bold text-slate-500">{iss.id}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded font-bold border ${
                          iss.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-900 border-rose-300"
                            : iss.severity === "HIGH"
                            ? "bg-orange-100 text-orange-900 border-orange-300"
                            : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}>
                          {iss.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          {iss.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{iss.title}</h4>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{iss.sectionOrLocation}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">
                        {iss.department}
                      </span>
                      {iss.blockRequired && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded">
                          Block Required ({iss.requestedDurationMinutes}m)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{new Date(iss.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1 font-bold text-[#0b2545]">
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ============================================================== */}
      {/* MODAL: CREATE NEW BLOCK (WEEKLY / MONTHLY / CRITICAL)          */}
      {/* ============================================================== */}
      {isNewBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {blockType === "CRITICAL" ? (
                  <Flame className="w-5 h-5 text-rose-600" />
                ) : (
                  <Plus className="w-5 h-5 text-[#0b2545]" />
                )}
                <h3 className="font-bold text-slate-900 text-base">
                  {blockType === "CRITICAL" ? "New Critical Block" : "New Possession Block"} — {corridor.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBlockSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {blockFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{blockFormError}</span>
                </div>
              )}

              {/* Block Type Selection */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Block Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockType("MONTHLY")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                      blockType === "MONTHLY"
                        ? "bg-[#0b2545] text-white border-[#0b2545]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Monthly Block
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockType("WEEKLY")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                      blockType === "WEEKLY"
                        ? "bg-[#0b2545] text-white border-[#0b2545]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Weekly Block
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockType("CRITICAL")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                      blockType === "CRITICAL"
                        ? "bg-rose-700 text-white border-rose-700"
                        : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    Critical Block
                  </button>
                </div>
              </div>

              {/* Block Title */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Block Title / Maintenance Scope *
                </label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="e.g. Ultrasonic rail flaw testing / Tamping machine possession"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              {/* Location & Track */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Station / Section *
                  </label>
                  <select
                    value={blockSection}
                    onChange={(e) => setBlockSection(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    {locationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Or Specific KM / Line
                  </label>
                  <input
                    type="text"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    placeholder="e.g. KM 142/8 to 148/2 Up Main"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  />
                </div>
              </div>

              {/* Track Line & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Track / Line Under Block
                  </label>
                  <select
                    value={blockLine}
                    onChange={(e) => setBlockLine(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    <option value="Up Main">Up Main</option>
                    <option value="Down Main">Down Main</option>
                    <option value="3rd Line">3rd Line / Quad Track</option>
                    <option value="Goods Loop 1">Goods Loop 1</option>
                    <option value="Common Loop">Common Loop</option>
                    <option value="Entire Yard">Entire Yard Interlocking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Department Responsible
                  </label>
                  <select
                    value={blockDepartment}
                    onChange={(e) => setBlockDepartment(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    <option value="PWAY">Track / Permanent Way (P.Way)</option>
                    <option value="SNT">Signal & Telecom (S&T)</option>
                    <option value="TRD">Traction / OHE (TRD)</option>
                    <option value="JOINT">Joint Multi-Department</option>
                  </select>
                </div>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    step={15}
                    min={15}
                    max={600}
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(parseInt(e.target.value) || 60)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Time Window
                  </label>
                  <input
                    type="text"
                    value={blockWindow}
                    onChange={(e) => setBlockWindow(e.target.value)}
                    placeholder="01:30 - 04:00"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Scope of Work & Possession Details
                </label>
                <textarea
                  rows={3}
                  value={blockDescription}
                  onChange={(e) => setBlockDescription(e.target.value)}
                  placeholder="Detail the machinery required, gang deployed, speed restrictions to apply, or power de-energization requirements..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={submittingBlock}
                  onClick={() => setIsNewBlockModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlock}
                  className="px-5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingBlock && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submittingBlock ? "Proposing Block..." : "Create Block"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT / UPDATE BLOCK                                     */}
      {/* ============================================================== */}
      {isEditBlockModalOpen && blockToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Block {blockToEdit.id} — {corridor.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBlockSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Block Title / Maintenance Scope
                </label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    step={15}
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(parseInt(e.target.value) || 60)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Scope of Work & Notes
                </label>
                <textarea
                  rows={3}
                  value={blockDescription}
                  onChange={(e) => setBlockDescription(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditBlockModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RAISE CORRIDOR ISSUE                                    */}
      {/* ============================================================== */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Raise Corridor Issue & Block Requisition — {corridor.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIssueSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {issueFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{issueFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Issue Summary / Defect Title *
                </label>
                <input
                  type="text"
                  required
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g. Catenary sag detected between KM 842-844"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Section / Station Location *
                  </label>
                  <select
                    value={issueLocation}
                    onChange={(e) => setIssueLocation(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    {locationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Or Specific KM / Pole
                  </label>
                  <input
                    type="text"
                    value={customIssueLoc}
                    onChange={(e) => setCustomIssueLoc(e.target.value)}
                    placeholder="e.g. Mast 842/14 Down Line"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Department Concerned
                  </label>
                  <select
                    value={issueDepartment}
                    onChange={(e) => setIssueDepartment(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    <option value="PWAY">Track / Permanent Way (P.Way)</option>
                    <option value="SNT">Signal & Telecom (S&T)</option>
                    <option value="TRD">Traction / OHE (TRD)</option>
                    <option value="JOINT">Joint Multi-Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                    Severity
                  </label>
                  <select
                    value={issueSeverity}
                    onChange={(e) => setIssueSeverity(e.target.value as any)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                  >
                    <option value="LOW">Low (Routine observation)</option>
                    <option value="MEDIUM">Medium (Requires attention)</option>
                    <option value="HIGH">High (Urgent inspection)</option>
                    <option value="CRITICAL">Critical (Safety hazard)</option>
                  </select>
                </div>
              </div>

              {/* Block Requirement Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-800 uppercase">
                    Requires Block Possession?
                  </span>
                  <input
                    type="checkbox"
                    checked={issueRequiresBlock}
                    onChange={(e) => setIssueRequiresBlock(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0b2545] focus:ring-[#0b2545]"
                  />
                </div>

                {issueRequiresBlock && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold font-mono text-slate-600 uppercase mb-1">
                        Block Type
                      </label>
                      <select
                        value={issueBlockType}
                        onChange={(e) => setIssueBlockType(e.target.value as any)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                      >
                        <option value="WEEKLY">Weekly Maintenance</option>
                        <option value="MONTHLY">Monthly Overhaul</option>
                        <option value="CRITICAL">Critical Emergency</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold font-mono text-slate-600 uppercase mb-1">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        step={15}
                        min={15}
                        value={issueDuration}
                        onChange={(e) => setIssueDuration(parseInt(e.target.value) || 60)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                      >
                      </input>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase mb-1">
                  Issue Description & Technical Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe the physical condition observed and reason for possession..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0b2545] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Issue & Requisition Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: BLOCK DETAILS & STATUS MANAGEMENT                      */}
      {/* ============================================================== */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-200 text-slate-800">
                  {selectedBlock.id}
                </span>
                <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded border ${STATUS_CONFIG[selectedBlock.status]?.badgeClass}`}>
                  {selectedBlock.status}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Block Management</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlock(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Block Title
                </span>
                <h2 className="text-base font-black text-slate-900 mt-1">{selectedBlock.title}</h2>
              </div>

              {/* Status Update Strip */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-600 block">
                  Update Block Status
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(["PLANNED", "APPROVED", "IN_PROGRESS", "COMPLETED", "RESCHEDULED", "CANCELLED"] as CorridorBlockStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedBlock.id, st)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedBlock.status === st
                          ? "bg-[#0b2545] text-white border-[#0b2545]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {STATUS_CONFIG[st].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Section</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedBlock.sectionOrStation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Line</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedBlock.lineOrTrack}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Duration</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedBlock.durationMinutes} Mins</span>
                </div>
              </div>

              {selectedBlock.timeWindow && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Possession Window
                  </span>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-800">
                    {selectedBlock.timeWindow}
                  </div>
                </div>
              )}

              {selectedBlock.description && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Instructions & Scope
                  </span>
                  <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 leading-relaxed">
                    {selectedBlock.description}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 font-mono pt-2 border-t border-slate-100">
                <span>Created by: <strong className="text-slate-800">{selectedBlock.createdBy}</strong></span>
                <span>Date: <strong className="text-slate-800">{new Date(selectedBlock.createdAt).toLocaleDateString()}</strong></span>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBlock(null);
                    handleOpenEditBlock(selectedBlock);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(selectedBlock.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: ISSUE DETAILS                                          */}
      {/* ============================================================== */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-200 text-slate-800">
                  {selectedIssue.id}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                  {selectedIssue.department}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Corridor Issue Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Reported Issue
                </span>
                <h2 className="text-base font-black text-slate-900 mt-1">{selectedIssue.title}</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Location</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedIssue.sectionOrLocation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Severity</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedIssue.severity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Status</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedIssue.status}</span>
                </div>
              </div>

              {selectedIssue.associatedBlockId && (
                <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200 text-sky-900 font-mono text-xs flex items-center justify-between">
                  <span>Linked Block: <strong>{selectedIssue.associatedBlockId}</strong></span>
                  <span className="text-[11px] font-bold">Planned Possession</span>
                </div>
              )}

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Description
                </span>
                <p className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedIssue.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 font-mono pt-2 border-t border-slate-100">
                <span>Logged by: <strong className="text-slate-800">{selectedIssue.loggedBy}</strong></span>
                <span>Date: <strong className="text-slate-800">{new Date(selectedIssue.createdAt).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
