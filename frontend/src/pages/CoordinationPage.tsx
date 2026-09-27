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
  Sparkles,
  Search,
  Building2,
  CheckCircle2,
  Layers,
  X,
  RefreshCw,
  GitMerge,
  Sun,
  Moon,
  Shield,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { EmptyState } from "../components/ui/EmptyState";
import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";
import { formatDistanceKm, formatKmBadge } from "../utils/formatDistance";

// ============================================================================
// TOKEN-MAPPED HELPERS FOR LOCK TYPES & DEPARTMENTS (PHASE 0 & PHASE 6)
// Zero hardcoded hex: all styles evaluated via canonical CSS variables
// ============================================================================

const getLockTypeBadgeStyle = (lockType?: string) => {
  const l = (lockType || "PLANNED").toUpperCase();
  if (l.includes("RULING")) {
    return {
      bg: "var(--lock-ruling-bg)",
      text: "var(--lock-ruling-text)",
      border: "var(--lock-ruling-border)",
      color: "var(--lock-ruling)",
      label: "🏛️ RULING",
    };
  }
  if (l.includes("EMERGENT")) {
    return {
      bg: "var(--lock-emergent-bg)",
      text: "var(--lock-emergent-text)",
      border: "var(--lock-emergent-border)",
      color: "var(--lock-emergent)",
      label: "🚨 EMERGENT",
    };
  }
  if (l.includes("SHADOW")) {
    return {
      bg: "var(--lock-shadow-bg)",
      text: "var(--lock-shadow-text)",
      border: "var(--lock-shadow-border)",
      color: "var(--lock-shadow)",
      label: "👥 SHADOW",
    };
  }
  return {
    bg: "var(--lock-planned-bg)",
    text: "var(--lock-planned-text)",
    border: "var(--lock-planned-border)",
    color: "var(--lock-planned)",
    label: "📋 PLANNED",
  };
};

const getDepartmentBadgeStyle = (dept?: string) => {
  const d = (dept || "").toUpperCase();
  if (d.includes("PWAY") || d.includes("CIVIL")) {
    return {
      bg: "var(--dept-pway-bg)",
      text: "var(--dept-pway-text)",
      border: "var(--dept-pway-border)",
      dot: "var(--dept-pway)",
      label: "P.Way (Civil)",
    };
  }
  if (d.includes("SNT") || d.includes("SIGNAL")) {
    return {
      bg: "var(--dept-snt-bg)",
      text: "var(--dept-snt-text)",
      border: "var(--dept-snt-border)",
      dot: "var(--dept-snt)",
      label: "S&T (Signaling)",
    };
  }
  if (d.includes("TRD") || d.includes("OHE") || d.includes("ELEC") || d.includes("TRACTION")) {
    return {
      bg: "var(--dept-trd-bg)",
      text: "var(--dept-trd-text)",
      border: "var(--dept-trd-border)",
      dot: "var(--dept-trd)",
      label: "TRD (25kV OHE)",
    };
  }
  return {
    bg: "var(--dept-coa-bg)",
    text: "var(--dept-coa-text)",
    border: "var(--dept-coa-border)",
    dot: "var(--dept-coa)",
    label: dept || "COA / Operating",
  };
};

const getConflictBadgeStyle = (status?: string) => {
  const s = (status || "").toUpperCase();
  if (s === "CONFLICT") {
    return {
      bg: "var(--status-danger-bg)",
      text: "var(--status-danger-text)",
      border: "var(--status-danger-border)",
    };
  }
  if (s.includes("POTENTIAL")) {
    return {
      bg: "var(--status-warning-bg)",
      text: "var(--status-warning-text)",
      border: "var(--status-warning-border)",
    };
  }
  return {
    bg: "var(--status-success-bg)",
    text: "var(--status-success-text)",
    border: "var(--status-success-border)",
  };
};

const getPriorityBadgeStyle = (priority?: string) => {
  const p = (priority || "").toUpperCase();
  if (p === "CRITICAL") {
    return {
      bg: "var(--status-danger-bg)",
      text: "var(--status-danger-text)",
      border: "var(--status-danger-border)",
    };
  }
  if (p === "HIGH" || p === "MEDIUM") {
    return {
      bg: "var(--status-warning-bg)",
      text: "var(--status-warning-text)",
      border: "var(--status-warning-border)",
    };
  }
  return {
    bg: "var(--surface-secondary)",
    text: "var(--text-secondary)",
    border: "var(--border-subtle)",
  };
};

