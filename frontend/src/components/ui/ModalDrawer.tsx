import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

const ModalDrawerContext = React.createContext<{ presentation: "modal" | "drawer" }>({
  presentation: "modal",
});

export interface ModalDrawerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  presentation?: "modal" | "drawer";
}

export const ModalDrawer: React.FC<ModalDrawerProps> = ({
  presentation = "modal",
  children,
  ...props
}) => (
  <ModalDrawerContext.Provider value={{ presentation }}>
    <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>
  </ModalDrawerContext.Provider>
);

export const ModalDrawerTrigger = DialogPrimitive.Trigger;
export const ModalDrawerClose = DialogPrimitive.Close;
export const ModalDrawerPortal = DialogPrimitive.Portal;

export const ModalDrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-[var(--surface-overlay)] backdrop-blur-xs transition-opacity duration-200",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
ModalDrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface ModalDrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showClose?: boolean;
}

export const ModalDrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalDrawerContentProps
>(({ className, children, showClose = true, ...props }, ref) => {
  const { presentation } = React.useContext(ModalDrawerContext);

  if (presentation === "drawer") {
    return (
      <ModalDrawerPortal>
        <ModalDrawerOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed inset-y-0 right-0 z-[100] w-full max-w-md bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl",
            "border-l border-[var(--border-subtle)] flex flex-col focus:outline-none",
            "transition ease-in-out duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            className
          )}
          {...props}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              className="absolute top-4 right-4 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </ModalDrawerPortal>
    );
  }

  // Centered Modal
  return (
    <ModalDrawerPortal>
      <ModalDrawerOverlay />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "relative w-full max-w-2xl rounded-[var(--radius-2xl)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-2xl",
            "border border-[var(--border-subtle)] flex flex-col max-h-[90vh] overflow-hidden focus:outline-none",
            "transition duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              className="absolute top-4 right-4 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </ModalDrawerPortal>
  );
});
ModalDrawerContent.displayName = DialogPrimitive.Content.displayName;

export const ModalDrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-5 sm:p-6 bg-[var(--surface-secondary)]/50 border-b border-[var(--border-subtle)] flex flex-col space-y-1.5",
      className
    )}
    {...props}
  />
));
ModalDrawerHeader.displayName = "ModalDrawerHeader";

export const ModalDrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-tight tracking-tight", className)}
    {...props}
  />
));
ModalDrawerTitle.displayName = DialogPrimitive.Title.displayName;

export const ModalDrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed", className)}
    {...props}
  />
));
ModalDrawerDescription.displayName = DialogPrimitive.Description.displayName;

export const ModalDrawerBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 sm:p-6 overflow-y-auto flex-1 space-y-4", className)} {...props} />
));
ModalDrawerBody.displayName = "ModalDrawerBody";

export const ModalDrawerFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-4 sm:p-5 bg-[var(--surface-secondary)]/50 border-t border-[var(--border-subtle)] flex items-center justify-end space-x-3",
      className
    )}
    {...props}
  />
));
ModalDrawerFooter.displayName = "ModalDrawerFooter";
