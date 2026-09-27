import React from "react";
import {
  ShieldCheck,
  Sparkles,
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Cpu,
  Layers,
  Zap,
  Hammer,
  Radio,
  Train,
  Building2,
  UserCheck
} from "lucide-react";
import { cn } from "../../lib/utils";

// ============================================================================
// BADGE FAMILY 1: DEPARTMENT BADGES
// ============================================================================
export type DepartmentType = "COA" | "PWAY" | "TRD" | "SNT" | "OPERATIONS" | "CIVIL" | "ELECTRICAL" | "SIGNAL";

export interface DepartmentBadgeProps {
  department: DepartmentType | string;
  size?: "sm" | "default";
  showIcon?: boolean;
  className?: string;
}

export const DepartmentBadge: React.FC<DepartmentBadgeProps> = ({
  department,
  size = "default",
  showIcon = true,
  className,
}) => {
  const deptKey = department.toUpperCase();

  let styles = "bg-[var(--dept-coa-bg)] text-[var(--dept-coa-text)] border-[var(--dept-coa-border)]";
  let label = "COA · Operations";
  let Icon = Layers;

  if (deptKey.includes("PWAY") || deptKey.includes("CIVIL") || deptKey.includes("TRACK")) {
    styles = "bg-[var(--dept-pway-bg)] text-[var(--dept-pway-text)] border-[var(--dept-pway-border)]";
    label = "P.Way · Civil Track";
    Icon = Hammer;
  } else if (deptKey.includes("TRD") || deptKey.includes("ELEC") || deptKey.includes("OHE")) {
    styles = "bg-[var(--dept-trd-bg)] text-[var(--dept-trd-text)] border-[var(--dept-trd-border)]";
    label = "TRD · Traction/OHE";
    Icon = Zap;
  } else if (deptKey.includes("SNT") || deptKey.includes("SIGNAL") || deptKey.includes("TELECOM")) {
    styles = "bg-[var(--dept-snt-bg)] text-[var(--dept-snt-text)] border-[var(--dept-snt-border)]";
    label = "S&T · Signal & Interlocking";
    Icon = Radio;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-[var(--radius-sm)] border",
        size === "sm" ? "px-1.5 py-0.5 text-[var(--text-floor)]" : "px-2.5 py-1 text-xs",
        styles,
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />}
      <span>{label}</span>
    </span>
  );
};

// ============================================================================
// BADGE FAMILY 2: LOCK-TYPE BADGES
// ============================================================================
export type LockType = "RULING" | "PLANNED" | "EMERGENT" | "SHADOW";

export interface LockTypeBadgeProps {
  type: LockType | string;
  size?: "sm" | "default";
  className?: string;
}

export const LockTypeBadge: React.FC<LockTypeBadgeProps> = ({
  type,
  size = "default",
  className,
}) => {
  const lockKey = type.toUpperCase();

  let styles = "bg-[var(--lock-planned-bg)] text-[var(--lock-planned-text)] border-[var(--lock-planned-border)]";
  let symbol = "📋";
  let label = "PLANNED";
  let title = "Standard Divisional Maintenance Timetable Possession";

  if (lockKey === "RULING") {
    styles = "bg-[var(--lock-ruling-bg)] text-[var(--lock-ruling-text)] border-[var(--lock-ruling-border)]";
    symbol = "🏛️";
    label = "RULING";
    title = "Statutory Long-term Annual Maintenance Programme (2026)";
  } else if (lockKey === "EMERGENT") {
    styles = "bg-[var(--lock-emergent-bg)] text-[var(--lock-emergent-text)] border-[var(--lock-emergent-border)]";
    symbol = "🚨";
    label = "EMERGENT";
    title = "P1 Critical Safety Intervention / Emergency Repair";
  } else if (lockKey === "SHADOW") {
    styles = "bg-[var(--lock-shadow-bg)] text-[var(--lock-shadow-text)] border-[var(--lock-shadow-border)]";
    symbol = "👥";
    label = "SHADOW";
    title = "Opportunistic Multi-Department Co-located Possession";
  }

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-[var(--radius-sm)] border",
        size === "sm" ? "px-1.5 py-0.5 text-[var(--text-floor)]" : "px-2.5 py-1 text-xs",
        styles,
        className
      )}
    >
      <span>{symbol}</span>
      <span>{label}</span>
    </span>
  );
};

