import React from "react";
import { ProvenanceType } from "../../types";
import { Database, Cpu, CheckCircle2, Activity, Sparkles } from "lucide-react";

interface Props {
  type: ProvenanceType | string;
  label?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  showTooltip?: boolean;
}

export const ProvenanceBadge: React.FC<Props> = ({
  type,
  label,
  size = "sm",
  className = "",
  showTooltip = true,
}) => {
  const normType = String(type || "").toUpperCase();

  let badgeColor = "bg-slate-100 text-slate-700 border-slate-300";
  let defaultText = "DATA SOURCE";
  let tooltipText = "System operational dataset";
  let icon = <Database className="w-3 h-3" />;

  if (normType.includes("REAL") || normType === "REAL_PUBLIC") {
    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm";
    defaultText = "REAL: WCR Published Timetable";
    tooltipText = "Published Indian Railways timetable schedule from West Central Railway (Bhopal Division). Authentic train numbers & timings.";
    icon = <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />;
  } else if (normType.includes("SYNTH") || normType === "SYNTHETIC" || normType.includes("TMS") || normType.includes("SMMS")) {
    badgeColor = "bg-amber-50 text-amber-800 border-amber-300 shadow-sm";
    defaultText = "SYNTHESIZED: TMS Defect Backlog (IR Norms)";
    tooltipText = "Transparently synthesized from Indian Railways maintenance-frequency norms (TMS/SMMS/TDMS are internal Ministry systems with no public API).";
    icon = <Cpu className="w-3 h-3 text-amber-600 shrink-0" />;
  } else if (normType.includes("SIMULAT") || normType === "SIMULATED") {
    badgeColor = "bg-sky-50 text-sky-800 border-sky-300 shadow-sm";
    defaultText = "SIMULATED: Section Train Progression";
    tooltipText = "Simulated train movement physics according to published timetable speeds and block signal spacing.";
    icon = <Activity className="w-3 h-3 text-sky-600 shrink-0" />;
  } else if (normType.includes("DERIVED") || normType === "ESTIMATED") {
    badgeColor = "bg-purple-50 text-purple-800 border-purple-300 shadow-sm";
    defaultText = "DERIVED: CP-SAT Optimization";
    tooltipText = "Mathematically proven possession window derived by Google OR-Tools CP-SAT multi-pass solver.";
    icon = <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />;
  }

  const displayText = label || defaultText;

  const sizeClasses =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5 gap-1 font-medium"
      : size === "md"
      ? "text-xs px-2.5 py-1 gap-1.5 font-semibold"
      : "text-[11px] px-2 py-0.5 gap-1.5 font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-tight ${sizeClasses} ${badgeColor} ${className}`}
      title={showTooltip ? tooltipText : undefined}
    >
      {icon}
      <span>{displayText}</span>
    </span>
  );
};
