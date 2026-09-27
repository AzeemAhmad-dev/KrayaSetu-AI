import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

// ============================================================================
// CANONICAL CARD SHELL
// ============================================================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-xl)] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-xs transition-all",
        hoverable && "hover:border-[var(--brand-canvas-blue)] hover:shadow-md",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-4 sm:p-5 flex flex-col space-y-1.5 border-b border-[var(--surface-secondary)]", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-base sm:text-lg font-bold text-[var(--text-primary)] leading-tight tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs sm:text-sm text-[var(--text-muted)] font-normal leading-relaxed", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 sm:p-5", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-4 sm:p-5 pt-0 flex items-center justify-between border-t border-[var(--surface-secondary)] mt-4", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

// ============================================================================
// KPI / METRIC CARD VARIANT
// ============================================================================
export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  delta?: {
    value: string | number;
    trend: "positive" | "negative" | "neutral";
    label?: string;
  };
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtext,
  delta,
  icon,
  badge,
  className,
  ...props
}) => {
  return (
    <Card className={cn("p-4 sm:p-5 flex flex-col justify-between space-y-3", className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            {title}
          </span>
          {badge && <div className="mt-1">{badge}</div>}
        </div>
        {icon && (
          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-[var(--brand-navy)] flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)] font-mono">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-[var(--text-muted)] font-sans">
              {unit}
            </span>
          )}
        </div>

        {(subtext || delta) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center space-x-1 font-bold font-mono px-1.5 py-0.5 rounded-[var(--radius-xs)]",
                  delta.trend === "positive" && "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
                  delta.trend === "negative" && "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
                  delta.trend === "neutral" && "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                )}
              >
                {delta.trend === "positive" && <TrendingUp className="w-3 h-3 text-[var(--status-success)]" />}
                {delta.trend === "negative" && <TrendingDown className="w-3 h-3 text-[var(--status-danger)]" />}
                {delta.trend === "neutral" && <Minus className="w-3 h-3" />}
                <span>{delta.value}</span>
              </span>
            )}
            {subtext && <span className="text-[var(--text-muted)] truncate">{subtext}</span>}
          </div>
        )}
      </div>
    </Card>
  );
};