// ============================================================================
// BADGE FAMILY 3: PROVENANCE BADGES (PROMINENT TRUST-BUILDING)
// ============================================================================
export type ProvenanceType = "REAL_PUBLIC" | "SYNTHETIC" | "DERIVED";

export interface ProvenanceBadgeProps {
  type: ProvenanceType;
  size?: "sm" | "default";
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  type,
  size = "default",
  className,
}) => {
  if (type === "REAL_PUBLIC") {
    return (
      <span
        title="Verified from IR Working Time Table (WTT), IRCTC, and open railway geographic data."
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-bold tracking-wider rounded-[var(--radius-md)] border shadow-xs select-none",
          "bg-emerald-950/90 text-emerald-300 border-emerald-500/70",
          size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
          className
        )}
      >
        <ShieldCheck className={size === "sm" ? "w-3 h-3 text-emerald-400" : "w-3.5 h-3.5 text-emerald-400"} />
        <span>REAL / PUBLIC DATA</span>
      </span>
    );
  }

  if (type === "SYNTHETIC") {
    return (
      <span
        title="Synthesized transparently from Indian Railways maintenance frequency norms (TMS / SMMS / TDMS)."
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-bold tracking-wider rounded-[var(--radius-md)] border shadow-xs select-none",
          "bg-indigo-950/90 text-indigo-300 border-indigo-500/70",
          size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
          className
        )}
      >
        <Sparkles className={size === "sm" ? "w-3 h-3 text-indigo-400" : "w-3.5 h-3.5 text-indigo-400"} />
        <span>SYNTHETIC NORM DATA</span>
      </span>
    );
  }

  return (
    <span
      title="Computed live by the KrayaSetu AI optimization engine."
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold tracking-wider rounded-[var(--radius-md)] border shadow-xs select-none",
        "bg-sky-950/90 text-sky-300 border-sky-500/70",
        size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
        className
      )}
    >
      <Database className={size === "sm" ? "w-3 h-3 text-sky-400" : "w-3.5 h-3.5 text-sky-400"} />
      <span>DERIVED AI STATE</span>
    </span>
  );
};

// ============================================================================
// BADGE FAMILY 4: ROLE PERSONA BADGES
// ============================================================================
export type PersonaId =
  | "COA-001"
  | "COR-001"
  | "SM-001"
  | "PWAY-001"
  | "PWAY-002"
  | "SNT-001"
  | "TRD-001"
  | "TRD-002"
  | "TRAIN-001";

export interface RoleBadgeProps {
  persona: PersonaId | string;
  size?: "sm" | "default";
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  persona,
  size = "default",
  className,
}) => {
  const pId = persona.toUpperCase();

  let styles = "bg-[var(--dept-coa-bg)] text-[var(--dept-coa-text)] border-[var(--dept-coa-border)]";
  let label = "Chief of Block Operations";
  let Icon = UserCheck;

  if (pId === "COR-001") {
    styles = "bg-blue-100 text-blue-900 border-blue-300";
    label = "Corridor Master";
    Icon = Layers;
  } else if (pId === "SM-001") {
    styles = "bg-emerald-100 text-emerald-900 border-emerald-300";
    label = "Station Master";
    Icon = Building2;
  } else if (pId.startsWith("PWAY")) {
    styles = "bg-[var(--dept-pway-bg)] text-[var(--dept-pway-text)] border-[var(--dept-pway-border)]";
    label = pId === "PWAY-002" ? "JE P.Way (Track)" : "Sr. Section Engineer P.Way";
    Icon = Hammer;
  } else if (pId === "SNT-001") {
    styles = "bg-[var(--dept-snt-bg)] text-[var(--dept-snt-text)] border-[var(--dept-snt-border)]";
    label = "Divisional Signal Engineer";
    Icon = Radio;
  } else if (pId.startsWith("TRD")) {
    styles = "bg-[var(--dept-trd-bg)] text-[var(--dept-trd-text)] border-[var(--dept-trd-border)]";
    label = pId === "TRD-002" ? "OHE Field Supervisor" : "Divisional Electrical Engineer (TRD)";
    Icon = Zap;
  } else if (pId === "TRAIN-001") {
    styles = "bg-indigo-100 text-indigo-900 border-indigo-300";
    label = "Loco Pilot Lead";
    Icon = Train;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold rounded-[var(--radius-sm)] border",
        size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-2.5 py-1 text-xs",
        styles,
        className
      )}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span className="font-extrabold">{persona}</span>
      <span className="opacity-60 hidden sm:inline">·</span>
      <span className="font-sans font-medium hidden sm:inline">{label}</span>
    </span>
  );
};

