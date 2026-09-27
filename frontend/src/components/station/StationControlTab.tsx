import React, { useState, useEffect } from "react";
import {
  CalendarRange,
  Calendar,
  AlertOctagon,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  ChevronRight,
  ShieldCheck,
  Tag,
  Info,
  Layers,
  Wrench
} from "lucide-react";
import { StationInfrastructureData, TrackDefinition } from "../../data/stationInfrastructure";
import { api } from "../../services/api";
import { BlockData, StationBlock, StationIssueBlockRequest } from "../../types";
import { RoleBlockTable } from "../blocks/RoleBlockTable";
import { Tabs, TabsList, TabsTrigger, Button, EmptyState } from "../ui";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../context/AuthContext";
import { formatDistanceKm, formatKmBadge, formatKmValue } from "../../utils/formatDistance";
import { isWeeklyBlock, isMonthlyBlock } from "../../utils/plannedBlocksHelper";

interface StationControlTabProps {
  stationCode: string;
  stationName: string;
  infrastructure: StationInfrastructureData;
}

export const StationControlTab: React.FC<StationControlTabProps> = ({
  stationCode,
  stationName,
  infrastructure,
}) => {
  const { user } = useAuth();

  // Sub-section state inside Block Workspace: Weekly Blocks | Monthly Blocks | Issue / Block Request | Completed Tasks
  const [activeSection, setActiveSection] = useState<"weekly" | "monthly" | "requests" | "completed">("weekly");

  // Storage keys scoped strictly by stationCode to support every Station Master station
  const monthlyStorageKey = `krayasetu_sm_${stationCode.toLowerCase()}_monthly_blocks`;
  const weeklyStorageKey = `krayasetu_sm_${stationCode.toLowerCase()}_weekly_blocks`;

  const queryClient = useQueryClient();
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestServerError, setRequestServerError] = useState<string | null>(null);
  const [requestServerSuccess, setRequestServerSuccess] = useState<string | null>(null);
  const [stationCompletedTasks, setStationCompletedTasks] = useState<any[]>([]);
  const [loadingCompletedTasks, setLoadingCompletedTasks] = useState(false);

  // 1. Monthly Blocks (Strictly EMPTY by default — View Only)
  const [monthlyBlocks, setMonthlyBlocks] = useState<StationBlock[]>(() => {
    try {
      const saved = localStorage.getItem(monthlyStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load monthly blocks", e);
    }
    return [];
  });

  // 2. Weekly Blocks (Strictly EMPTY by default — View Only)
    // Real backend blocks
  const [backendBlocks, setBackendBlocks] = useState<BlockData[]>([]);
  const [loadingBackendBlocks, setLoadingBackendBlocks] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"vicinity" | "all">("vicinity");

  const loadBackendBlocks = async () => {
    setLoadingBackendBlocks(true);
    try {
      const data = await api.getBlocks(undefined, undefined, undefined, undefined, undefined, true);
      setBackendBlocks(data);
    } catch (e) {
      console.warn("Could not load backend blocks for StationControlTab", e);
    } finally {
      setLoadingBackendBlocks(false);
    }
  };

  const loadStationCompletedTasks = async () => {
    setLoadingCompletedTasks(true);
    try {
      const data = await api.getCompletedTasks({ station_code: stationUpper });
      setStationCompletedTasks(data || []);
    } catch (err) {
      console.warn("Could not load station completed tasks", err);
    } finally {
      setLoadingCompletedTasks(false);
    }
  };

  useEffect(() => {
    loadBackendBlocks();
    loadStationCompletedTasks();
  }, [stationCode]);

  const stationUpper = stationCode.toUpperCase();
  const isBlockInVicinity = (b: BlockData) => {
    if (b.station_codes && Array.isArray(b.station_codes) && b.station_codes.includes(stationUpper)) return true;
    if (b.from_station_code === stationUpper || b.to_station_code === stationUpper) return true;
    if (b.section_id && b.section_id.toUpperCase().includes(stationUpper)) return true;
    if (b.track_name && b.track_name.toUpperCase().includes(stationUpper)) return true;
    if (stationUpper === "RKMP" && (b.corridor_id === "CORR-01" || b.corridor_id === "CORR-02")) return true;
    if (stationUpper === "BPL" && (b.corridor_id === "CORR-01" || b.corridor_id === "CORR-02")) return true;
    if (stationUpper === "ET" && (b.corridor_id === "CORR-01" || b.corridor_id === "CORR-03")) return true;
    if (stationUpper === "BINA" && (b.corridor_id === "CORR-02" || b.corridor_id === "CORR-04")) return true;
    if (stationUpper === "KNW" && b.corridor_id === "CORR-03") return true;
    if (stationUpper === "GUNA" && (b.corridor_id === "CORR-04" || b.corridor_id === "CORR-05")) return true;
    if (stationUpper === "GWL" && b.corridor_id === "CORR-05") return true;
    return false;
  };

  const operationalBackendBlocks = backendBlocks.filter((b) =>
    ["APPROVED", "SANCTIONED", "ACTIVE", "SELECTED"].includes(b.status)
  );
  const vicinityBlocks = operationalBackendBlocks.filter(isBlockInVicinity);
  const scopedBlocks = scopeFilter === "vicinity" ? vicinityBlocks : operationalBackendBlocks;

  const [weeklyBlocks, setWeeklyBlocks] = useState<StationBlock[]>(() => {
    try {
      const saved = localStorage.getItem(weeklyStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load weekly blocks", e);
    }
    return [];
  });

  const mappedStationBlocks: StationBlock[] = scopedBlocks.map((b) => ({
    id: b.id,
    stationCode: stationUpper,
    cadence: "WEEKLY",
    title: b.task_title || (b.task_id ? `Assigned Track Block for ${b.task_id}` : `Maintenance Block: ${b.corridor_id} ${b.track_name}`),
    lineOrPlatform: `${b.track_name} (${formatDistanceKm(b.location_km)})`,
    department: (b.is_multi_department ? "JOINT" : (b.department_id as any) || "PWAY"),
    blockType: b.power_isolation_required ? "COMBINED_BLOCK" : "TRAFFIC_BLOCK",
    scheduledDate: b.date || "2026-03-15",
    durationMinutes: b.duration_mins,
    status: (b.status === "APPROVED" || b.status === "SELECTED") ? "SCHEDULED" : "SCHEDULED",
    assignedBy: b.proposed_by || "Divisional Operations Control",
    remarks: b.conflict_summary || `Slot: ${b.requested_start_time}-${b.requested_end_time}`,
  }));

  const allWeeklyBlocks = [...mappedStationBlocks.filter((b) => isWeeklyBlock(b)), ...weeklyBlocks];
  const allMonthlyBlocks = [...mappedStationBlocks.filter((b) => isMonthlyBlock(b)), ...monthlyBlocks];

  // 3. Issue / Block Requests (Loaded directly from backend SQLite database via api.getFaults())
  const [issueRequests, setIssueRequests] = useState<StationIssueBlockRequest[]>([]);

  const loadStationFaults = async () => {
    setLoadingRequests(true);
    setRequestServerError(null);
    try {
      const faults = await api.getFaults();
      const stationUpper = stationCode.toUpperCase();
      const relevant = (faults || []).filter((f) => {
        if (f.station_code && f.station_code.toUpperCase() === stationUpper) return true;
        if (f.location_description && f.location_description.toUpperCase().includes(stationUpper)) return true;
        if (f.reporter && f.reporter.toUpperCase().includes(stationUpper)) return true;
        if (f.section_id && f.section_id.toUpperCase().includes(stationUpper)) return true;
        return false;
      });

      const mapped: StationIssueBlockRequest[] = relevant.map((f) => {
        let urgency: "ROUTINE" | "PRIORITY" | "URGENT" | "SAFETY_HAZARD" = "PRIORITY";
        if (f.severity === "CRITICAL") urgency = "SAFETY_HAZARD";
        else if (f.severity === "HIGH") urgency = "URGENT";
        else if (f.severity === "LOW") urgency = "ROUTINE";

        let reqStatus: "SUBMITTED" | "UNDER_REVIEW" | "BLOCK_REQUESTED" | "RESOLVED" = "SUBMITTED";
        if (f.status === "COMPLETED" || f.human_status === "CONFIRMED") {
          reqStatus = "RESOLVED";
        } else if (f.human_status === "OVERRIDDEN" || f.human_status === "ESCALATED") {
          reqStatus = "UNDER_REVIEW";
        } else if (f.status === "BLOCK_REQUESTED" || f.ai_recommended_protection) {
          reqStatus = "BLOCK_REQUESTED";
        }

        return {
          id: f.id,
          stationCode: f.station_code || stationCode,
          title: f.fault_title || "Station Infrastructure Defect",
          affectedLineOrAsset: f.location_description || f.track_name || "Station Yard Asset",
          department: (f.department_id as any) || "PWAY",
          urgency,
          blockTypeRequired: (f.ai_recommended_protection as any) || "TRAFFIC_BLOCK",
          requestedDurationMinutes: 90,
          requestedWindow: "Requisitioned Window",
          description: f.description || "",
          status: reqStatus,
          loggedBy: f.reporter || `SM-${stationCode}`,
          createdAt: f.timestamp || new Date().toISOString(),
        };
      });

      setIssueRequests(mapped);
    } catch (err: any) {
      console.warn("Could not load station faults from database:", err);
      setRequestServerError(err?.message || "Failed to load station faults from database.");
    } finally {
      setLoadingRequests(false);
    }
  };

  // Reload when stationCode changes
  useEffect(() => {
    try {
      const mSaved = localStorage.getItem(monthlyStorageKey);
      setMonthlyBlocks(mSaved ? JSON.parse(mSaved) : []);

      const wSaved = localStorage.getItem(weeklyStorageKey);
      setWeeklyBlocks(wSaved ? JSON.parse(wSaved) : []);
    } catch (e) {
      console.warn("Could not reload station control storage", e);
    }
    loadStationFaults();
  }, [monthlyStorageKey, weeklyStorageKey, stationCode]);

  // Selected item modal / drawer
  const [selectedRequest, setSelectedRequest] = useState<StationIssueBlockRequest | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<StationBlock | null>(null);

  // Form State for "Issue / Block Request"
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAffectedAsset, setFormAffectedAsset] = useState("");
  const [customAsset, setCustomAsset] = useState("");
  const [formDepartment, setFormDepartment] = useState<"PWAY" | "SNT" | "TRD" | "JOINT">("PWAY");
  const [formUrgency, setFormUrgency] = useState<"ROUTINE" | "PRIORITY" | "URGENT" | "SAFETY_HAZARD">("PRIORITY");
  const [formBlockType, setFormBlockType] = useState<"TRAFFIC_BLOCK" | "POWER_BLOCK" | "COMBINED_BLOCK" | "NONE">("TRAFFIC_BLOCK");
  const [formDuration, setFormDuration] = useState<number>(90);
  const [formWindow, setFormWindow] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Asset options from station's infrastructure
  const trackOptions = infrastructure.tracks.map((t: TrackDefinition) => t.name);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRequestServerError(null);
    setRequestServerSuccess(null);

    if (!formTitle.trim()) {
      setFormError("Please enter an issue title / defect summary.");
      return;
    }

    const asset = customAsset.trim() || formAffectedAsset || trackOptions[0] || "Station Yard Main";
    if (!asset) {
      setFormError("Please select or specify the affected track, platform, or asset.");
      return;
    }

    if (!formDescription.trim()) {
      setFormError("Please provide an issue description and block justification.");
      return;
    }

    setSubmittingRequest(true);
    try {
      const kmMatch = asset.match(/(\d+(\.\d+)?)/);
      const parsedKm = kmMatch ? parseFloat(kmMatch[1]) : 0.0;
      const trackName = asset.toUpperCase().includes("UP")
        ? "UP_MAIN"
        : asset.toUpperCase().includes("DOWN")
        ? "DOWN_MAIN"
        : "YARD_LINE";

      const res = await api.createFault({
        reporter: user?.username || `Station Master (${stationCode})`,
        reporter_role: "STATION_MASTER",
        station_code: stationCode,
        corridor_id: "CORRIDOR_ET_BPL",
        section_id: `${stationCode}-YARD`,
        track_name: trackName,
        location_km: parsedKm,
        location_description: `${stationName} (${stationCode}) - ${asset}`,
        fault_title: formTitle.trim(),
        description: `[${formBlockType}] (Duration: ${formDuration}m, Preferred Window: ${formWindow || "Earliest Available"}): ${formDescription.trim()}`,
        department_id: formDepartment === "JOINT" ? "PWAY" : formDepartment,
        severity: formUrgency === "SAFETY_HAZARD" ? "CRITICAL" : formUrgency === "URGENT" ? "HIGH" : formUrgency === "PRIORITY" ? "MEDIUM" : "LOW",
      });

      // Invalidate maintenance query cache
      await queryClient.invalidateQueries({ queryKey: ["faults"] });
      await queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      await queryClient.invalidateQueries({ queryKey: ["blocks"] });

      setRequestServerSuccess(
        `Issue & Block Requisition logged successfully (ID: ${res?.fault_id || "FAULT-OBS"}). Persisted to database.`
      );
      setIsFormModalOpen(false);

      // Reset form
      setFormTitle("");
      setFormAffectedAsset("");
      setCustomAsset("");
      setFormDepartment("PWAY");
      setFormUrgency("PRIORITY");
      setFormBlockType("TRAFFIC_BLOCK");
      setFormDuration(90);
      setFormWindow("");
      setFormDescription("");

      await loadStationFaults();
    } catch (err: any) {
      console.error("Failed to submit station fault to database:", err);
      const msg = err?.message || "Failed to persist issue to database.";
      setFormError(msg);
      setRequestServerError(msg);
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* ============================================================== */}
      {/* 1. STATION CONTROL NAVIGATION HEADER                            */}
      {/* ============================================================== */}
      <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[var(--brand-navy)] text-white flex-shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)] uppercase">
                  Block Workspace
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  {stationName} ({stationCode})
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Station Master block management, assigned possessory schedules, and station infrastructure defect requisition
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs: Weekly Blocks, Monthly Blocks, Issue / Block Request */}
        <div className="pt-0.5 select-none">
          <Tabs
            value={activeSection}
            onValueChange={(val) => setActiveSection(val as any)}
            variant="pills"
            className="w-full min-w-0"
          >
            <div className="w-full min-w-0 overflow-x-auto">
              <TabsList className="bg-transparent border-0 p-0 space-x-2 overflow-visible min-w-max">
                <TabsTrigger
                  value="weekly"
                  icon={<Calendar className="w-4 h-4" />}
                  badge={
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {allWeeklyBlocks.length}
                    </span>
                  }
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold tracking-wide"
                >
                  <span>Weekly Blocks</span>
                </TabsTrigger>

                <TabsTrigger
                  value="monthly"
                  icon={<CalendarRange className="w-4 h-4" />}
                  badge={
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {allMonthlyBlocks.length}
                    </span>
                  }
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold tracking-wide"
                >
                  <span>Monthly Blocks</span>
                </TabsTrigger>

                <TabsTrigger
                  value="requests"
                  icon={<AlertOctagon className="w-4 h-4 text-[var(--status-warning)]" />}
                  badge={
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
                      {issueRequests.length}
                    </span>
                  }
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold tracking-wide"
                >
                  <span>Issue / Block Request</span>
                </TabsTrigger>

                <TabsTrigger
                  value="completed"
                  icon={<CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />}
                  badge={
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
                      {stationCompletedTasks.length}
                    </span>
                  }
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold tracking-wide"
                >
                  <span>Completed Tasks</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: WEEKLY BLOCKS (VIEW ONLY — NO ADD OPTION)            */}
      {/* ============================================================== */}
      {activeSection === "weekly" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[var(--text-primary)]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Weekly Maintenance Blocks — {stationName} ({stationCode})
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Scheduled 7-day maintenance possession windows assigned to this station yard and connecting sections
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Scheduled Blocks: <strong className="text-[var(--text-primary)] font-bold">{allWeeklyBlocks.length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-mono font-bold">
                VIEW ONLY
              </span>
            </div>
          </div>

          {/* Empty state */}
          {allWeeklyBlocks.length === 0 ? (
            <EmptyState
              className="border-[var(--status-success-border)] bg-[var(--status-success-bg)]/25"
              icon={<ShieldCheck className="w-8 h-8 text-[var(--status-success)]" />}
              title="Full Track Availability — Zero Active Possessions"
              description={`No weekly maintenance possessions currently assigned to ${stationName} (${stationCode}) — full track availability. All yard lines and passenger platform berths are operational for regular train movements.`}
              advisoryNote="Station Master view-only register · Synchronized centrally with Bhopal Division"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allWeeklyBlocks.map((blk) => (
                <div
                  key={blk.id}
                  onClick={() => setSelectedBlock(blk)}
                  className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 shadow-xs hover:border-[var(--border-bold)] cursor-pointer space-y-3 transition-colors text-[var(--text-primary)]"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--text-muted)]">{blk.id}</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {blk.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">{blk.title}</h4>
                  <div className="text-xs text-[var(--text-secondary)] font-mono">
                    Line: <strong className="text-[var(--text-primary)]">{blk.lineOrPlatform}</strong> · {blk.durationMinutes} mins
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-mono pt-2 border-t border-[var(--border-subtle)] flex justify-between">
                    <span>{blk.scheduledDate}</span>
                    <span className="font-bold text-[var(--brand-navy)] dark:text-sky-400">Inspect</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: MONTHLY BLOCKS (VIEW ONLY — NO ADD OPTION)           */}
      {/* ============================================================== */}
      {activeSection === "monthly" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[var(--text-primary)]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Monthly Possessory Blocks — {stationName} ({stationCode})
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Scheduled monthly possession windows assigned by Divisional Operations and Chief of Block Officer
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Scheduled Blocks: <strong className="text-[var(--text-primary)] font-bold">{allMonthlyBlocks.length}</strong>
              </span>
              <span className="px-2.5 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-mono font-bold">
                VIEW ONLY
              </span>
            </div>
          </div>

          {/* Empty state */}
          {allMonthlyBlocks.length === 0 ? (
            <EmptyState
              className="border-[var(--status-success-border)] bg-[var(--status-success-bg)]/25"
              icon={<ShieldCheck className="w-8 h-8 text-[var(--status-success)]" />}
              title="Full Track Availability — Zero Active Possessions"
              description={`The monthly possessory schedule for ${stationName} (${stationCode}) is clear — full track availability maintained. No periodic overhaul windows currently booked.`}
              advisoryNote="Station Master view-only register · Scheduled centrally by Divisional Operations"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allMonthlyBlocks.map((blk) => (
                <div
                  key={blk.id}
                  onClick={() => setSelectedBlock(blk)}
                  className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 shadow-xs hover:border-[var(--border-bold)] cursor-pointer space-y-3 transition-colors text-[var(--text-primary)]"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--text-muted)]">{blk.id}</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {blk.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">{blk.title}</h4>
                  <div className="text-xs text-[var(--text-secondary)] font-mono">
                    Line: <strong className="text-[var(--text-primary)]">{blk.lineOrPlatform}</strong> · {blk.durationMinutes} mins
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-mono pt-2 border-t border-[var(--border-subtle)] flex justify-between">
                    <span>{blk.scheduledDate}</span>
                    <span className="font-bold text-[var(--brand-navy)] dark:text-sky-400">Inspect</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: ISSUE / BLOCK REQUEST (USER CAN SUBMIT NEW)          */}
      {/* ============================================================== */}
      {activeSection === "requests" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[var(--text-primary)]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Station Infrastructure Issues & Block Requests — {stationName} ({stationCode})
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Report station yard or platform defects and requisition a formal traffic/power block from Divisional Operations (persisted to database)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadStationFaults()}
                disabled={loadingRequests}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? "animate-spin" : ""}`} />}
              >
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Submitted Requests: <strong className="text-[var(--text-primary)] font-bold">{issueRequests.length}</strong>
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFormModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Submit Issue / Block Request
              </Button>
            </div>
          </div>

          {/* Inline Feedback Alerts */}
          {requestServerSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{requestServerSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setRequestServerSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {requestServerError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-900 text-xs rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{requestServerError}</span>
              </div>
              <button
                type="button"
                onClick={() => setRequestServerError(null)}
                className="text-red-700 hover:text-red-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Empty state (Strictly Empty by default) */}
          {issueRequests.length === 0 ? (
            <EmptyState
              icon={<AlertOctagon className="w-8 h-8 text-amber-500" />}
              title="No Issues or Block Requests Submitted"
              description={`The issue and block request register for ${stationName} (${stationCode}) is currently clean. If an infrastructure defect or track abnormality is observed, click the button below to log the issue and requisition a block.`}
              actionLabel="Submit Issue / Block Request"
              onAction={() => setIsFormModalOpen(true)}
              className="py-12"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {issueRequests.map((req) => {
                let urgencyBadge = "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]";
                if (req.urgency === "SAFETY_HAZARD") urgencyBadge = "bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 border-red-300 dark:border-red-800";
                if (req.urgency === "URGENT") urgencyBadge = "bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-800";
                if (req.urgency === "PRIORITY") urgencyBadge = "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800";

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-bold)] p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                        <span className="font-bold text-[var(--text-muted)]">{req.id}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded font-bold border ${urgencyBadge}`}>
                            {req.urgency.replace("_", " ")}
                          </span>
                          <span className="px-2 py-0.5 rounded font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-[var(--text-primary)] text-sm leading-snug">
                        {req.title}
                      </h4>

                      <div className="flex items-center space-x-1.5 text-xs text-[var(--text-secondary)]">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                        <span className="truncate">{req.affectedLineOrAsset}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded text-[10px] font-mono font-bold">
                          {req.department}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-[10px] font-mono">
                          {req.blockTypeRequired.replace("_", " ")} ({req.requestedDurationMinutes}m)
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-1 font-bold text-[var(--brand-navy)] dark:text-sky-400">
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 4: COMPLETED TASKS (STATION MASTER)                    */}
      {/* ============================================================== */}
      {activeSection === "completed" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] p-4 sm:p-5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[var(--text-primary)]">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Station Vicinity Completed Tasks — {stationName} ({stationCode})</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Tasks completed by departmental squads (P.Way, S&T, TRD) in this station jurisdiction. Notice: Overall operational track possession blocks remain active until all coordinated work finishes.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadStationCompletedTasks}
              disabled={loadingCompletedTasks}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loadingCompletedTasks ? "animate-spin" : ""}`} />}
              className="self-start sm:self-auto"
            >
              <span>Refresh Completed</span>
            </Button>
          </div>

          {stationCompletedTasks.length > 0 ? (
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-muted)] uppercase">
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
                  <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                    {stationCompletedTasks.map((tsk) => (
                      <tr key={tsk.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="p-3 pl-4 font-mono font-bold text-[var(--text-primary)]">
                          {tsk.task_id || tsk.id}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {tsk.block_id || "Unlinked"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${
                              tsk.department_id === "PWAY"
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : tsk.department_id === "SNT"
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                : "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            }`}
                          >
                            {tsk.department_id}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--text-primary)] text-[11px] font-medium max-w-[200px] truncate" title={tsk.description || tsk.title}>
                          {tsk.description || tsk.title || tsk.work_type_id}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-secondary)]">
                          <div>Track {tsk.track_name}</div>
                          <div className="font-bold text-[var(--text-primary)]">{formatDistanceKm(tsk.location_km)}</div>
                        </td>
                        <td className="p-3 text-[var(--text-secondary)] font-medium text-[11px]">
                          {tsk.completed_by || tsk.assigned_crew || "Field Squad"}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-secondary)] text-[11px]">
                          {tsk.completed_at ? new Date(tsk.completed_at).toLocaleString() : "Recently Completed"}
                        </td>
                        <td className="p-3 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            {tsk.block_status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="p-3 pr-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              tsk.verification_status === "VERIFIED"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {tsk.verification_status || "VERIFIED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              title="No Completed Departmental Tasks"
              description={`No completed departmental tasks recorded in the vicinity of ${stationName} (${stationCode}) yet.`}
              className="py-8"
            />
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SUBMIT ISSUE / BLOCK REQUEST                             */}
      {/* ============================================================== */}
      {isFormModalOpen && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] w-full max-w-xl rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden text-[var(--text-primary)]">
            <div className="p-4 sm:p-5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-base">
                  Submit Issue & Block Request — {stationName} ({stationCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Issue Title */}
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                  Issue Summary / Defect Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Sluggish throw on Crossover Point 102A / Rail surface defect"
                  className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                />
              </div>

              {/* 2. Affected Line or Asset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                    Station Line / Platform *
                  </label>
                  <select
                    value={formAffectedAsset}
                    onChange={(e) => setFormAffectedAsset(e.target.value)}
                    className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                  >
                    <option value="">-- Select Line/Platform --</option>
                    {trackOptions.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                    Or Specific Turnout / Asset
                  </label>
                  <input
                    type="text"
                    value={customAsset}
                    onChange={(e) => setCustomAsset(e.target.value)}
                    placeholder="e.g. Turnout 101B or Mast 142/8"
                    className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Department & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                    Concerned Department *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value as any)}
                    className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                  >
                    <option value="PWAY">Track / Permanent Way (P.Way)</option>
                    <option value="SNT">Signal & Telecommunications (S&T)</option>
                    <option value="TRD">Traction / OHE (TRD)</option>
                    <option value="JOINT">Joint Multi-Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                    Urgency / Priority
                  </label>
                  <select
                    value={formUrgency}
                    onChange={(e) => setFormUrgency(e.target.value as any)}
                    className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                  >
                    <option value="ROUTINE">Routine Inspection</option>
                    <option value="PRIORITY">Priority Attention</option>
                    <option value="URGENT">Urgent Maintenance</option>
                    <option value="SAFETY_HAZARD">Safety Hazard / Immediate Caution</option>
                  </select>
                </div>
              </div>

              {/* 4. Block Type & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                    Block Type Requisitioned *
                  </label>
                  <select
                    value={formBlockType}
                    onChange={(e) => setFormBlockType(e.target.value as any)}
                    className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                  >
                    <option value="TRAFFIC_BLOCK">Traffic Block (Line Possessed)</option>
                    <option value="POWER_BLOCK">Power Block (OHE De-energized)</option>
                    <option value="COMBINED_BLOCK">Combined Traffic & Power Block</option>
                    <option value="NONE">Caution Order / No Block Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                    Requested Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={formDuration}
                    onChange={(e) => setFormDuration(parseInt(e.target.value) || 60)}
                    className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* 5. Preferred Window */}
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                  Preferred Time Window / Date
                </label>
                <input
                  type="text"
                  value={formWindow}
                  onChange={(e) => setFormWindow(e.target.value)}
                  placeholder="e.g. Earliest available corridor window / Night shift 01:30 - 03:00"
                  className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                />
              </div>

              {/* 6. Description */}
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-secondary)] uppercase mb-1">
                  Issue Description & Block Justification *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail the physical or electrical defect observed, station operational impact, train movements managed, and why possession is necessary..."
                  className="w-full text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--surface-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-navy)] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  This requisition is submitted into the station's formal register for Divisional Operations review. It does not generate fake train delays or simulated train movements.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={submittingRequest}
                >
                  {submittingRequest ? "Submitting..." : "Submit Issue & Block Requisition"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: INSPECT SUBMITTED REQUEST                               */}
      {/* ============================================================== */}
      {selectedRequest && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] w-full max-w-xl rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] text-[var(--text-primary)]">
            <div className="p-4 sm:p-5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {selectedRequest.id}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {selectedRequest.department}
                </span>
                <h3 className="font-bold text-[var(--text-primary)] text-base">Issue & Block Request Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                  Reported Issue
                </span>
                <h2 className="text-base font-black text-[var(--text-primary)] mt-1">{selectedRequest.title}</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[var(--surface-secondary)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Affected Line</span>
                  <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{selectedRequest.affectedLineOrAsset}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Block Type</span>
                  <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{selectedRequest.blockTypeRequired.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Duration</span>
                  <span className="font-bold text-[var(--text-primary)] mt-0.5 block font-mono">{selectedRequest.requestedDurationMinutes} Mins</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1">
                  Requested Time Window
                </span>
                <div className="p-2.5 bg-[var(--surface-secondary)] rounded-lg border border-[var(--border-subtle)] font-mono text-[var(--text-primary)]">
                  {selectedRequest.requestedWindow}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1">
                  Defect Description & Justification
                </span>
                <p className="p-3 bg-[var(--surface-card)] rounded-lg border border-[var(--border-subtle)] leading-relaxed text-[var(--text-secondary)]">
                  {selectedRequest.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[var(--text-muted)] font-mono pt-2 border-t border-[var(--border-subtle)]">
                <span>Submitted by: <strong className="text-[var(--text-primary)]">{selectedRequest.loggedBy}</strong></span>
                <span>Date: <strong className="text-[var(--text-primary)]">{new Date(selectedRequest.createdAt).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: INSPECT BLOCK (VIEW ONLY)                               */}
      {/* ============================================================== */}
      {selectedBlock && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden flex flex-col text-[var(--text-primary)]">
            <div className="p-4 sm:p-5 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {selectedBlock.id}
                </span>
                <h3 className="font-bold text-[var(--text-primary)] text-base">Block Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlock(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <h4 className="font-bold text-[var(--text-primary)] text-sm">{selectedBlock.title}</h4>
              <div className="space-y-1.5 font-mono text-[var(--text-secondary)]">
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Line:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedBlock.lineOrPlatform}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Department:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedBlock.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Duration:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedBlock.durationMinutes} Minutes</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-muted)]">Scheduled:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedBlock.scheduledDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