export const CoordinationPage: React.FC = () => {
  const { currentRole, hasPermission } = useRole();
  const invalidateCanonicalData = useInvalidateCanonicalData();

  // Active theme management with synchronized document.documentElement attribution
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get("theme");
      if (urlTheme === "dark" || urlTheme === "light") return urlTheme;
      const saved = localStorage.getItem("app-theme") || localStorage.getItem("coordination-theme");
      if (saved === "dark" || saved === "light") return saved;
      if (document.documentElement.getAttribute("data-theme") === "dark") return "dark";
    }
    return "light";
  });

  const handleThemeToggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("app-theme", next);
        localStorage.setItem("coordination-theme", next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

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
  const [, setDatasetFingerprint] = useState<string>("CANONICAL");

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
      // Joint Coordination Desk: display blocks that have been submitted
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
          message: `Block ${blockId} sanctioned successfully by Chief of Block Officer (COBO). Moved to Approved Blocks.`,
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
   */
  const matchBlock = (b: BlockData, q: string): boolean => {
    if (!q || !q.trim()) return true;
    const lower = q.toLowerCase().trim();

    if (b.id.toLowerCase().includes(lower)) return true;
    if (b.block_type?.toLowerCase().includes(lower)) return true;
    if (b.task_id?.toLowerCase().includes(lower)) return true;
    if (b.corridor_id?.toLowerCase().includes(lower)) return true;
    if (b.section_id?.toLowerCase().includes(lower)) return true;
    if (b.section_name?.toLowerCase().includes(lower)) return true;
    if (b.track_name?.toLowerCase().includes(lower)) return true;
    if (b.from_station_code?.toLowerCase().includes(lower)) return true;
    if (b.to_station_code?.toLowerCase().includes(lower)) return true;
    if (b.station_codes?.some((s) => s.toLowerCase().includes(lower))) return true;

    if (b.location_km != null) {
      if (b.location_km.toString().includes(lower)) return true;
      if (formatDistanceKm(b.location_km).toLowerCase().includes(lower)) return true;
    }

    if (b.department_id?.toLowerCase().includes(lower)) return true;
    if (b.departments?.some((d) => d.toLowerCase().includes(lower))) return true;
    if (b.participating_departments?.toLowerCase().includes(lower)) return true;

    if (b.status?.toLowerCase().includes(lower)) return true;
    if (b.approval_status?.toLowerCase().includes(lower)) return true;
    if (b.conflict_status?.toLowerCase().includes(lower)) return true;
    if (b.conflict_summary?.toLowerCase().includes(lower)) return true;
    if (b.assigned_machine?.toLowerCase().includes(lower)) return true;
    if (b.proposed_by?.toLowerCase().includes(lower)) return true;

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

    if (b.bundled_tasks?.some((bt: string) => bt.toLowerCase().includes(lower))) return true;

    return false;
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)] font-mono min-h-screen bg-[var(--surface-body)] flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span>Loading Operational Coordination...</span>
      </div>
    );
  }

  // Filter by selected tab
  const tabFilteredBlocks = blocks.filter((b) => {
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
   * Sourced directly with --lock-shadow and --dept-* tokens. Zero hardcoded hex.
   */
  const renderMultiDepartmentTasks = (b: BlockData) => {
    const isShadow = b.block_type === "SHADOW" || b.is_multi_department || (b.tasks && b.tasks.length > 1);
    if (!isShadow) return null;

    const taskList = b.tasks && b.tasks.length > 0 ? b.tasks : [];

    return (
      <div
        className="mt-3 p-3 rounded-xl border space-y-2.5 transition-colors"
        style={{
          backgroundColor: "var(--lock-shadow-bg)",
          borderColor: "var(--lock-shadow-border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div
              className="p-1 rounded text-white"
              style={{ backgroundColor: "var(--lock-shadow)" }}
            >
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <span
                className="font-bold text-xs font-mono uppercase tracking-wide"
                style={{ color: "var(--lock-shadow-text)" }}
              >
                {b.block_type === "SHADOW"
                  ? "Unified Shadow Block Possession"
                  : "Multi-Department Joint Possession Window"}
              </span>
              <span
                className="text-[10px] block font-mono opacity-80"
                style={{ color: "var(--lock-shadow-text)" }}
              >
                1 Consolidated Possession · All Departments Visible Together (Zero Traffic Splitting)
              </span>
            </div>
          </div>
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
            style={{
              backgroundColor: "var(--surface-card)",
              color: "var(--lock-shadow-text)",
              borderColor: "var(--lock-shadow-border)",
            }}
          >
            {taskList.length} Coordinated Department Tasks
          </span>
        </div>

        {/* Department Tasks Breakdown */}
        <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--surface-card)] shadow-2xs">
          {taskList.length > 0 ? (
            taskList.map((task: any, tidx: number) => {
              const isDone = task.status === "COMPLETED";
              const isRunning = task.status === "IN_PROGRESS" || task.status === "WORK_STARTED";
              const deptStyle = getDepartmentBadgeStyle(task.department_id);

              return (
                <div
                  key={task.id || tidx}
                  className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[var(--surface-secondary)]/50 transition-colors"
                >
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded font-mono font-bold text-[10px] border flex-shrink-0 mt-0.5 flex items-center space-x-1"
                      style={{
                        backgroundColor: deptStyle.bg,
                        color: deptStyle.text,
                        borderColor: deptStyle.border,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: deptStyle.dot }}
                      ></span>
                      <span>{deptStyle.label}</span>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono">
                        <strong className="text-[var(--text-primary)] font-bold">{task.id}</strong>
                        {task.fault_id && (
                          <span className="text-[10px] text-[var(--text-muted)]">· Ref: {task.fault_id}</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold border bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                          {formatKmBadge(task.location_km ?? b.location_km)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ({formatDistanceKm(task.location_km ?? b.location_km)})
                        </span>
                      </div>
                      <div className="text-[var(--text-secondary)] font-medium text-[11px] mt-0.5 truncate">
                        {task.title || task.work_type_id}
                      </div>
                    </div>
                  </div>

                  {/* Independent Department Status */}
                  <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                    {isDone ? (
                      <span
                        className="px-2.5 py-1 rounded font-mono font-bold text-[10px] border flex items-center space-x-1"
                        style={{
                          backgroundColor: "var(--status-success-bg)",
                          color: "var(--status-success-text)",
                          borderColor: "var(--status-success-border)",
                        }}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-[var(--status-success)]" />
                        <span>
                          COMPLETED {task.completed_at ? `(${new Date(task.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : ""}
                        </span>
                      </span>
                    ) : isRunning ? (
                      <span
                        className="px-2.5 py-1 rounded font-mono font-bold text-[10px] border flex items-center space-x-1"
                        style={{
                          backgroundColor: "var(--status-warning-bg)",
                          color: "var(--status-warning-text)",
                          borderColor: "var(--status-warning-border)",
                        }}
                      >
                        <Clock className="w-3.5 h-3.5 text-[var(--status-warning)] animate-spin" />
                        <span>IN PROGRESS</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] border bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                        {task.status || "NOT STARTED / PENDING"}
                      </span>
                    )}

                    {!isDone && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCompleteIndividualTask(task.id, deptStyle.label)}
                        className="h-6 px-2 text-[10px] font-bold"
                        leftIcon={<CheckCircle2 className="w-3 h-3 text-[var(--status-success)]" />}
                        title="Mark this department's task as finished (parent block remains active)"
                      >
                        Finish Task
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-xs text-[var(--text-muted)] font-mono">
              Primary Task: {b.task_id} ({b.department_id || "PWAY"})
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-theme={theme}
      className={`min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-5 transition-colors duration-150 ${
        theme === "dark"
          ? "dark bg-[var(--surface-body)] text-[var(--text-primary)]"
          : "bg-[var(--surface-body)] text-[var(--text-primary)]"
      }`}
    >
      {/* 1. TOP HEADER & WORKSPACE METADATA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-[var(--text-primary)]" />
            <span>Multi-Department Coordination & Block Approvals</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Active Desk: <strong className="text-[var(--text-primary)]">{currentRole.name}</strong> · Operating · Station Master · P.Way · S&T · TRD Joint Desk
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProvenanceBadge type="REAL_PUBLIC" />

          {/* Theme Toggle Button */}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleThemeToggle}
            leftIcon={
              theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-[var(--status-warning)]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              )
            }
            className="text-xs font-bold"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>

          <Button
            asChild
            size="sm"
            variant="secondary"
            className="text-xs font-bold"
            leftIcon={<GitMerge className="w-3.5 h-3.5 text-[var(--status-success)]" />}
          >
            <Link
              to="/baseline-comparison"
              title="View Independent Baseline vs Co-located Optimizer Comparison"
            >
              Baseline Comparison (-24.9%)
            </Link>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleRegenerateCanonical}
            disabled={regenerating}
            isLoading={regenerating}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />}
            className="text-xs font-bold border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200"
            title="Generate a new validated 50-block planning scenario"
          >
            {regenerating ? "Validating & Promoting..." : "Regenerate 50 Blocks"}
          </Button>
        </div>
      </div>

      {/* 2. CANONICAL VISUAL LEGEND BAR (Zero hardcoded hex: tokens.css variables) */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] p-2.5 rounded-[var(--radius-lg)] flex flex-wrap items-center justify-between text-xs gap-3 shadow-2xs font-mono">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
            Canonical Lock Types:
          </span>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{ backgroundColor: "var(--lock-ruling-fill)", borderColor: "var(--lock-ruling)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-ruling)" }}>
              🏛️ Ruling
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{ backgroundColor: "var(--lock-planned-fill)", borderColor: "var(--lock-planned)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-planned)" }}>
              📋 Planned
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{ backgroundColor: "var(--lock-emergent-fill)", borderColor: "var(--lock-emergent)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-emergent)" }}>
              🚨 Emergent
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded inline-block border"
              style={{ backgroundColor: "var(--lock-shadow-fill)", borderColor: "var(--lock-shadow)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--lock-shadow)" }}>
              👥 Shadow (Consolidated)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
            Departments:
          </span>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: "var(--dept-pway)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--dept-pway)" }}>
              P.Way
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: "var(--dept-snt)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--dept-snt)" }}>
              S&T
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: "var(--dept-trd)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--dept-trd)" }}>
              TRD (OHE)
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: "var(--dept-coa)" }}
            ></span>
            <span className="font-bold" style={{ color: "var(--dept-coa)" }}>
              COA (Ops)
            </span>
          </div>
        </div>
      </div>

      {/* 3. INLINE FEEDBACK BANNER */}
      {feedback && (
        <div
          className="p-3 rounded-lg flex items-center justify-between text-xs font-medium border shadow-xs transition-all"
          style={{
            backgroundColor:
              feedback.type === "success"
                ? "var(--status-success-bg)"
                : feedback.type === "error"
                ? "var(--status-danger-bg)"
                : "var(--status-info-bg)",
            color:
              feedback.type === "success"
                ? "var(--status-success-text)"
                : feedback.type === "error"
                ? "var(--status-danger-text)"
                : "var(--status-info-text)",
            borderColor:
              feedback.type === "success"
                ? "var(--status-success-border)"
                : feedback.type === "error"
                ? "var(--status-danger-border)"
                : "var(--status-info-border)",
          }}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" && <CheckCircle className="w-4 h-4 text-[var(--status-success)] flex-shrink-0" />}
            {feedback.type === "error" && <AlertTriangle className="w-4 h-4 text-[var(--status-danger)] flex-shrink-0" />}
            {feedback.type === "info" && <Clock className="w-4 h-4 text-[var(--status-info)] flex-shrink-0" />}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="cursor-pointer font-bold px-1.5 py-0.5 opacity-70 hover:opacity-100"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. DEPARTMENT FILTER TABS (Phase 1 Tabs Primitive) */}
      <Tabs value={selectedDept} onValueChange={setSelectedDept} variant="pills" className="w-full min-w-0">
        <div className="flex items-center space-x-3 border-b border-[var(--border-subtle)] pb-2 w-full min-w-0">
          <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0 select-none">
            Filter Workspace:
          </span>
          <div className="flex-1 min-w-0 overflow-x-auto">
            <TabsList className="bg-transparent border-0 p-0 space-x-1 overflow-visible min-w-max">
              <TabsTrigger
                value="ALL"
                className="px-2.5 py-1 text-xs sm:text-xs sm:px-2.5 sm:py-1 font-semibold"
                badge={
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {blocks.length}
                  </span>
                }
              >
                All Departments
              </TabsTrigger>
              <TabsTrigger
                value="PWAY"
                className="px-2.5 py-1 text-xs sm:text-xs sm:px-2.5 sm:py-1 font-semibold"
                badge={
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {
                      blocks.filter(
                        (b) =>
                          (b.departments ? b.departments.includes("PWAY") : (b.department_id || "PWAY") === "PWAY") ||
                          (b.tasks && b.tasks.some((t: any) => t.department_id === "PWAY"))
                      ).length
                    }
                  </span>
                }
              >
                P.Way (Civil)
              </TabsTrigger>
              <TabsTrigger
                value="SNT"
                className="px-2.5 py-1 text-xs sm:text-xs sm:px-2.5 sm:py-1 font-semibold"
                badge={
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {
                      blocks.filter(
                        (b) =>
                          (b.departments ? b.departments.includes("SNT") : b.department_id === "SNT") ||
                          (b.tasks && b.tasks.some((t: any) => t.department_id === "SNT"))
                      ).length
                    }
                  </span>
                }
              >
                S&T (Signaling)
              </TabsTrigger>
              <TabsTrigger
                value="TRD"
                className="px-2.5 py-1 text-xs sm:text-xs sm:px-2.5 sm:py-1 font-semibold"
                badge={
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {
                      blocks.filter(
                        (b) =>
                          (b.departments ? b.departments.includes("TRD") : b.department_id === "TRD") ||
                          Boolean(b.power_isolation_required || b.trd_coordination_required) ||
                          (b.tasks && b.tasks.some((t: any) => t.department_id === "TRD"))
                      ).length
                    }
                  </span>
                }
              >
                TRD (Traction / OHE)
              </TabsTrigger>
              <TabsTrigger
                value="MULTI"
                className="px-2.5 py-1 text-xs sm:text-xs sm:px-2.5 sm:py-1 font-semibold"
                badge={
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {
                      blocks.filter(
                        (b) => b.is_multi_department || b.block_type === "SHADOW" || (b.tasks && b.tasks.length > 1)
                      ).length
                    }
                  </span>
                }
              >
                Multi-Dept / Shadow
              </TabsTrigger>
              <TabsTrigger
                value="COMPLETED"
                className="px-2.5 py-1 text-xs sm:text-xs sm:px-2.5 sm:py-1 font-semibold"
                badge={
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    {completedTasks.length}
                  </span>
                }
              >
                Completed Tasks
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>

      {/* 5. COBO SEARCH & CONSISTENT COUNT STATUS CONTROL */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface-card)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
        <div className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Block ID, Task ID (e.g. TASK-SHD-01-3), Fault ID, Corridor (BPL-ET), Station, Department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="text-xs font-semibold shrink-0"
            title="Execute Search across all departments and child tasks"
          >
            <Search className="w-3.5 h-3.5 mr-1" />
            <span>Search</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] font-mono">
          {searchQuery ? (
            <span
              className="px-2.5 py-1 rounded-lg font-bold border"
              style={{
                backgroundColor: "var(--status-info-bg)",
                color: "var(--status-info-text)",
                borderColor: "var(--status-info-border)",
              }}
            >
              Found {selectedDept === "COMPLETED" ? filteredCompletedTasks.length : filteredBlocks.length} matches (All coordinated tasks included)
            </span>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">
              {selectedDept === "COMPLETED"
                ? `${completedTasks.length} Completed Tasks Recorded`
                : `Showing ${filteredBlocks.length} blocks (${pendingBlocks.length} pending · ${approvedBlocks.length} sanctioned · ${selectedBlocks.length} selected · ${historicalBlocks.length} historical)`}
            </span>
          )}
        </div>
      </div>

      {/* 6. VIEW: DEDICATED COMPLETED TASKS LEDGER */}
      {selectedDept === "COMPLETED" ? (
        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--status-success-border)] shadow-xs overflow-hidden">
          <div
            className="p-3.5 border-b flex flex-wrap items-center justify-between gap-2"
            style={{
              backgroundColor: "var(--status-success-bg)",
              borderColor: "var(--status-success-border)",
              color: "var(--status-success-text)",
            }}
          >
            <div>
              <span className="font-bold text-xs tracking-wide flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                <span>DEPARTMENT COMPLETED TASKS LEDGER ({filteredCompletedTasks.length})</span>
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                Individual department task completion recorded with timestamp. 
                <strong className="ml-1">Important:</strong> The parent block remains in active operational schedule until all participating squads conclude work.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={loadCompletedTasks}
              disabled={loadingCompleted}
              isLoading={loadingCompleted}
              className="h-7 text-[11px] font-medium"
              leftIcon={<RefreshCw className={`w-3 h-3 ${loadingCompleted ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
          </div>

          {filteredCompletedTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] font-mono uppercase text-[11px] text-[var(--text-muted)]">
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
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredCompletedTasks.map((t) => {
                    const deptStyle = getDepartmentBadgeStyle(t.department_id);
                    return (
                      <tr key={t.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="p-3 pl-4 font-mono font-bold text-[var(--text-primary)]">
                          {t.task_id || t.id}
                        </td>
                        <td
                          className="p-3 font-mono font-bold"
                          style={{ color: "var(--lock-shadow)" }}
                        >
                          {t.block_id || "Unlinked"}
                        </td>
                        <td className="p-3 font-mono">
                          <span
                            className="px-2 py-0.5 rounded font-bold text-[10px] border"
                            style={{
                              backgroundColor: deptStyle.bg,
                              color: deptStyle.text,
                              borderColor: deptStyle.border,
                            }}
                          >
                            {t.department_id}
                          </span>
                        </td>
                        <td className="p-3 text-[var(--text-secondary)] text-[11px] font-medium max-w-[200px] truncate" title={t.description || t.title}>
                          {t.description || t.title}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-secondary)]">
                          <div>{t.corridor_id} · Track {t.track_name}</div>
                          <div className="text-[var(--text-muted)] font-bold">{formatDistanceKm(t.location_km)}</div>
                        </td>
                        <td className="p-3 text-[var(--text-secondary)] font-medium text-[11px]">
                          {t.completed_by || t.assigned_crew || "Field Squad"}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-primary)] text-[11px]">
                          {t.completed_at ? new Date(t.completed_at).toLocaleString() : "Recently Completed"}
                        </td>
                        <td className="p-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                            style={{
                              backgroundColor:
                                t.block_status === "APPROVED"
                                  ? "var(--status-success-bg)"
                                  : t.block_status === "SELECTED"
                                  ? "var(--status-info-bg)"
                                  : "var(--surface-secondary)",
                              color:
                                t.block_status === "APPROVED"
                                  ? "var(--status-success-text)"
                                  : t.block_status === "SELECTED"
                                  ? "var(--status-info-text)"
                                  : "var(--text-secondary)",
                              borderColor:
                                t.block_status === "APPROVED"
                                  ? "var(--status-success-border)"
                                  : t.block_status === "SELECTED"
                                  ? "var(--status-info-border)"
                                  : "var(--border-subtle)",
                            }}
                          >
                            {t.block_status}
                          </span>
                        </td>
                        <td className="p-3 pr-4">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                            style={{
                              backgroundColor:
                                t.verification_status === "VERIFIED"
                                  ? "var(--status-success-bg)"
                                  : "var(--status-warning-bg)",
                              color:
                                t.verification_status === "VERIFIED"
                                  ? "var(--status-success-text)"
                                  : "var(--status-warning-text)",
                              borderColor:
                                t.verification_status === "VERIFIED"
                                  ? "var(--status-success-border)"
                                  : "var(--status-warning-border)",
                            }}
                          >
                            {t.verification_status || "VERIFIED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<Layers className="w-8 h-8 text-[var(--text-muted)]" />}
                title="No Completed Departmental Tasks"
                description="No individual departmental maintenance tasks match current search criteria or date filters."
                actionLabel={searchQuery ? "Clear Search" : undefined}
                onAction={searchQuery ? () => setSearchQuery("") : undefined}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 7. PENDING BLOCKS FOR APPROVAL */}
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
            <div className="p-3 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[var(--status-info)]" />
                <span className="font-bold text-[var(--text-primary)] text-xs tracking-wide">
                  PENDING BLOCK REQUESTS REQUIRING DIVISIONAL CLEARANCE ({pendingBlocks.length})
                </span>
              </div>
              <ProvenanceBadge type="DERIVED" size="sm" />
            </div>

            {pendingBlocks.length > 0 ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {pendingBlocks.map((b) => {
                  const lockStyle = getLockTypeBadgeStyle(b.block_type);
                  const conflictStyle = getConflictBadgeStyle(b.conflict_status);
                  const priorityStyle = getPriorityBadgeStyle(b.task_priority);
                  const deptStyle = getDepartmentBadgeStyle(b.participating_departments || b.department_id);

                  return (
                    <div key={b.id} className="p-4 hover:bg-[var(--surface-secondary)]/40 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold font-mono text-[var(--text-primary)] text-sm">{b.id}</span>
                            <span
                              className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: conflictStyle.bg,
                                color: conflictStyle.text,
                                borderColor: conflictStyle.border,
                              }}
                            >
                              {b.conflict_status}
                            </span>
                            {b.block_type && (
                              <span
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase"
                                style={{
                                  backgroundColor: lockStyle.bg,
                                  color: lockStyle.text,
                                  borderColor: lockStyle.border,
                                }}
                              >
                                {lockStyle.label}
                              </span>
                            )}
                            {b.status && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                {b.status}
                              </span>
                            )}
                            {b.task_priority && (
                              <span
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                                style={{
                                  backgroundColor: priorityStyle.bg,
                                  color: priorityStyle.text,
                                  borderColor: priorityStyle.border,
                                }}
                              >
                                {b.task_priority}
                              </span>
                            )}
                            <span className="text-xs text-[var(--text-muted)] font-mono">Proposed by {b.proposed_by}</span>
                          </div>

                          <div className="text-xs text-[var(--text-primary)] mt-1.5 font-semibold">
                            Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                            {b.conflict_summary}
                          </p>

                          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-3 font-mono">
                            <span>
                              Dept:{" "}
                              <strong
                                className="font-bold px-1.5 py-0.2 rounded border"
                                style={{
                                  backgroundColor: deptStyle.bg,
                                  color: deptStyle.text,
                                  borderColor: deptStyle.border,
                                }}
                              >
                                {deptStyle.label}
                              </strong>
                            </span>
                            {b.is_multi_department && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: "var(--lock-shadow-bg)",
                                  color: "var(--lock-shadow-text)",
                                  borderColor: "var(--lock-shadow-border)",
                                }}
                              >
                                Multi-Department Block
                              </span>
                            )}
                            {(b.departments && b.departments.includes("TRD")) || b.department_id === "TRD" ? (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: "var(--dept-trd-bg)",
                                  color: "var(--dept-trd-text)",
                                  borderColor: "var(--dept-trd-border)",
                                }}
                              >
                                TRD MAINTENANCE WORK
                              </span>
                            ) : b.power_isolation_required || b.trd_coordination_required ? (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: "var(--status-warning-bg)",
                                  color: "var(--status-warning-text)",
                                  borderColor: "var(--status-warning-border)",
                                }}
                              >
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

                        {/* Actions & Remarks */}
                        <div className="flex flex-col items-end space-y-2 flex-shrink-0 min-w-[280px]">
                          <input
                            type="text"
                            placeholder={`${currentRole.name} remarks...`}
                            value={activeNotes[b.id] || ""}
                            onChange={(e) => setActiveNotes({ ...activeNotes, [b.id]: e.target.value })}
                            className="w-full text-xs p-1.5 border border-[var(--border-subtle)] rounded bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setReasoningBlockId(b.id)}
                              leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                              title="View Explainable Decision Support & Train Impact"
                            >
                              Reasoning
                            </Button>

                            {canApprove ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleAction(b.id, "REJECT")}
                                  disabled={submitting === b.id}
                                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                >
                                  Reject
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleAction(b.id, "RESCHEDULE")}
                                  disabled={submitting === b.id}
                                  leftIcon={<Clock className="w-3.5 h-3.5" />}
                                >
                                  Reschedule
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleAction(b.id, "APPROVE")}
                                  disabled={submitting === b.id}
                                  isLoading={submitting === b.id}
                                  leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                                >
                                  Sanction Block
                                </Button>
                              </>
                            ) : (
                              <div
                                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] border"
                                style={{
                                  backgroundColor: "var(--status-warning-bg)",
                                  color: "var(--status-warning-text)",
                                  borderColor: "var(--status-warning-border)",
                                }}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-warning)] flex-shrink-0" />
                                <span>Requires Chief of Block Officer (COBO) Sanction</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Positive/Success EmptyState when zero pending requests remain */
              <div className="p-6">
                <EmptyState
                  icon={<CheckCircle2 className="w-8 h-8 text-[var(--status-success)]" />}
                  title="All Clear — Zero Pending Clearance Requests"
                  description={
                    searchQuery
                      ? `No pending block requests match "${searchQuery}". Clear search or switch filters.`
                      : "All submitted multi-department maintenance and traffic block requests have been reviewed and sanctioned. The division's operational headway remains fully protected."
                  }
                  actionLabel={searchQuery ? "Clear Search" : undefined}
                  onAction={searchQuery ? () => setSearchQuery("") : undefined}
                  className="my-2 border-[var(--status-success-border)] bg-[var(--status-success-bg)]/10"
                />
              </div>
            )}
          </div>

          {/* 8. APPROVED BLOCKS READY FOR OPERATIONAL SELECTION */}
          {approvedBlocks.length > 0 && (
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--status-success-border)] shadow-xs overflow-hidden">
              <div
                className="p-3 border-b flex items-center justify-between"
                style={{
                  backgroundColor: "var(--status-success-bg)",
                  borderColor: "var(--status-success-border)",
                  color: "var(--status-success-text)",
                }}
              >
                <span className="font-bold text-xs tracking-wide flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-[var(--status-success)]" />
                  <span>APPROVED BLOCKS READY FOR OPERATIONAL SELECTION ({approvedBlocks.length})</span>
                </span>
                <span className="text-[11px] font-medium opacity-90">Controller Sanctioned · Select for Operational Planning</span>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {approvedBlocks.map((b) => {
                  const lockStyle = getLockTypeBadgeStyle(b.block_type);
                  const deptStyle = getDepartmentBadgeStyle(b.participating_departments || b.department_id);
                  const priorityStyle = getPriorityBadgeStyle(b.task_priority);

                  return (
                    <div key={b.id} className="p-4 hover:bg-[var(--surface-secondary)]/40 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold font-mono text-[var(--text-primary)] text-sm">{b.id}</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center space-x-1"
                              style={{
                                backgroundColor: "var(--status-success-bg)",
                                color: "var(--status-success-text)",
                                borderColor: "var(--status-success-border)",
                              }}
                            >
                              <CheckCircle className="w-3 h-3 text-[var(--status-success)]" />
                              <span>SANCTIONED</span>
                            </span>
                            {b.block_type && (
                              <span
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase"
                                style={{
                                  backgroundColor: lockStyle.bg,
                                  color: lockStyle.text,
                                  borderColor: lockStyle.border,
                                }}
                              >
                                {lockStyle.label}
                              </span>
                            )}
                            {b.task_priority && (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                                style={{
                                  backgroundColor: priorityStyle.bg,
                                  color: priorityStyle.text,
                                  borderColor: priorityStyle.border,
                                }}
                              >
                                {b.task_priority}
                              </span>
                            )}
                            <span className="text-xs text-[var(--text-muted)] font-mono">
                              Approved by {b.approved_by || "Controller"}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--text-primary)] mt-1.5 font-semibold">
                            Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                          </div>

                          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-3 font-mono">
                            <span>
                              Dept:{" "}
                              <strong
                                className="font-bold px-1.5 py-0.2 rounded border"
                                style={{
                                  backgroundColor: deptStyle.bg,
                                  color: deptStyle.text,
                                  borderColor: deptStyle.border,
                                }}
                              >
                                {deptStyle.label}
                              </strong>
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
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setReasoningBlockId(b.id)}
                            leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                            title="View Explainable Decision Support & Train Impact"
                          >
                            Reasoning
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAction(b.id, "RESCHEDULE")}
                            disabled={submitting === b.id}
                            leftIcon={<Clock className="w-3.5 h-3.5" />}
                          >
                            Re-plan
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => handleAction(b.id, "SELECT")}
                            disabled={submitting === b.id}
                            isLoading={submitting === b.id}
                            leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                          >
                            Select Block Plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. SELECTED BLOCKS CLEARED FOR OPERATIONAL MASTER SCHEDULE */}
          {selectedBlocks.length > 0 && (
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--status-info-border)] shadow-xs overflow-hidden">
              <div
                className="p-3 border-b flex items-center justify-between"
                style={{
                  backgroundColor: "var(--status-info-bg)",
                  borderColor: "var(--status-info-border)",
                  color: "var(--status-info-text)",
                }}
              >
                <span className="font-bold text-xs tracking-wide flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-[var(--status-info)]" />
                  <span>SELECTED BLOCKS CLEARED FOR OPERATIONAL PLANNING ({selectedBlocks.length})</span>
                </span>
                <span className="text-[11px] font-medium opacity-90">Selected into Master Schedule · Multi-Department Synchronized</span>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {selectedBlocks.map((b) => {
                  const lockStyle = getLockTypeBadgeStyle(b.block_type);
                  const deptStyle = getDepartmentBadgeStyle(b.participating_departments || b.department_id);
                  const priorityStyle = getPriorityBadgeStyle(b.task_priority);

                  return (
                    <div key={b.id} className="p-4 hover:bg-[var(--surface-secondary)]/40 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold font-mono text-[var(--text-primary)] text-sm">{b.id}</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center space-x-1"
                              style={{
                                backgroundColor: "var(--status-info-bg)",
                                color: "var(--status-info-text)",
                                borderColor: "var(--status-info-border)",
                              }}
                            >
                              <CheckCircle className="w-3 h-3 text-[var(--status-info)]" />
                              <span>SELECTED PLAN</span>
                            </span>
                            {b.block_type && (
                              <span
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase"
                                style={{
                                  backgroundColor: lockStyle.bg,
                                  color: lockStyle.text,
                                  borderColor: lockStyle.border,
                                }}
                              >
                                {lockStyle.label}
                              </span>
                            )}
                            {b.task_priority && (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                                style={{
                                  backgroundColor: priorityStyle.bg,
                                  color: priorityStyle.text,
                                  borderColor: priorityStyle.border,
                                }}
                              >
                                {b.task_priority}
                              </span>
                            )}
                            <span className="text-xs text-[var(--text-muted)] font-mono">By {b.approved_by || "Controller"}</span>
                          </div>

                          <div className="text-xs text-[var(--text-primary)] mt-1.5 font-semibold">
                            Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time}–{b.requested_end_time} ({b.duration_mins} mins)
                          </div>

                          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-3 font-mono">
                            <span>
                              Dept:{" "}
                              <strong
                                className="font-bold px-1.5 py-0.2 rounded border"
                                style={{
                                  backgroundColor: deptStyle.bg,
                                  color: deptStyle.text,
                                  borderColor: deptStyle.border,
                                }}
                              >
                                {deptStyle.label}
                              </strong>
                            </span>
                            {b.is_multi_department && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: "var(--lock-shadow-bg)",
                                  color: "var(--lock-shadow-text)",
                                  borderColor: "var(--lock-shadow-border)",
                                }}
                              >
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
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setReasoningBlockId(b.id)}
                            leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                            title="View AI Decision Rationale & Train Impact"
                          >
                            Reasoning
                          </Button>
                          <span
                            className="text-xs font-mono font-bold px-3 py-1.5 rounded border"
                            style={{
                              backgroundColor: "var(--status-info-bg)",
                              color: "var(--status-info-text)",
                              borderColor: "var(--status-info-border)",
                            }}
                          >
                            Cleared for Execution
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10. HISTORICAL PROCESSED BLOCKS */}
          {historicalBlocks.length > 0 && (
            <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs overflow-hidden">
              <div className="p-3 bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)] text-xs tracking-wide">
                  HISTORICAL & RE-PLAN LEDGER ({historicalBlocks.length})
                </span>
                <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-secondary)]/70 border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-mono uppercase text-[11px]">
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
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {historicalBlocks.map((b) => {
                      const deptStyle = getDepartmentBadgeStyle(b.department_id);
                      return (
                        <tr key={b.id} className="hover:bg-[var(--surface-secondary)]/40 transition-colors">
                          <td className="p-2.5 pl-4 font-mono font-bold text-[var(--text-primary)]">{b.id}</td>
                          <td className="p-2.5 font-mono font-semibold">
                            <span
                              className="px-1.5 py-0.2 rounded border text-[10px]"
                              style={{
                                backgroundColor: deptStyle.bg,
                                color: deptStyle.text,
                                borderColor: deptStyle.border,
                              }}
                            >
                              {b.department_id || "PWAY"}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[var(--text-secondary)]">
                            {b.track_name} ({formatDistanceKm(b.location_km)})
                          </td>
                          <td className="p-2.5 font-mono text-[var(--text-primary)]">
                            {b.requested_start_time} – {b.requested_end_time}
                          </td>
                          <td className="p-2.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
                              style={{
                                backgroundColor:
                                  b.status === "REJECTED"
                                    ? "var(--status-danger-bg)"
                                    : b.status === "RE_PLAN"
                                    ? "var(--status-warning-bg)"
                                    : "var(--surface-secondary)",
                                color:
                                  b.status === "REJECTED"
                                    ? "var(--status-danger-text)"
                                    : b.status === "RE_PLAN"
                                    ? "var(--status-warning-text)"
                                    : "var(--text-secondary)",
                                borderColor:
                                  b.status === "REJECTED"
                                    ? "var(--status-danger-border)"
                                    : b.status === "RE_PLAN"
                                    ? "var(--status-warning-border)"
                                    : "var(--border-subtle)",
                              }}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-medium text-[var(--text-secondary)]">{b.approved_by || "System"}</td>
                          <td className="p-2.5 pr-4 text-[var(--text-muted)] text-[11px]">
                            {b.approval_notes && !b.approval_notes.trim().startsWith("{") ? b.approval_notes : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* REASONING MODAL */}
      <BlockReasoningModal
        isOpen={!!reasoningBlockId}
        onClose={() => setReasoningBlockId(null)}
        blockId={reasoningBlockId || undefined}
      />
    </div>
  );
};

export default CoordinationPage;
