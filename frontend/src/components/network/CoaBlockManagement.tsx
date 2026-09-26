import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../services/api";
import { BlockData } from "../../types";
import { PlannedBlockCard } from "../blocks/PlannedBlockCard";
import { BlockReasoningModal } from "../blocks/BlockReasoningModal";
import {
  RefreshCw,
  Calendar,
  CalendarRange,
  Flame,
  Plus,
  Filter,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Info
} from "lucide-react";
import {
  ACTIVE_CORRIDORS,
  ACTIVE_CORRIDOR_IDS,
  isRuthiyaiMaksiExcluded,
  isDailyBlock,
  isWeeklyBlock,
  isMonthlyBlock,
  CURRENT_SYSTEM_DATE,
} from "../../utils/plannedBlocksHelper";

export type MasterPlanningTab = "daily" | "weekly" | "monthly" | "critical";

export const CoaBlockManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterPlanningTab>("daily");
  const [viewMode, setViewMode] = useState<"card" | "row">("card");

  // Real backend blocks across Bhopal Division from SQLite
  const [backendBlocks, setBackendBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Filters
  const [selectedCorridor, setSelectedCorridor] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Reasoning modal
  const [reasoningBlockId, setReasoningBlockId] = useState<string | null>(null);

  // New Block modal
  const [isNewBlockModalOpen, setIsNewBlockModalOpen] = useState(false);
  const [newCorridorId, setNewCorridorId] = useState<string>("CORR-01");
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newTrack, setNewTrack] = useState("UP_MAIN");
  const [newKm, setNewKm] = useState<number>(25.0);
  const [newDept, setNewDept] = useState<string>("PWAY");
  const [newDate, setNewDate] = useState<string>(CURRENT_SYSTEM_DATE);
  const [newStartTime, setNewStartTime] = useState<string>("02:00");
  const [newEndTime, setNewEndTime] = useState<string>("04:30");
  const [newDuration, setNewDuration] = useState<number>(150);
  const [newPowerCut, setNewPowerCut] = useState(false);
  const [newBlockType, setNewBlockType] = useState<string>("PLANNED");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load canonical backend blocks
  const loadBlocks = async () => {
    setLoading(true);
    setServerError(null);
    try {
      // Query without operational_only to provide full planning visibility into all planned blocks
      const data = await api.getBlocks();
      setBackendBlocks(data || []);
    } catch (err: any) {
      console.error("Could not load planned blocks for Master Control Planning:", err);
      setServerError(err?.message || "Failed to load planned blocks from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  // Filter out non-active corridors (e.g. Ruthiyai-Maksi) and keep only active WCR Bhopal corridors
  const validDivisionBlocks = useMemo(() => {
    return backendBlocks.filter((b) => {
      if (!b.corridor_id) return true;
      if (isRuthiyaiMaksiExcluded(b.corridor_id, b.section_id || b.section_name)) return false;
      return ACTIVE_CORRIDOR_IDS.has(b.corridor_id);
    });
  }, [backendBlocks]);

  // Apply User Interactive Filters
  const filteredBlocks = useMemo(() => {
    return validDivisionBlocks.filter((b) => {
      // Corridor filter
      if (selectedCorridor !== "ALL" && b.corridor_id !== selectedCorridor) {
        return false;
      }
      // Department filter
      if (selectedDept !== "ALL") {
        if (selectedDept === "JOINT") {
          if (!b.is_multi_department && (!b.departments || b.departments.length <= 1)) return false;
        } else {
          const depts = b.departments || [b.department_id || "PWAY"];
          if (!depts.includes(selectedDept)) return false;
        }
      }
      // Status filter
      if (selectedStatus !== "ALL" && b.status !== selectedStatus) {
        return false;
      }
      // Block type filter
      if (selectedType !== "ALL") {
        const bt = (b.block_type || "PLANNED").toUpperCase();
        if (bt !== selectedType) return false;
      }
      return true;
    });
  }, [validDivisionBlocks, selectedCorridor, selectedDept, selectedStatus, selectedType]);

  // Cadence Slices
  const dailyBlocks = useMemo(() => filteredBlocks.filter((b) => isDailyBlock(b)), [filteredBlocks]);
  const weeklyBlocks = useMemo(() => filteredBlocks.filter((b) => isWeeklyBlock(b)), [filteredBlocks]);
  const monthlyBlocks = useMemo(() => filteredBlocks.filter((b) => isMonthlyBlock(b)), [filteredBlocks]);
  const criticalBlocks = useMemo(
    () =>
      filteredBlocks.filter(
        (b) =>
          b.task_priority === "CRITICAL" ||
          b.protection_type === "EMERGENCY_PROTECTION" ||
          b.block_type === "EMERGENT"
      ),
    [filteredBlocks]
  );

  // Active list based on activeTab
  const currentTabBlocks = useMemo(() => {
    switch (activeTab) {
      case "daily":
        return dailyBlocks;
      case "weekly":
        return weeklyBlocks;
      case "monthly":
        return monthlyBlocks;
      case "critical":
        return criticalBlocks;
      default:
        return dailyBlocks;
    }
  }, [activeTab, dailyBlocks, weeklyBlocks, monthlyBlocks, criticalBlocks]);

  // Reset filters helper
  const handleResetFilters = () => {
    setSelectedCorridor("ALL");
    setSelectedDept("ALL");
    setSelectedStatus("ALL");
    setSelectedType("ALL");
  };

  // Submit New Proposed Block
  const handleCreateBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTitle.trim()) {
      setFormError("Please enter a maintenance work title.");
      return;
    }

    setSubmitting(true);
    try {
      await api.proposeBlock({
        corridor_id: newCorridorId,
        section_id: newSection.trim() || `${newCorridorId}-MAIN`,
        track_name: newTrack,
        location_km: Number(newKm) || 25.0,
        requested_start_time: newStartTime,
        requested_end_time: newEndTime,
        duration_mins: Number(newDuration) || 120,
        protection_type: newPowerCut ? "POWER_BLOCK" : "TRAFFIC_BLOCK",
        power_isolation_required: newPowerCut || newDept === "TRD",
        proposed_by: "Chief of Block Operations (COA / Bhopal Master)",
        departments: newDept === "JOINT" ? ["PWAY", "TRD", "SNT"] : [newDept],
        block_type: newBlockType,
      });

      await loadBlocks();
      setIsNewBlockModalOpen(false);
      setNewTitle("");
      setNewSection("");
    } catch (err: any) {
      setFormError(err?.message || "Failed to create block proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 1. MASTER CONTROL PLANNING COMMAND HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-bold tracking-wider text-sky-800 uppercase font-mono">
                CHIEF OF BLOCK OPERATIONS · MASTER CONTROL PLANNING
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Bhopal Division · West Central Railway
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
              DIVISIONAL PLANNED BLOCK REGISTER
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Division-wide planned block visibility across all 5 active Bhopal corridors.
              Review and monitor scheduled Daily, Weekly, and Monthly possessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadBlocks}
              disabled={loading}
              title="Refresh blocks from database"
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setNewBlockType("PLANNED");
                setIsNewBlockModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#0b2545] hover:bg-sky-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Propose Block</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-700">
            <div>
              Active Corridors: <strong className="text-slate-900 font-bold">5 Corridors</strong>
            </div>
            <div>
              Daily (Today): <strong className="text-sky-800 font-bold">{dailyBlocks.length}</strong>
            </div>
            <div>
              Weekly (Week 39): <strong className="text-slate-900 font-bold">{weeklyBlocks.length}</strong>
            </div>
            <div>
              Monthly (Sep 2026): <strong className="text-slate-900 font-bold">{monthlyBlocks.length}</strong>
            </div>
            <div>
              Critical: <strong className="text-rose-700 font-bold">{criticalBlocks.length}</strong>
            </div>
            <div>
              Total In Register: <strong className="text-slate-900 font-bold">{validDivisionBlocks.length}</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              RUTHIYAI–MAKSI: EXCLUDED
            </span>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs font-mono flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            className="text-red-700 hover:text-red-900 text-xs px-2 py-0.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS (DAILY / WEEKLY / MONTHLY / CRITICAL) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {/* Daily Blocks Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "daily"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Blocks</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === "daily"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {dailyBlocks.length}
            </span>
          </button>

          {/* Weekly Blocks Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "weekly"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Weekly Blocks</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === "weekly"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {weeklyBlocks.length}
            </span>
          </button>

          {/* Monthly Blocks Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "monthly"
                ? "bg-[#0b2545] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Monthly Blocks</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === "monthly"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {monthlyBlocks.length}
            </span>
          </button>

          {/* Critical Blocks Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("critical")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "critical"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <Flame className={`w-4 h-4 ${activeTab === "critical" ? "text-white" : "text-rose-600"}`} />
            <span>Critical Blocks</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                activeTab === "critical"
                  ? "bg-white/20 text-white"
                  : "bg-white text-rose-700 border border-rose-200"
              }`}
            >
              {criticalBlocks.length}
            </span>
          </button>
        </div>

        {/* View Mode Toggle: Cards vs Rows */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer ${
              viewMode === "card"
                ? "bg-white text-[#0b2545] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("row")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer ${
              viewMode === "row"
                ? "bg-white text-[#0b2545] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* 3. MULTI-DIMENSION FILTER CONTROLS */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Multi-Corridor Planning Filters</span>
          </div>

          {(selectedCorridor !== "ALL" ||
            selectedDept !== "ALL" ||
            selectedStatus !== "ALL" ||
            selectedType !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-mono font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Corridor Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase font-mono mb-1">
              Corridor
            </label>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-slate-50 focus:bg-white"
            >
              <option value="ALL">All Active Corridors (5)</option>
              {ACTIVE_CORRIDORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}: {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase font-mono mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-slate-50 focus:bg-white"
            >
              <option value="ALL">All Departments</option>
              <option value="PWAY">P.Way (Civil Engineering)</option>
              <option value="TRD">TRD (25kV OHE Electrical)</option>
              <option value="SNT">S&T (Signaling & Telecom)</option>
              <option value="JOINT">Joint Multi-Department</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase font-mono mb-1">
              Lifecycle Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-slate-50 focus:bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PROPOSED">PROPOSED (Unsubmitted Draft)</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL (Divisional Ledger)</option>
              <option value="APPROVED">APPROVED (CMC / SOBO Sanctioned)</option>
              <option value="SELECTED">SELECTED (Operational Master Plan)</option>
              <option value="ACTIVE">ACTIVE (In Execution)</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Block Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase font-mono mb-1">
              Block Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs bg-slate-50 focus:bg-white"
            >
              <option value="ALL">All Block Types</option>
              <option value="RULING">RULING (Long-range periodic possession)</option>
              <option value="EMERGENT">EMERGENT (Safety-critical defect rectification)</option>
              <option value="SHADOW">SHADOW (Coordinated multi-department synergy)</option>
              <option value="PLANNED">PLANNED (Routine Scheduled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. CONTENT DISPLAY (CARDS OR TABLE ROWS) */}
      <div className="space-y-4">
        {/* Banner with Scope Context */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <div>
            Showing <strong>{currentTabBlocks.length}</strong> {activeTab.toUpperCase()} planned blocks
            {selectedCorridor !== "ALL" && ` in ${selectedCorridor}`}
            {selectedDept !== "ALL" && ` · Dept: ${selectedDept}`}
            {selectedStatus !== "ALL" && ` · Status: ${selectedStatus}`}
            {selectedType !== "ALL" && ` · Type: ${selectedType}`}
          </div>
          <div className="text-[11px] text-slate-400">
            Cadence Source: Planned blocks
          </div>
        </div>

        {currentTabBlocks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              No Planned Blocks Found in {activeTab.toUpperCase()} View
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              No blocks match the active cadence tab (<strong>{activeTab.toUpperCase()}</strong>) and filter criteria.
              Clear filters or click <strong>"Propose Block"</strong> to schedule a possession window.
            </p>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTabBlocks.map((blk) => (
              <PlannedBlockCard
                key={blk.id}
                block={blk as any}
                viewMode="card"
                onOpenReasoning={(id) => setReasoningBlockId(id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-3 pl-4">Block ID & Type</th>
                    <th className="p-3">Corridor</th>
                    <th className="p-3">Station / Location & KM</th>
                    <th className="p-3">Department & Task</th>
                    <th className="p-3">Planned Date</th>
                    <th className="p-3">Window & Duration</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 pr-4 text-right">Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTabBlocks.map((blk) => (
                    <PlannedBlockCard
                      key={blk.id}
                      block={blk as any}
                      viewMode="row"
                      onOpenReasoning={(id) => setReasoningBlockId(id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. DECISION SUPPORT & REASONING MODAL */}
      <BlockReasoningModal
        isOpen={!!reasoningBlockId}
        onClose={() => setReasoningBlockId(null)}
        blockId={reasoningBlockId || undefined}
      />

      {/* 6. PROPOSE NEW BLOCK MODAL (PERSISTS CANONICALLY TO DATABASE) */}
      {isNewBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Propose Central Maintenance Block
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Persists block record to Bhopal Division SQLite database
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBlockSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Corridor</label>
                  <select
                    value={newCorridorId}
                    onChange={(e) => setNewCorridorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    {ACTIVE_CORRIDORS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id}: {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Block Type</label>
                  <select
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    <option value="PLANNED">PLANNED (Routine)</option>
                    <option value="WEEKLY">WEEKLY (7-Day Cycle)</option>
                    <option value="MONTHLY">MONTHLY (Periodic Overhaul)</option>
                    <option value="EMERGENT">EMERGENT (Safety Critical)</option>
                    <option value="RULING">RULING (Long Possessory)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Maintenance Title / Scope of Work *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Screening of Track, Point Machine Overhaul, OHE Tensioning"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    <option value="PWAY">P.Way (Civil Engineering)</option>
                    <option value="TRD">TRD (25kV OHE Electrical)</option>
                    <option value="SNT">S&T (Signaling & Telecom)</option>
                    <option value="JOINT">Joint Multi-Department</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Track Name</label>
                  <select
                    value={newTrack}
                    onChange={(e) => setNewTrack(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  >
                    <option value="UP_MAIN">UP Main Line</option>
                    <option value="DOWN_MAIN">DOWN Main Line</option>
                    <option value="3RD_LINE">3rd Line / Quad Track</option>
                    <option value="LOOP_LINE">Loop Line</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Section / Station</label>
                  <input
                    type="text"
                    placeholder="e.g. Hoshangabad – Budni"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location KM</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={newKm}
                    onChange={(e) => setNewKm(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Planned Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="masterPowerCut"
                  checked={newPowerCut}
                  onChange={(e) => setNewPowerCut(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0b2545]"
                />
                <label htmlFor="masterPowerCut" className="text-xs text-slate-700 font-medium">
                  Requires 25 kV AC OHE traction power isolation (Power Block)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewBlockModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0b2545] hover:bg-sky-900 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Persisting..." : "Propose Block"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