// ============================================================================
// BADGE FAMILY 5: SOLVER-STATUS BADGES (SAFETY-CRITICAL SEPARATION)
// ============================================================================
export type SolverStatus = "OPTIMAL" | "FEASIBLE" | "FALLBACK_HEURISTIC" | "INFEASIBLE";

export interface SolverStatusBadgeProps {
  status: SolverStatus | string;
  size?: "sm" | "default";
  className?: string;
}

export const SolverStatusBadge: React.FC<SolverStatusBadgeProps> = ({
  status,
  size = "default",
  className,
}) => {
  const sKey = status.toUpperCase();

  if (sKey === "OPTIMAL") {
    return (
      <span
        title="CP-SAT Solver proved global mathematical optimality: minimal passenger delay & maximum asset possession."
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-[var(--radius-sm)] border select-none",
          "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs",
          size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
          className
        )}
      >
        <CheckCircle2 className={size === "sm" ? "w-3 h-3 text-emerald-600" : "w-3.5 h-3.5 text-emerald-600"} />
        <span>CP-SAT OPTIMAL</span>
      </span>
    );
  }

  if (sKey === "FEASIBLE") {
    return (
      <span
        title="Valid schedule discovered within solver time-limit satisfying all hard headway & safety constraints."
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-[var(--radius-sm)] border select-none",
          "bg-sky-50 text-sky-800 border-sky-300 shadow-2xs",
          size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
          className
        )}
      >
        <Clock className={size === "sm" ? "w-3 h-3 text-sky-600" : "w-3.5 h-3.5 text-sky-600"} />
        <span>FEASIBLE (TIME-BOUND)</span>
      </span>
    );
  }

  if (sKey === "FALLBACK_HEURISTIC") {
    return (
      <span
        title="SAFETY ADVISORY: CP-SAT solver timed out. Schedule generated via deterministic Greedy Warm-Start fallback without global optimality guarantee."
        className={cn(
          "inline-flex items-center gap-1.5 font-mono font-black uppercase rounded-[var(--radius-sm)] border-2 select-none animate-pulse",
          "bg-amber-100 text-amber-950 border-amber-500 shadow-xs",
          size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
          className
        )}
      >
        <AlertTriangle className={size === "sm" ? "w-3.5 h-3.5 text-amber-700" : "w-4 h-4 text-amber-700"} />
        <span>⚠️ GREEDY HEURISTIC FALLBACK</span>
      </span>
    );
  }

  // INFEASIBLE
  return (
    <span
      title="No valid collision-free block schedule exists under given passenger headway constraints. Manual conflict override required."
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded-[var(--radius-sm)] border select-none",
        "bg-red-50 text-red-900 border-red-300 shadow-2xs",
        size === "sm" ? "px-2 py-0.5 text-[var(--text-floor)]" : "px-3 py-1 text-xs",
        className
      )}
    >
      <XCircle className={size === "sm" ? "w-3 h-3 text-red-600" : "w-3.5 h-3.5 text-red-600"} />
      <span>INFEASIBLE CONFLICT</span>
    </span>
  );
};
