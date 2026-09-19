import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  CorridorBlock,
  CorridorBlockType,
  CorridorBlockStatus,
  CorridorIssue,
  BlockData
} from "../../types";
import { RoleBlockTable } from "../blocks/RoleBlockTable";
import {
  RefreshCw,
  ShieldAlert,
  Calendar,
  CalendarRange,
  Flame,
  Plus,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RotateCcw,
  Play,
  FileCheck,
  Building2,
  ChevronRight,
  Filter,
  Layers,
  X
} from "lucide-react";

const CORRIDORS_LIST = [
  { id: "CORR-01", name: "Itarsi – Bhopal", code: "ET-BPL" },
  { id: "CORR-02", name: "Bhopal – Bina", code: "BPL-BINA" },
  { id: "CORR-03", name: "Khandwa – Itarsi", code: "KNW-ET" },
  { id: "CORR-04", name: "Bina – Guna", code: "BINA-GUNA" },
  { id: "CORR-05", name: "Guna – Gwalior", code: "GUNA-GWL" },
];

const STATUS_CONFIG: Record<
  CorridorBlockStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PLANNED: {
    label: "PLANNED",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    icon: Clock,
  },
  APPROVED: {
    label: "APPROVED",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
    icon: FileCheck,
  },
  IN_PROGRESS: {
    label: "IN PROGRESS",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    icon: Play,
  },
  COMPLETED: {
    label: "COMPLETED",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "CANCELLED",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
    icon: XCircle,
  },
  REJECTED: {
    label: "REJECTED",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
    icon: XCircle,
  },
  RESCHEDULED: {
    label: "RESCHEDULED",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    icon: RotateCcw,
  },
};

