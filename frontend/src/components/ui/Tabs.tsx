import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

const TabsContext = React.createContext<{ variant?: "pills" | "underlined" }>({
  variant: "pills",
});

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: "pills" | "underlined";
}

export const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ className, variant = "pills", ...props }, ref) => (
  <TabsContext.Provider value={{ variant }}>
    <TabsPrimitive.Root
      ref={ref}
      className={cn("flex flex-col space-y-4", className)}
      {...props}
    />
  </TabsContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);

  if (variant === "underlined") {
    return (
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          "flex items-center space-x-6 border-b border-[var(--border-subtle)] pb-px bg-transparent overflow-x-auto",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center space-x-1.5 p-1 rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] overflow-x-auto",
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, badge, icon, children, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);

  if (variant === "underlined") {
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          "inline-flex items-center space-x-2 py-3 px-1 text-sm font-semibold transition-all select-none border-b-2 -mb-px cursor-pointer whitespace-nowrap",
          "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]",
          "data-[state=active]:border-[var(--brand-navy)] data-[state=active]:text-[var(--brand-navy)] data-[state=active]:font-bold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-navy)]",
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
        {badge && <span className="flex-shrink-0">{badge}</span>}
      </TabsPrimitive.Trigger>
    );
  }

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-[var(--radius-md)] transition-all select-none cursor-pointer whitespace-nowrap",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]",
        "data-[state=active]:bg-[var(--brand-navy)] data-[state=active]:text-[var(--text-inverse)] data-[state=active]:shadow-xs data-[state=active]:font-bold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-navy)]",
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && <span className="flex-shrink-0">{badge}</span>}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-navy)]",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
