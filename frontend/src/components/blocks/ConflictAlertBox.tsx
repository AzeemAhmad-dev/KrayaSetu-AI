import React from "react";
import { ProvenanceBadge } from "../common/ProvenanceBadge";
import { AlertOctagon, AlertTriangle, CheckCircle, Clock, Zap, ArrowRight } from "lucide-react";

interface Props {
  conflictStatus: "NO CONFLICT" | "CONFLICT" | "POTENTIAL CONFLICT" | "HIGH OPERATIONAL RISK";
  summary: string;
  conflictingPassengerTrains?: any[];
  freightImpacts?: any[];
  alternativeWindow?: {
    suggested_start_time: string;
    suggested_end_time: string;
    duration_mins: number;
    reason: string;
  } | null;
  onApplyAlternative?: (start: string, end: string) => void;
}

export const ConflictAlertBox: React.FC<Props> = ({
  conflictStatus,
  summary,
  conflictingPassengerTrains = [],
  freightImpacts = [],
  alternativeWindow,
  onApplyAlternative,
}) => {
  const isConflict = conflictStatus === "CONFLICT" || conflictStatus === "HIGH OPERATIONAL RISK";
  const isPotential = conflictStatus === "POTENTIAL CONFLICT";

  return (
    <div
      className={`rounded-lg border p-4 text-xs transition-all ${
        isConflict
          ? "bg-red-50/70 border-red-300 text-red-950"
          : isPotential
          ? "bg-amber-50/70 border-amber-300 text-amber-950"
          : "bg-emerald-50/70 border-emerald-300 text-emerald-950"
      }`}
    >
      {/* Header Status */}
      <div className="flex items-center justify-between pb-2 border-b border-current/20 mb-3">
        <div className="flex items-center space-x-2">
          {isConflict ? (
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0" />
          ) : isPotential ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}
          <span className="font-bold text-sm tracking-wide font-mono">
            {conflictStatus}
          </span>
        </div>
        <ProvenanceBadge type="DERIVED" size="sm" />
      </div>

      {/* Rationale Explanation */}
      <p className="leading-relaxed font-medium mb-3">{summary}</p>

      {/* Conflicting Trains List */}
      {conflictingPassengerTrains.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <div className="font-bold uppercase tracking-wider text-[11px] text-red-800">
            Directly Impacted Passenger Services:
          </div>
          {conflictingPassengerTrains.map((pt, i) => (
            <div
              key={i}
              className="bg-white p-2 rounded border border-red-200 text-[11px] text-slate-800 shadow-2xs"
            >
              <div className="flex items-center justify-between font-bold">
                <span className="font-mono text-red-700">{pt.train_number} · {pt.train_name}</span>
                <span className="text-red-600 font-mono">Estimated {pt.estimated_time}</span>
              </div>
              <p className="text-slate-600 mt-0.5">{pt.reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* Freight Regulating Impacts */}
      {freightImpacts.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <div className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
            Synthetic Freight Regulation / Loop Holding:
          </div>
          {freightImpacts.map((ft, i) => (
            <div
              key={i}
              className="bg-white p-2 rounded border border-amber-200 text-[11px] text-slate-800 shadow-2xs"
            >
              <div className="flex items-center justify-between font-bold">
                <span className="font-mono text-amber-800">{ft.train_number} ({ft.cargo_type} Rake)</span>
                <span className="text-amber-700 font-mono">ETA {ft.estimated_time}</span>
              </div>
              <p className="text-slate-600 mt-0.5">{ft.reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* CP-SAT Alternative Recommended Window */}
      {alternativeWindow && (
        <div className="mt-3 p-2.5 bg-white rounded border border-sky-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-1.5 text-sky-900 font-bold text-[11px]">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Recommended Conflict-Free Alternative (CP-SAT):</span>
            </div>
            <div className="font-mono text-xs font-bold text-sky-700 mt-0.5">
              {alternativeWindow.suggested_start_time} — {alternativeWindow.suggested_end_time} ({alternativeWindow.duration_mins} mins)
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{alternativeWindow.reason}</p>
          </div>

          {onApplyAlternative && (
            <button
              onClick={() =>
                onApplyAlternative(
                  alternativeWindow.suggested_start_time,
                  alternativeWindow.suggested_end_time
                )
              }
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1 flex-shrink-0"
            >
              <span>Apply Recommended Window</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
