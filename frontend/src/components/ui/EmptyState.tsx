import React from "react";
import { Layers, ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: React.ReactNode;
  advisoryNote?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  advisoryNote,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "p-8 sm:p-12 text-center rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-xs flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto",
        className
      )}
      {...props}
    >
      <div className="p-3.5 rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)] shadow-xs">
        {icon || <Layers className="w-8 h-8 stroke-[1.5]" />}
      </div>

      <div className="space-y-1.5 max-w-md">
        <h4 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] font-normal leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryAction) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size="default"
              onClick={onAction}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}

      {advisoryNote && (
        <div className="pt-2 text-[var(--text-floor)] font-mono text-[var(--text-muted)] border-t border-[var(--surface-secondary)] w-full">
          {advisoryNote}
        </div>
      )}
    </div>
  );
};
