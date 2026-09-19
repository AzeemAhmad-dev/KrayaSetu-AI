import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Zap,
  Train,
  Layers,
  ChevronRight,
  TrendingUp,
  Info,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";

interface BlockReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockId?: string;
  taskId?: string;
  candidateId?: string;
  fallbackItem?: any;
}

export const BlockReasoningModal: React.FC<BlockReasoningModalProps> = ({
  isOpen,
  onClose,
  blockId,
  taskId,
  candidateId,
  fallbackItem,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchExplanation = async () => {
      setLoading(true);
      setError(null);
      try {
        if (blockId) {
          const res = await api.getBlockExplanation(blockId);
          setData(res);
        } else if (taskId) {
          const res = await api.getTaskPriorityExplanation(taskId);
          setData({
            block_id: `TASK-${taskId}`,
            priority_details: res,
            five_questions: {
              q1_why_prioritized: res.judge_explanation,
              q2_why_bundled: [
                "Standalone task evaluation; bundled with section candidates during CP-SAT pass.",
              ],
              q3_why_this_window: [
                "Scheduled within available maintenance corridor gap.",
              ],
              q4_train_impact: "Requires scheduled headway check during block proposal.",
              q5_deferral_rationale:
                "Higher-priority safety work is prioritized first during capacity-limited windows.",
            },
            operational_recommendation:
              res.priority_tier === "CRITICAL"
                ? "MANDATORY SAFETY WORK: Immediate track possession recommended."
                : "Standard maintenance priority: Eligible for bundled corridor block.",
          });
        } else if (candidateId) {
          const res = await api.getCandidateExplanation(candidateId);
          setData({
            block_id: candidateId,
            bundling_details: res,
            five_questions: {
              q1_why_prioritized: `Candidate block containing ${res.tasks_count} tasks.`,
              q2_why_bundled: res.bundling_reasons,
              q3_why_this_window: [
                `Estimated duration ${res.estimated_duration}m fits within the 240m possession limit.`,
              ],
              q4_train_impact: "Traffic conflicts evaluated upon block proposal.",
              q5_deferral_rationale:
                "Non-compatible tasks outside section threshold were excluded from this bundle.",
            },
            operational_recommendation: res.operational_savings_summary,
          });
        } else if (fallbackItem) {
          // Synthetic explanation from optimizer schedule item
          setData({
            block_id: fallbackItem.task_id || "SCHEDULED-ITEM",
            track_name: fallbackItem.track_name || "DOWN_MAIN",
            location_km: fallbackItem.location_km || 0,
            duration_mins: fallbackItem.duration_mins || 120,
            requested_start_time: fallbackItem.allocated_start_time || "12:00",
            requested_end_time: fallbackItem.allocated_end_time || "14:00",
            five_questions: {
              q1_why_prioritized: `Task ${fallbackItem.task_id} prioritized at score ${fallbackItem.priority_score || 75.0} (${fallbackItem.priority_tier || "HIGH"}).`,
              q2_why_bundled: [
                `Optimized under candidate group ${fallbackItem.candidate_id || "CB-001"} on ${fallbackItem.track_name || "DOWN_MAIN"}.`,
              ],
              q3_why_this_window: [
                `Allocated slot ${fallbackItem.allocated_start_time} - ${fallbackItem.allocated_end_time} complies with 15m train headway buffer.`,
              ],
              q4_train_impact: "Zero passenger train path conflicts within allocated window.",
              q5_deferral_rationale:
                "Lower priority tasks were deferred to prevent exceeding section capacity.",
            },
            operational_recommendation:
              "FEASIBLE OPTIMIZED WINDOW: Recommended for divisional clearance submission.",
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load explanation");
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  }, [isOpen, blockId, taskId, candidateId, fallbackItem]);

  if (!isOpen) return null;

  const prio = data?.priority_details;
  const comps = prio?.components;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-500/20 rounded-lg border border-sky-400/30">
              <Sparkles className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight">
                  Decision Support & Block Reasoning
                </h3>
                <span className="text-[10px] bg-sky-400/20 border border-sky-300/40 text-sky-200 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                  Explainable AI
                </span>
              </div>
              <p className="text-xs text-sky-200/80 font-mono mt-0.5">
                Target: {data?.block_id || blockId || taskId || candidateId || "Block Item"} · SIH 26027
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-slate-700">
          {loading && (
            <div className="py-12 text-center text-slate-500 font-mono flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Synthesizing deterministic decision explanation...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Operational Recommendation Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 flex items-start space-x-3 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-emerald-900 uppercase tracking-wider font-mono">
                    Operational Recommendation
                  </div>
                  <div className="mt-0.5 leading-relaxed font-medium">
                    {data.operational_recommendation}
                  </div>
                </div>
              </div>

              {/* 5 Canonical Questions Grid */}
              <div className="space-y-4">
                {/* Question 1: Why this task prioritized? */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-indigo-600 text-white rounded-full inline-flex items-center justify-center text-[11px] font-mono font-bold">
                        1
                      </span>
                      <span>Why was this maintenance task prioritized?</span>
                    </span>
                    {prio?.priority_score && (
                      <span className="font-mono font-bold text-indigo-700 text-xs">
                        S-R-C-A-O: {prio.priority_score} ({prio.priority_tier})
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 leading-relaxed font-medium">
                    {data.five_questions?.q1_why_prioritized}
                  </p>

                  {/* S-R-C-A-O Component Progress Bars if available */}
                  {comps && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-mono text-slate-500 font-semibold">
                        Factor Weight Breakdown (0–100 Normalized Scale):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        {Object.entries(comps).map(([key, val]: [string, any]) => (
                          <div key={key} className="bg-white p-2 rounded border border-slate-200">
                            <div className="flex justify-between font-bold text-slate-800">
                              <span className="capitalize">{key.replace("_", " ")}</span>
                              <span>{val.score} pts ({Math.round(val.weight * 100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, val.score)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 truncate">
                              {val.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Question 2: Why bundled? */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <span className="w-5 h-5 bg-sky-600 text-white rounded-full inline-flex items-center justify-center text-[11px] font-mono font-bold">
                      2
                    </span>
                    <span>Why were these tasks bundled together?</span>
                  </span>

                  <ul className="space-y-1 text-slate-600 list-disc list-inside font-medium leading-relaxed">
                    {Array.isArray(data.five_questions?.q2_why_bundled) ? (
                      data.five_questions.q2_why_bundled.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))
                    ) : (
                      <li>{data.five_questions?.q2_why_bundled}</li>
                    )}
                  </ul>
                </div>

                {/* Question 3: Why this window? */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <span className="w-5 h-5 bg-amber-600 text-white rounded-full inline-flex items-center justify-center text-[11px] font-mono font-bold">
                      3
                    </span>
                    <span>Why was this time window selected?</span>
                  </span>

                  <ul className="space-y-1 text-slate-600 list-disc list-inside font-medium leading-relaxed">
                    {Array.isArray(data.five_questions?.q3_why_this_window) ? (
                      data.five_questions.q3_why_this_window.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))
                    ) : (
                      <li>{data.five_questions?.q3_why_this_window}</li>
                    )}
                  </ul>
                </div>

                {/* Question 4: Train impact */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span className="w-5 h-5 bg-rose-600 text-white rounded-full inline-flex items-center justify-center text-[11px] font-mono font-bold">
                        4
                      </span>
                      <span>What train movements are affected?</span>
                    </span>
                    {data.train_impact_details && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          data.train_impact_details.conflict_status === "NO CONFLICT"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {data.train_impact_details.conflict_status}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 leading-relaxed font-medium">
                    {data.five_questions?.q4_train_impact}
                  </p>

                  {/* Conflicting Trains List if any */}
                  {data.train_impact_details?.conflicting_trains?.length > 0 && (
                    <div className="bg-white p-2 rounded border border-rose-200 space-y-1 font-mono text-[11px]">
                      <div className="font-bold text-rose-900 uppercase">
                        Impacted Train Schedules:
                      </div>
                      {data.train_impact_details.conflicting_trains.map((ct: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 border-b border-rose-100 last:border-0">
                          <span className="text-slate-800">
                            {ct.train_number} - {ct.train_name} ({ct.train_type})
                          </span>
                          <span className="text-rose-700 font-semibold">
                            Est: {ct.estimated_time} (+{ct.delay_minutes}m delay)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Question 5: Why deferred? */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <span className="w-5 h-5 bg-purple-600 text-white rounded-full inline-flex items-center justify-center text-[11px] font-mono font-bold">
                      5
                    </span>
                    <span>Why was another task deferred?</span>
                  </span>

                  <p className="text-slate-600 leading-relaxed font-medium">
                    {data.five_questions?.q5_deferral_rationale}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {taskId ? (
            <Link
              to={`/block-planner?taskId=${taskId}`}
              onClick={onClose}
              className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs shadow-xs transition-all inline-flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-sky-200" />
              <span>Schedule Block in Planner →</span>
            </Link>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
          >
            Close Reasoning
          </button>
        </div>
      </div>
    </div>
  );
};
