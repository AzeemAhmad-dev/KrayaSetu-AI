import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { TrainMovementData, BlockData, DivisionSummary } from "../types";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { useRole } from "../context/RoleContext";
import { BlockReasoningModal } from "../components/blocks/BlockReasoningModal";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceKm } from "../utils/formatDistance";
import {
  useCanonicalBlocks,
  useTrainMovements,
  usePriorityTasks,
  useNetworkSummary,
  useDashboardSummary,
  useInvalidateCanonicalData,
  useBaselineComparison,
} from "../hooks/useCanonicalData";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Zap,
  Hammer,
  ArrowRight,
  Sparkles,
  Sliders,
  Cpu,
  RefreshCw,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  ShieldAlert,
  Calendar,
  CalendarRange,
} from "lucide-react";

export const DivisionalOperationsControl: React.FC = () => {
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateCanonicalData = useInvalidateCanonicalData();

  // React Query hooks — data survives navigation (staleTime=Infinity for canonical data)
  const { data: trainsData, isLoading: trainsLoading } = useTrainMovements();
  const { data: blocksData, isLoading: blocksLoading } = useCanonicalBlocks();
  const { data: summaryData, isLoading: summaryLoading } = useNetworkSummary();
  const { data: dashData } = useDashboardSummary();
  const { data: prioData, isLoading: prioLoading } = usePriorityTasks(1000);
  const { data: baselineData } = useBaselineComparison();

  // Derived state from query results
  const trains = trainsData ?? [];
  const blocks = blocksData ?? [];
  const summary = summaryData ?? null;
  const dashSummary = dashData ?? null;
  const priorityTasks = prioData?.tasks ?? [];
  const loading = trainsLoading || blocksLoading || summaryLoading || prioLoading;

  // Baseline Comparison headline metrics
  const baselineHours = baselineData?.independent_baseline?.total_hours ?? 132.5;
  const baselineWindows = baselineData?.independent_baseline?.total_windows ?? 64;
  const optimizedHours = baselineData?.optimized_plan?.total_hours ?? 99.5;
  const optimizedBlocks = baselineData?.optimized_plan?.total_blocks ?? 50;
  const hoursSaved = baselineData?.impact?.hours_saved ?? 33.0;
  const pctReduction = baselineData?.impact?.percentage_reduction ?? 24.9;
  const windowsEliminated = baselineData?.impact?.windows_eliminated ?? 14;
  const shadowSavingsPct = baselineData?.impact?.shadow_sections_savings?.percentage_reduction ?? 61.7;

  // The Division Block Ledger strictly displays blocks that have actually been proposed or are in active clearance/operational workflow.
  // Raw canonical blocks in "PLANNED" / "DRAFT" state remain unproposed and do NOT appear in the ledger.
  const ledgerBlocks = blocks.filter(
    (b) => b.status !== "PLANNED" && b.approval_status !== "DRAFT"
  );

  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");
  const [resetting, setResetting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [executiveNotes, setExecutiveNotes] = useState<Record<string, string>>({});
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Modal State for "Why this task?"
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);

  const handleMasterSanction = async (blockId: string, action: "APPROVE" | "REJECT") => {
    setActioningId(blockId);
    try {
      await api.approveBlock({
        block_id: blockId,
        action,
        approved_by: "Divisional Operations Manager (DOM / Bhopal)",
        notes: executiveNotes[blockId] || `Executive sanction: ${action} under Divisional Policy`,
      });
      await invalidateCanonicalData();
    } catch (err) {
      console.error("Master sanction failed", err);
    } finally {
      setActioningId(null);
    }
  };

  const handleRegenerateCanonical = async () => {
    setResetting(true);
    try {
      const res = await api.regenerateCanonicalBlocks();
      setResetMessage(res.message || "50 planning blocks regenerated successfully.");
      // Invalidate canonical data cache — useQuery hooks will automatically refetch
      await invalidateCanonicalData();
      setTimeout(() => setResetMessage(null), 6000);
    } catch (err: any) {
      console.error("Failed to regenerate planning blocks:", err);
      const errMsg = err?.detail || err?.message || String(err);
      setResetMessage("Error regenerating blocks: " + errMsg);
      setTimeout(() => setResetMessage(null), 6000);
    } finally {
      setResetting(false);
    }
  };

  const delayedTrains = trains.filter((t: TrainMovementData) => t.delay_minutes > 10);
  const pendingBlocks = ledgerBlocks.filter((b: BlockData) => b.approval_status === "PENDING" || b.status === "PENDING_APPROVAL");
  const freightTrains = trains.filter((t: TrainMovementData) => t.service_type === "FREIGHT" || t.train_type === "FREIGHT");
  const onTimeCount = trains.filter((t: TrainMovementData) => t.delay_minutes <= 15).length;
  const punctualityPct = trains.length > 0 ? ((onTimeCount / trains.length) * 100).toFixed(1) : "92.4";

  const datasetFingerprint = prioData?.dataset_fingerprint || dashData?.dataset_fingerprint || "CANON-50-BLOCK";

  // Filter tasks based on tier selector
  const filteredTasks = priorityTasks.filter((t: any) => {
    if (selectedTierFilter === "ALL") return true;
    return t.priority_tier === selectedTierFilter;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#1e1b4b] via-[#2e1065] to-[#0f172a] rounded-2xl p-6 text-white shadow-md border border-purple-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-400 text-purple-950 font-mono">
                Central Operations Control Desk
              </span>
              <span className="text-xs text-purple-200 font-mono">Bhopal Division · SIH 26027</span>
            </div>
            <h1 className="text-2xl font-black mt-1.5 text-white flex items-center space-x-3 tracking-tight">
              <BarChart3 className="w-6 h-6 text-purple-300" />
              <span>KrayaSetu AI — Maintenance Decision Control</span>
            </h1>
            <p className="text-xs text-purple-200 mt-1 max-w-3xl leading-relaxed">
              Supervising divisional punctuality KPIs, section utilization, S-R-C-A-O priority ranking, and bounded CP-SAT schedule proposals for Bhopal Division.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProvenanceBadge type="REAL_PUBLIC" />

            {/* Regenerate 50 Blocks Button */}
            <button
              onClick={handleRegenerateCanonical}
              disabled={resetting}
              className={`px-3.5 py-1.5 bg-purple-700/80 hover:bg-purple-600 text-purple-100 text-xs font-bold rounded-lg border border-purple-400/50 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                resetting ? "opacity-60 cursor-not-allowed" : ""
              }`}
              title="Generate a new validated 50-block planning scenario"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin text-purple-300" : ""}`} />
              <span>{resetting ? "Validating & Promoting..." : "Regenerate 50 Blocks"}</span>
            </button>
            <Link
              to="/baseline-comparison"
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer border border-emerald-400/40"
              title="View Independent Baseline vs Co-located Optimizer Comparison"
            >
              <GitMerge className="w-4 h-4 text-emerald-200" />
              <span>Downtime Saved: {hoursSaved.toFixed(1)}h (-{pctReduction.toFixed(0)}%)</span>
            </Link>
            <Link
              to="/marey-diagram"
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer border border-amber-400/40"
              title="Launch Live Indian Railways Marey (train-time-distance) Diagram"
            >
              <TrendingUp className="w-4 h-4 text-amber-200" />
              <span>Live Marey Diagram</span>
            </Link>
            <Link
              to="/block-planner"
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-sky-200" />
              <span>Launch 8.0s CP-SAT Solver</span>
            </Link>
          </div>
        </div>

        {/* Demo Notification Toast */}
        {resetMessage && (
          <div
            className={`mt-4 p-2.5 rounded-lg text-xs flex items-center space-x-2 animate-fadeIn ${
              resetMessage.startsWith("Error")
                ? "bg-rose-950/80 border border-rose-500/60 text-rose-200"
                : "bg-emerald-950/80 border border-emerald-500/60 text-emerald-200"
            }`}
          >
            {resetMessage.startsWith("Error") ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{resetMessage}</span>
          </div>
        )}

        {/* 2. Interactive Workflow Stepper */}
        <div className="mt-5 pt-4 border-t border-purple-800/60">
          <div className="text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-2 font-bold flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Controller Demonstration Operational Flow (Phases 1 → 9)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-purple-900/80 border border-purple-400/80 rounded-lg p-2.5 shadow-xs flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-purple-400 text-purple-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0">1</span>
              <div>
                <div className="font-bold text-white text-[11px]">1. ANALYZE</div>
                <div className="text-[10px] text-purple-200">S-R-C-A-O Priority Queue</div>
              </div>
            </div>
            <Link
              to="/block-planner"
              className="bg-slate-900/60 hover:bg-purple-900/40 border border-slate-700/60 hover:border-purple-400/60 rounded-lg p-2.5 transition-all flex items-center space-x-2 group"
            >
              <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-[11px] flex-shrink-0 group-hover:bg-sky-500 group-hover:text-white">2</span>
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white text-[11px]">2. OPTIMIZE</div>
                <div className="text-[10px] text-slate-400">8.0s CP-SAT Window</div>
              </div>
            </Link>
            <Link
              to="/block-planner"
              className="bg-slate-900/60 hover:bg-purple-900/40 border border-slate-700/60 hover:border-purple-400/60 rounded-lg p-2.5 transition-all flex items-center space-x-2 group"
            >
              <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-[11px] flex-shrink-0 group-hover:bg-sky-500 group-hover:text-white">3</span>
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white text-[11px]">3. REVIEW</div>
                <div className="text-[10px] text-slate-400">Explainable Reasoning</div>
              </div>
            </Link>
            <Link
              to="/coordination"
              className="bg-slate-900/60 hover:bg-purple-900/40 border border-slate-700/60 hover:border-purple-400/60 rounded-lg p-2.5 transition-all flex items-center space-x-2 group"
            >
              <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-[11px] flex-shrink-0 group-hover:bg-purple-400 group-hover:text-purple-950">4</span>
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white text-[11px]">4. COORDINATE</div>
                <div className="text-[10px] text-slate-400">Multi-Dept Joint Desk</div>
              </div>
            </Link>
            <Link
              to="/coordination"
              className="bg-slate-900/60 hover:bg-purple-900/40 border border-slate-700/60 hover:border-purple-400/60 rounded-lg p-2.5 transition-all flex items-center space-x-2 group"
            >
              <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-[11px] flex-shrink-0 group-hover:bg-emerald-400 group-hover:text-emerald-950">5</span>
              <div>
                <div className="font-bold text-slate-200 group-hover:text-white text-[11px]">5. SELECT</div>
                <div className="text-[10px] text-slate-400">Operational Planning</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* 2.5 Executive Impact Banner: Total Asset Downtime Saved */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 border border-emerald-500/40 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/5 -skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center space-x-1">
                <GitMerge className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                <span>CROSS-DEPARTMENT COORDINATION IMPACT</span>
              </span>
              <span className="text-xs text-slate-300 font-mono">P.Way · TRD · S&T Shared Corridor Windows</span>
              <ProvenanceBadge type="SYNTHETIC" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-baseline gap-3">
              <span>{hoursSaved.toFixed(1)} Hours Asset Downtime Saved</span>
              <span className="text-emerald-400 text-xl sm:text-2xl font-black">
                (-{pctReduction.toFixed(1)}% Track Possession Reduction)
              </span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Consolidated <strong>{baselineWindows} uncoordinated departmental requests</strong> ({baselineHours.toFixed(1)}h) down to <strong>{optimizedBlocks} multi-department blocks</strong> ({optimizedHours.toFixed(1)}h). Avoided <strong>{windowsEliminated} separate track possession outages</strong> and achieved <strong>{shadowSavingsPct.toFixed(1)}% downtime reduction</strong> across shared corridor sections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-800/80 border border-rose-500/40 rounded-xl p-2.5">
                <div className="text-[10px] uppercase text-rose-400 font-bold">Uncoordinated Baseline</div>
                <div className="text-lg font-black text-rose-300">{baselineHours.toFixed(1)}h</div>
                <div className="text-[10px] text-slate-400">{baselineWindows} Windows</div>
              </div>
              <div className="bg-slate-800/80 border border-emerald-500/40 rounded-xl p-2.5">
                <div className="text-[10px] uppercase text-emerald-400 font-bold">KrayaSetu AI Plan</div>
                <div className="text-lg font-black text-emerald-300">{optimizedHours.toFixed(1)}h</div>
                <div className="text-[10px] text-slate-400">{optimizedBlocks} Blocks</div>
              </div>
            </div>

            <Link
              to="/baseline-comparison"
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer group"
            >
              <span>View Side-by-Side Comparison</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Operational KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3.5 border border-emerald-300 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-emerald-800 flex items-center justify-between">
            <span>Downtime Saved</span>
            <GitMerge className="w-3 h-3 text-emerald-600" />
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {hoursSaved.toFixed(1)}h
          </div>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">
            -{pctReduction.toFixed(1)}% ({windowsEliminated} Outages Avoided)
          </span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-slate-500">Tasks Analyzed</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {dashSummary?.tasks_analyzed ?? priorityTasks.length}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Bhopal Division</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-red-200 bg-red-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-red-600">Critical Tier</span>
          <div className="text-xl font-black text-red-700 mt-1">
            {dashSummary?.priority_distribution?.CRITICAL ?? priorityTasks.filter((t: any) => t.priority_tier === "CRITICAL").length}
          </div>
          <span className="text-[10px] text-red-600 font-mono truncate block">
            {dashSummary?.critical_task
              ? `${dashSummary.critical_task.id} (${Number(dashSummary.critical_task.score).toFixed(1)})`
              : (priorityTasks.find((t: any) => t.priority_tier === "CRITICAL")
                ? `${priorityTasks.find((t: any) => t.priority_tier === "CRITICAL")?.task_id} (${Number(priorityTasks.find((t: any) => t.priority_tier === "CRITICAL")?.total_score).toFixed(1)})`
                : "Active")}
          </span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-amber-700">High Tier</span>
          <div className="text-xl font-black text-amber-700 mt-1">
            {dashSummary?.priority_distribution?.HIGH ?? priorityTasks.filter((t: any) => t.priority_tier === "HIGH").length}
          </div>
          <span className="text-[10px] text-amber-600 font-mono">Score 70.0 – 89.9</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-blue-200 bg-blue-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-blue-700">Medium Tier</span>
          <div className="text-xl font-black text-blue-700 mt-1">
            {dashSummary?.priority_distribution?.MEDIUM ?? priorityTasks.filter((t: any) => t.priority_tier === "MEDIUM").length}
          </div>
          <span className="text-[10px] text-blue-600 font-mono">Score 45.0 – 69.9</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-slate-500">Low Tier</span>
          <div className="text-xl font-black text-slate-700 mt-1">
            {dashSummary?.priority_distribution?.LOW ?? priorityTasks.filter((t: any) => t.priority_tier === "LOW").length}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Routine Upkeep</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-slate-500">Blocks Proposed</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {ledgerBlocks.length}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {ledgerBlocks.filter((b) => b.status === "APPROVED" || b.status === "SANCTIONED").length} Sanctioned
          </span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase font-mono text-emerald-700">Tasks Scheduled</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {ledgerBlocks.filter((b) => b.status === "SCHEDULED" || b.status === "APPROVED" || b.status === "SANCTIONED").length}
          </div>
          <span className="text-[10px] text-emerald-600 font-mono">CP-SAT Optimized</span>
        </div>
      </div>

      {/* 4. Priority Tasks & Network Decision Center */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-50 via-purple-50/30 to-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-purple-100 text-purple-800">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                OPERATIONAL PRIORITY QUEUE — S-R-C-A-O INTELLIGENCE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-900">
                {dashSummary?.tasks_analyzed ?? priorityTasks.length} Tasks Evaluated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Deterministic scoring formula: <span className="font-mono font-semibold text-slate-700">0.35·Severity + 0.25·EscalationRisk + 0.20·Criticality + 0.10·Age + 0.10·Opportunity</span>
            </p>
          </div>

          {/* Tier Filters */}
          <div className="flex items-center space-x-1.5 self-start md:self-auto bg-slate-100 p-1 rounded-lg">
            {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTierFilter(tier)}
                className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                  selectedTierFilter === tier
                    ? "bg-white text-purple-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Rank & Task</th>
                <th className="py-2.5 px-3">Corridor & Asset</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">S-R-C-A-O Score</th>
                <th className="py-2.5 px-3">Factor Breakdown (S / R / C / A / O)</th>
                <th className="py-2.5 px-3 text-right">Decision Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredTasks.slice(0, 15).map((task: any, idx: number) => {
                const isTask0001 = task.task_id === "TASK-0001";
                const isCritical = task.priority_tier === "CRITICAL";
                const isHigh = task.priority_tier === "HIGH";

                return (
                  <tr
                    key={task.task_id}
                    className={`transition-colors ${
                      isTask0001
                        ? "bg-red-50/70 hover:bg-red-100/60 border-l-4 border-l-red-600 font-medium"
                        : isCritical
                        ? "bg-red-50/30 hover:bg-red-50/60 border-l-4 border-l-red-500"
                        : isHigh
                        ? "hover:bg-amber-50/40 border-l-4 border-l-amber-400"
                        : "hover:bg-slate-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Rank & ID */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono text-xs font-black ${
                            isTask0001 ? "text-red-700" : isHigh ? "text-amber-700" : "text-slate-600"
                          }`}
                        >
                          #{task.priority_rank || idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900">{task.task_id}</span>
                          {isTask0001 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white animate-pulse">
                              #1 TOP CRITICAL SAFETY HAZARD
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Corridor & Asset */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{task.corridor_id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {task.track_name} · {formatDistanceKm(task.location_km)}
                      </div>
                    </td>

                    {/* Dept */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {task.department_id || "P.Way"}
                      </span>
                    </td>

                    {/* S-R-C-A-O Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black font-mono text-slate-900">
                          {Number(task.priority_score).toFixed(2)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isCritical
                              ? "bg-red-600 text-white"
                              : isHigh
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : task.priority_tier === "MEDIUM"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority_tier}
                        </span>
                      </div>
                    </td>

                    {/* Factor Breakdown */}
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700" title="Severity (35%)">
                          S: {task.components?.severity?.score ?? "--"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700" title="Escalation Risk (25%)">
                          R: {task.components?.escalation_risk?.score ?? "--"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700" title="Criticality (20%)">
                          C: {task.components?.criticality?.score ?? "--"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700" title="Age (10%)">
                          A: {task.components?.age?.score ?? "--"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700" title="Opportunity (10%)">
                          O: {task.components?.opportunity?.score ?? "--"}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        <button
                          onClick={() => setModalTaskId(task.task_id)}
                          className="px-2.5 py-1.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                          title="Explain Why this task was prioritized"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Why this task?</span>
                        </button>
                        <Link
                          to={`/block-planner?taskId=${task.task_id}`}
                          className="px-2.5 py-1.5 rounded bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer shadow-xs"
                          title={`Plan Maintenance Block for ${task.task_id}`}
                        >
                          <Calendar className="w-3.5 h-3.5 text-sky-200" />
                          <span>Plan Block →</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Optimizer Call to Action */}
        <div className="p-4 bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-sky-700 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900">
                Ready to schedule high-priority maintenance into real railway timetable gaps?
              </div>
              <div className="text-[11px] text-slate-600">
                Feed prioritized tasks (including TASK-0001) to the 8.0s bounded OR-Tools CP-SAT solver.
              </div>
            </div>
          </div>
          <Link
            to="/block-planner"
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer flex-shrink-0"
          >
            <span>Generate Optimization Plan (8.0s)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 5. Main Split: Pending Sanctions (Left) & Delayed Passenger Surveillance (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Pending Sanctions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-800 text-xs tracking-wide">
                  EXECUTIVE BLOCK SANCTIONS AWAITING DOM CLEARANCE ({pendingBlocks.length})
                </span>
              </div>
              <ProvenanceBadge type="DERIVED" size="sm" />
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">Loading sanction requests...</div>
            ) : pendingBlocks.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <div>No pending blocks requiring master sanction.</div>
                <div className="text-[11px] text-slate-400">
                  Generate blocks via the CP-SAT Optimizer in Block Planner or review Joint Coordination.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingBlocks.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-slate-900 text-sm">{b.id}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                          {b.protection_type}
                        </span>
                        {b.power_isolation_required && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center space-x-1">
                            <Zap className="w-3 h-3" />
                            <span>25kV ISO</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">Dept: {b.proposed_by}</span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      Corridor: {b.corridor_id} · Track: {b.track_name} ({formatDistanceKm(b.location_km)}) · Slot: {b.requested_start_time} - {b.requested_end_time} ({b.duration_mins}m)
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                      {b.conflict_summary || "Inter-departmental block proposed for infrastructure safety."}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="DOM executive remarks..."
                        value={executiveNotes[b.id] || ""}
                        onChange={(e) => setExecutiveNotes({ ...executiveNotes, [b.id]: e.target.value })}
                        className="text-xs p-1.5 border border-slate-300 rounded bg-white flex-1"
                      />
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleMasterSanction(b.id, "REJECT")}
                          disabled={actioningId === b.id}
                          className="px-3 py-1.5 rounded border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleMasterSanction(b.id, "APPROVE")}
                          disabled={actioningId === b.id}
                          className="px-3.5 py-1.5 rounded bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Sanction Block</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Delayed Passenger Surveillance & Freight Regulation (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800 text-xs tracking-wide">
                  PASSENGER DELAY SURVEILLANCE ({delayedTrains.length})
                </span>
              </div>
              <ProvenanceBadge type="REAL_PUBLIC" size="sm" />
            </div>

            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {delayedTrains.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">All passenger trains operating within schedule tolerances.</div>
              ) : (
                delayedTrains.map((t) => (
                  <div key={t.train_number} className="p-3 hover:bg-slate-50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-slate-900">{t.train_number} - {t.train_name}</span>
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800 text-[10px]">
                        +{t.delay_minutes}m delay
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Section: {t.current_section_id || t.current_location || "Bhopal Section"} · Speed: {t.speed_kmph} km/h
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 font-mono">
                      Priority Rank: {t.priority} ({t.service_type || t.train_type})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Freight Regulation Strategies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Freight Regulation & Precedence Policy</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When high-priority passenger services (e.g. 12002 Shatabdi, 12626 Kerala) experience downstream sectional delays, freight rakes on loop tracks (Vidisha/Gulabganj) are held to prevent compounding bottlenecks.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Active Regulated Freight Rakes:</span>
              <span className="font-mono font-bold text-slate-800">
                {freightTrains.filter(f => f.status === "REGULATED").length} of {freightTrains.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Complete Divisional Blocks Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#0b2545] text-white">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-slate-900 text-sm tracking-wide uppercase font-mono">
                  Divisional Blocks Ledger
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {ledgerBlocks.length} Active Records
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Central register of all scheduled, proposed, approved, and selected possession windows across Bhopal Division
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/block-planner"
              className="px-3 py-1.5 bg-[#0b2545] hover:bg-[#134074] text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-200" />
              <span>Open Block Planner →</span>
            </Link>
          </div>
        </div>

        {ledgerBlocks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-bold text-slate-700">0 Divisional Blocks Currently Registered</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Use "Plan Block →" on any Priority Queue item above or launch the CP-SAT Optimizer in Block Planner to schedule maintenance blocks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Block ID & Priority</th>
                  <th className="py-2.5 px-3">Originating Task</th>
                  <th className="py-2.5 px-3">Corridor & Section</th>
                  <th className="py-2.5 px-3">Track & Location</th>
                  <th className="py-2.5 px-3">Slot (IST)</th>
                  <th className="py-2.5 px-3">Department(s)</th>
                  <th className="py-2.5 px-3">Conflict Status</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {ledgerBlocks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-slate-900">{b.id}</div>
                      {b.task_priority && (
                        <span className={`text-[10px] font-bold uppercase ${
                          b.task_priority === "CRITICAL" ? "text-red-700" : b.task_priority === "HIGH" ? "text-amber-700" : "text-slate-500"
                        }`}>
                          {b.task_priority} Priority
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {b.task_id ? (
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {b.task_id}
                          </span>
                          <div className="text-[11px] text-slate-600 truncate max-w-[200px]" title={b.task_title || ""}>
                            {b.task_title || "Track Maintenance Task"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Direct Proposal</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{b.corridor_id}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.section_name || b.section_id}</div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="text-slate-800 font-semibold">{b.track_name}</div>
                      <div className="text-[11px] text-slate-500">{formatDistanceKm(b.location_km)}</div>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-slate-900">{b.requested_start_time} – {b.requested_end_time}</div>
                      <div className="text-[11px] text-slate-500">{b.duration_mins} mins</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {b.participating_departments || b.department_id || "PWAY"}
                        </span>
                        {b.power_isolation_required && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                            <Zap className="w-2.5 h-2.5" />
                            <span>TRD OHE ISO</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        b.conflict_status === "CONFLICT"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : b.conflict_status === "POTENTIAL CONFLICT"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        {b.conflict_status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        b.status === "PROPOSED"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : b.status === "PENDING_APPROVAL"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : b.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : b.status === "SELECTED"
                          ? "bg-sky-50 text-sky-800 border-sky-200"
                          : b.status === "REJECTED"
                          ? "bg-red-50 text-red-800 border-red-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/block-planner"
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#0b2545] hover:text-white text-slate-700 text-xs font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer border border-slate-300"
                      >
                        <span>Manage →</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Block Reasoning Modal for "Why this task?" */}
      <BlockReasoningModal
        isOpen={!!modalTaskId}
        onClose={() => setModalTaskId(null)}
        taskId={modalTaskId || undefined}
      />
    </div>
  );
};
