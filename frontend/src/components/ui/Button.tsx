import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "success";
export type ButtonSize = "sm" | "default" | "large";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      isLoading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-[var(--brand-navy)] hover:bg-[var(--brand-navy-hover)] text-[var(--text-inverse)] border border-[var(--brand-navy-border)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--brand-navy)]",
      secondary:
        "bg-[var(--surface-card)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--border-medium)]",
      destructive:
        "bg-[var(--status-danger)] hover:brightness-95 text-[var(--text-inverse)] border border-transparent shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--status-danger)]",
      success:
        "bg-[var(--status-success)] hover:brightness-95 text-[var(--text-inverse)] border border-transparent shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--status-success)]",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "px-2.5 py-1 text-xs rounded-[var(--radius-sm)] font-medium gap-1.5",
      default: "px-4 py-2 text-sm rounded-[var(--radius-md)] font-semibold gap-2",
      large: "px-6 py-3 text-base rounded-[var(--radius-lg)] font-bold gap-2.5",
    };

    return (
      <Comp
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center select-none font-sans transition-all duration-150 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-offset-2",
          "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current flex-shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";
