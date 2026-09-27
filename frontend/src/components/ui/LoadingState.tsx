import React from "react";
import { Loader2, Cpu, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { cn } from "../../lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "cpsat" | "minimal";
  title?: string;
  subtitle?: string;
  elapsedSeconds?: number;
  maxSeconds?: number;
  provisionalScore?: {
    blocksScheduled?: number;
    totalBlocks?: number;
    delayMinutes?: number;
    hoursSaved?: number;
  };
  stepText?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = "cpsat",
  title = "CP-SAT Optimization in Progress…",
  subtitle = "Solving multi-commodity flow with strict headway & possession constraints",
  elapsedSeconds,
  maxSeconds = 8.0,
  provisionalScore = {
    blocksScheduled: 48,
    totalBlocks: 50,
    delayMinutes: 0,
    hoursSaved: 33.0,
  },
  stepText = "Warm-start greedy baseline established → Active branch-and-bound refinement pass",
  className,
  ...props
}) => {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "p-8 flex flex-col items-center justify-center space-y-3 text-center",
          className
        )}
        {...props}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-navy)]" />
        <div className="space-y-0.5">
          <span className="text-sm font-bold text-[var(--text-primary)] block font-sans">
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-[var(--text-muted)] font-mono block">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  // CP-SAT Aware Loading Component with Provisional Warm-Start Fallback Display
  return (
    <div
      className={cn(
        "p-6 sm:p-8 rounded-[var(--radius-xl)] border border-[var(--brand-canvas-blue)]/30 bg-[var(--surface-card)] shadow-md max-w-2xl mx-auto space-y-5 select-none",
        className
      )}
      {...props}
    >
      {/* Header with Pulsing Engine Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--brand-navy)] text-[var(--text-inverse)] shadow-xs animate-pulse">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[var(--text-floor)] font-mono font-bold uppercase tracking-wider text-[var(--brand-navy)] bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800">
                GOOGLE OR-TOOLS CP-SAT
              </span>
              <span className="text-xs font-mono font-bold text-[var(--status-warning)] flex items-center space-x-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SOLVING</span>
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight mt-0.5">
              {title}
            </h4>
          </div>
        </div>

        {elapsedSeconds !== undefined && (
          <div className="text-right font-mono text-xs">
            <div className="text-[var(--text-muted)] uppercase text-[var(--text-floor)] font-bold">Elapsed</div>
            <div className="text-sm font-black text-[var(--text-primary)]">
              {elapsedSeconds.toFixed(1)}s <span className="text-[var(--text-muted)] font-normal">/ {maxSeconds}s</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] font-sans leading-relaxed">
        {subtitle}
      </p>

      {/* Provisional Warm-Start Solution Strip */}
      <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-[var(--status-success-text)] font-bold">
            <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] flex-shrink-0" />
            <span>Provisional Warm-Start Available (Greedy Baseline)</span>
          </div>
          <span className="text-[var(--text-floor)] px-2 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
            SAFE FOR IMMEDIATE DISPATCH
          </span>
        </div>

        {provisionalScore && (
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-floor)] text-[var(--text-muted)] uppercase block">Blocks</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {provisionalScore.blocksScheduled} / {provisionalScore.totalBlocks}
              </span>
            </div>
            <div className="p-2 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-floor)] text-[var(--text-muted)] uppercase block">Train Delay</span>
              <span className="text-sm font-bold text-[var(--status-success)]">
                {provisionalScore.delayMinutes} min
              </span>
            </div>
            <div className="p-2 rounded bg-[var(--surface-card)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-floor)] text-[var(--text-muted)] uppercase block">Downtime Cut</span>
              <span className="text-sm font-bold text-[var(--dept-coa)]">
                +{provisionalScore.hoursSaved} hrs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar & Refinement Step */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[var(--text-floor)] font-mono text-[var(--text-muted)]">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-[var(--brand-canvas-blue)]" />
            <span>{stepText}</span>
          </span>
          <span className="font-bold text-[var(--brand-navy)]">Refining…</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden border border-[var(--border-subtle)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--brand-navy)] via-[var(--brand-canvas-blue)] to-[var(--status-success)] animate-pulse rounded-full"
            style={{ width: "75%" }}
          />
        </div>
      </div>
    </div>
  );
};