export const CoaBlockManagement: React.FC = () => {
  const [selectedCorridorFilter, setSelectedCorridorFilter] = useState<string>("ALL");
  const [activeSection, setActiveSection] = useState<"monthly" | "weekly" | "critical" | "issues">("monthly");

  const [blocks, setBlocks] = useState<CorridorBlock[]>([]);
  const [issues, setIssues] = useState<CorridorIssue[]>([]);
  // Backend real blocks
  const [backendBlocks, setBackendBlocks] = useState<BlockData[]>([]);
  const [loadingBackendBlocks, setLoadingBackendBlocks] = useState(false);

  const loadBackendBlocks = async () => {
    setLoadingBackendBlocks(true);
    try {
      const data = await api.getBlocks();
      setBackendBlocks(data);
    } catch (e) {
      console.warn("Could not load backend blocks for COA", e);
    } finally {
      setLoadingBackendBlocks(false);
    }
  };

  useEffect(() => {
    loadBackendBlocks();
  }, []);


  // Modal states
  const [isNewBlockModalOpen, setIsNewBlockModalOpen] = useState(false);
  const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<CorridorBlock | null>(null);

  // Form states for block creation
  const [blockCorridorId, setBlockCorridorId] = useState("CORR-01");
  const [blockType, setBlockType] = useState<CorridorBlockType>("MONTHLY");
  const [isCritical, setIsCritical] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<"PWAY" | "SNT" | "TRD" | "JOINT">("PWAY");
  const [sectionOrStation, setSectionOrStation] = useState("");
  const [lineOrTrack, setLineOrTrack] = useState("UP Main Line");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");
  const [durationMinutes, setDurationMinutes] = useState(240);
  const [speedRestrictionKmph, setSpeedRestrictionKmph] = useState<number | undefined>(undefined);
  const [requiresTractionPowerCut, setRequiresTractionPowerCut] = useState(false);
  const [notes, setNotes] = useState("");

  // Load blocks and issues from all corridors in localStorage
  const loadAllData = () => {
    const loadedBlocks: CorridorBlock[] = [];
    const loadedIssues: CorridorIssue[] = [];

    CORRIDORS_LIST.forEach((corr) => {
      const storedBlocks = localStorage.getItem(`krayasetu_corridor_blocks_${corr.id}`);
      if (storedBlocks) {
        try {
          const parsed = JSON.parse(storedBlocks);
          if (Array.isArray(parsed)) {
            loadedBlocks.push(...parsed);
          }
        } catch (e) {
          console.error(`Error loading blocks for ${corr.id}`, e);
        }
      }

      const storedIssues = localStorage.getItem(`krayasetu_corridor_issues_${corr.id}`);
      if (storedIssues) {
        try {
          const parsed = JSON.parse(storedIssues);
          if (Array.isArray(parsed)) {
            loadedIssues.push(...parsed);
          }
        } catch (e) {
          console.error(`Error loading issues for ${corr.id}`, e);
        }
      }
    });

    setBlocks(loadedBlocks);
    setIssues(loadedIssues);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Save block back to its corridor's localStorage
  const saveBlockToStorage = (block: CorridorBlock) => {
    const corrId = block.corridorId || "CORR-01";
    const stored = localStorage.getItem(`krayasetu_corridor_blocks_${corrId}`);
    let list: CorridorBlock[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch (e) {
        list = [];
      }
    }
    const idx = list.findIndex((b) => b.id === block.id);
    if (idx >= 0) {
      list[idx] = block;
    } else {
      list.unshift(block);
    }
    localStorage.setItem(`krayasetu_corridor_blocks_${corrId}`, JSON.stringify(list));
    loadAllData();
  };

  // Remove block from storage/backend
  const removeBlockFromStorage = async (blockId: string, corridorId?: string) => {
    try {
      await api.rejectBlockDirect(blockId, {
        approved_by: "Chief of Block Operations",
        notes: "Removed/Deleted from COA Block Management Panel",
      });
      await loadBackendBlocks();
      if (selectedBlock?.id === blockId) {
        setSelectedBlock(null);
      }
    } catch (err) {
      console.error("Failed to remove block:", err);
      alert("Failed to remove block. See console for details.");
    }
  };

  // Status updates
  const handleUpdateStatus = async (blockId: string, newStatus: CorridorBlockStatus) => {
    try {
      if (newStatus === "APPROVED") {
        await api.approveBlockDirect(blockId, {
          approved_by: "Chief of Block Operations",
          notes: "Approved from COA Block Management Panel",
        });
      } else if (newStatus === "CANCELLED" || newStatus === "REJECTED") {
        await api.rejectBlockDirect(blockId, {
          approved_by: "Chief of Block Operations",
          notes: "Cancelled from COA Block Management Panel",
        });
      }
      await loadBackendBlocks();
    } catch (err) {
      console.error("Failed to update block status:", err);
      alert("Failed to update block status. See console for details.");
    }
  };

  // Create new block handler
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sectionOrStation.trim() || !scheduledDate) {
      alert("Please fill in the block title, location/section, and scheduled date.");
      return;
    }

    try {
      await api.proposeBlock({
        corridor_id: blockCorridorId,
        section_id: sectionOrStation.trim(),
        track_name: lineOrTrack,
        location_km: 0.0,
        requested_start_time: startTime,
        requested_end_time: endTime,
        duration_mins: Number(durationMinutes) || 180,
        protection_type: requiresTractionPowerCut ? "POWER_BLOCK" : "TRAFFIC_BLOCK",
        power_isolation_required: requiresTractionPowerCut,
        proposed_by: "COA-001 (Chief of Block Operations)",
        departments: [department],
      });

      await loadBackendBlocks();
      setIsNewBlockModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create new block:", err);
      alert("Failed to create block. See console for details.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setSectionOrStation("");
    setLineOrTrack("UP Main Line");
    setScheduledDate("");
    setStartTime("10:00");
    setEndTime("14:00");
    setDurationMinutes(240);
    setSpeedRestrictionKmph(undefined);
    setRequiresTractionPowerCut(false);
    setNotes("");
  };

    const filteredBackendBlocks = selectedCorridorFilter === "ALL"
    ? backendBlocks
    : backendBlocks.filter((b) => b.corridor_id === selectedCorridorFilter);

  const mappedBackendBlocks: CorridorBlock[] = filteredBackendBlocks.map((b) => ({
    id: b.id,
    corridorId: b.corridor_id,
    type: "MONTHLY",
    title: b.task_title || (b.task_id ? `Assigned Block for ${b.task_id}` : `Maintenance Block: ${b.corridor_id} ${b.track_name}`),
    sectionOrStation: b.section_name || b.section_id || b.corridor_id,
    lineOrTrack: `${b.track_name} (KM ${b.location_km})`,
    department: (b.is_multi_department ? "JOINT" : (b.department_id as any) || "PWAY"),
    scheduledDate: b.date || "2026-03-15",
    timeWindow: `${b.requested_start_time} – ${b.requested_end_time}`,
    durationMinutes: b.duration_mins,
    status: (b.status === "APPROVED" || b.status === "SELECTED") ? "APPROVED" : "PLANNED",
    description: b.conflict_summary || (b.is_multi_department ? `Coordinated with ${b.participating_departments}` : "Scheduled maintenance block"),
    isCritical: b.task_priority === "CRITICAL",
    createdBy: b.proposed_by || "Divisional Operations Control",
    createdAt: b.created_at || new Date().toISOString(),
  }));

  const visibleBlocks = [
    ...mappedBackendBlocks,
    ...(selectedCorridorFilter === "ALL"
      ? blocks
      : blocks.filter((b) => b.corridorId === selectedCorridorFilter)),
  ];

  const monthlyBlocks = visibleBlocks.filter((b) => (b.type === "MONTHLY" || !b.type) && !b.isCritical);
  const weeklyBlocks = [
    ...visibleBlocks.filter((b) => b.type === "WEEKLY" && !b.isCritical),
    ...mappedBackendBlocks.filter((b) => !b.isCritical),
  ];
  const criticalBlocks = visibleBlocks.filter((b) => b.isCritical || b.type === "CRITICAL");

  const visibleIssues = selectedCorridorFilter === "ALL"
    ? issues
    : issues.filter((i) => i.corridorId === selectedCorridorFilter);

  // Render a single block card
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
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {blk.corridorId}
              </span>
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
              {blk.durationMinutes} Min
            </span>
            {blk.description?.includes("Power Cut") && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold">
                OHE Power Cut
              </span>
            )}
          </div>
        </div>

        {/* Bottom bar with action buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{blk.scheduledDate}</span>
          </div>

          <div className="flex items-center space-x-2">
            {blk.status === "PLANNED" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateStatus(blk.id, "APPROVED");
                }}
                className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold"
                title="Approve Block"
              >
                Approve
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeBlockFromStorage(blk.id, blk.corridorId);
              }}
              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
              title="Remove Block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 1. TOP HEADER & TELEMETRY */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-bold tracking-wider text-sky-800 uppercase font-mono">
                CHIEF OF BLOCK OPERATIONS · DIVISIONAL BLOCK CONTROL
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Bhopal Division (WCR)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
              Divisional Block Supervision & Possession Sanction
            </h2>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBlockType("MONTHLY");
                setIsCritical(false);
                setIsNewBlockModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Block</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBlockType("CRITICAL");
                setIsCritical(true);
                setIsNewBlockModalOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>Critical Block</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-700">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              Scope: <strong>{selectedCorridorFilter === "ALL" ? "All 5 Corridors" : selectedCorridorFilter}</strong>
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
              Issues Logged: <strong className="text-amber-700 font-bold">{visibleIssues.length}</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              BLOCK SANCTION: COA GOVERNANCE
            </span>
          </div>
        </div>
      </div>

      {/* 2. CORRIDOR FILTER BAR */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-[11px] font-bold text-slate-500 uppercase px-2">Corridor Scope:</span>

        <button
          type="button"
          onClick={() => setSelectedCorridorFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            selectedCorridorFilter === "ALL"
              ? "bg-[#0b2545] text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All Corridors ({blocks.length} Blocks)
        </button>

        {CORRIDORS_LIST.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCorridorFilter(c.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedCorridorFilter === c.id
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            {c.id} ({c.code})
          </button>
        ))}
      </div>

      {/* 3. SUB-NAVIGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        {/* Monthly Blocks */}
        <button
          type="button"
          onClick={() => setActiveSection("monthly")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
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
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
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
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
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

        {/* Issue / Block Requests */}
        <button
          type="button"
          onClick={() => setActiveSection("issues")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSection === "issues"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${activeSection === "issues" ? "text-white" : "text-amber-600"}`} />
          <span>Issue / Block Requests</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
            activeSection === "issues" ? "bg-white/20 text-white" : "bg-white text-amber-700 border border-amber-200"
          }`}>
            {visibleIssues.length}
          </span>
        </button>
      </div>

      {/* 4. SECTION PANELS */}
      {/* Monthly Blocks Panel */}
      {activeSection === "monthly" && (
        <div className="space-y-4">
          {/* Real Central Optimizer Blocks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Central Optimizer Maintenance Blocks ({selectedCorridorFilter === "ALL" ? "All Corridors" : selectedCorridorFilter})
                </h4>
                <p className="text-xs text-slate-500">
                  Real multi-department possessory schedule generated by CP-SAT optimizer
                </p>
              </div>
              <button
                type="button"
                onClick={loadBackendBlocks}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-medium flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBackendBlocks ? "animate-spin" : ""}`} />
                <span>Refresh Central Blocks</span>
              </button>
            </div>

            {filteredBackendBlocks.length > 0 ? (
              <RoleBlockTable
                blocks={filteredBackendBlocks}
                title="Divisional Scheduled Maintenance Blocks"
                subtitle={`Displaying ${filteredBackendBlocks.length} planned possessions across ${selectedCorridorFilter === "ALL" ? "all corridors" : selectedCorridorFilter}`}
                showDepartmentColumn={true}
              />
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono">
                No active blocks planned centrally in current schedule. Create new blocks in Block Planner.
              </div>
            )}
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
                The divisional monthly block register is currently clean. Click <strong>"New Block"</strong> above to schedule a periodic possession window.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyBlocks.map(renderBlockCard)}
            </div>
          )}
        </div>
      )}

      {/* Weekly Blocks Panel */}
      {activeSection === "weekly" && (
        <div className="space-y-4">
          {weeklyBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Weekly Blocks Scheduled
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The weekly 7-day maintenance block register is currently clean. Click <strong>"New Block"</strong> above to plan a departmental possession.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyBlocks.map(renderBlockCard)}
            </div>
          )}
        </div>
      )}

      {/* Critical Blocks Panel */}
      {activeSection === "critical" && (
        <div className="space-y-4">
          {criticalBlocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-3">
                <Flame className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Critical / Emergency Blocks
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Zero emergency track fracture rectifications or safety-critical possessions logged. Use <strong>"Critical Block"</strong> above to record urgent possessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalBlocks.map(renderBlockCard)}
            </div>
          )}
        </div>
      )}

      {/* Issue / Block Requests Panel */}
      {activeSection === "issues" && (
        <div className="space-y-4">
          {visibleIssues.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No Issues or Block Requisitions Reported
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                The divisional issue log is clean. Issues reported by corridor controllers and station masters will appear here for review and sanction.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-500">{issue.id}</span>
                      <span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {issue.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{issue.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{issue.description}</p>
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{issue.corridorId}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{issue.sectionOrLocation}</span>
                      <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 rounded font-bold">Block: {issue.blockTypeRequired || (issue.blockRequired ? "REQUIRED" : "NONE")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL: CREATE NEW BLOCK */}
      {isNewBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {blockType === "CRITICAL" || isCritical ? (
                  <Flame className="w-5 h-5 text-rose-600" />
                ) : (
                  <Plus className="w-5 h-5 text-[#0b2545]" />
                )}
                <h3 className="font-bold text-slate-900 text-base">
                  {isCritical ? "New Critical / Emergency Block" : "New Possession Block (COA Sanction)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBlockModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="p-4 sm:p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corridor</label>
                  <select
                    value={blockCorridorId}
                    onChange={(e) => setBlockCorridorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    {CORRIDORS_LIST.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Block Type</label>
                  <select
                    value={blockType}
                    onChange={(e) => {
                      const val = e.target.value as CorridorBlockType;
                      setBlockType(val);
                      if (val === "CRITICAL") setIsCritical(true);
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    <option value="MONTHLY">Monthly Periodic Block</option>
                    <option value="WEEKLY">Weekly Maintenance Block</option>
                    <option value="CRITICAL">Critical / Emergency Block</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Title / Maintenance Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Track renewal, OHE auto-tensioning overhaul, Point machine testing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    <option value="TRACK_PWAY">Track / P.Way</option>
                    <option value="SIGNAL_SNT">Signal & S&T</option>
                    <option value="TRACTION_OHE">Traction / OHE</option>
                    <option value="JOINT">Joint Departmental</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Affected Line / Track</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., UP Main Line, Platform 2 Line, Loop Line 3"
                    value={lineOrTrack}
                    onChange={(e) => setLineOrTrack(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Station or Section Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mandideep – Barkhera KM 54"
                    value={sectionOrStation}
                    onChange={(e) => setSectionOrStation(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Min)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="coaTractionCut"
                  checked={requiresTractionPowerCut}
                  onChange={(e) => setRequiresTractionPowerCut(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0b2545]"
                />
                <label htmlFor="coaTractionCut" className="text-xs text-slate-700 font-medium">
                  Requires 25 kV AC OHE traction power de-energization (Power Block)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewBlockModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b2545] hover:bg-sky-900 text-white rounded-xl font-bold"
                >
                  Sanction & Schedule Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
