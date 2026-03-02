import * as React from "react";

import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function BottomSheet({ open, onOpenChange, title, children, className }: BottomSheetProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 pb-8 sm:pb-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/20"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl border bg-background shadow-sm sm:max-w-2xl",
          className,
        )}
      >
        <div className="px-4 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
        </div>

        {title ? <div className="px-4 pt-3 text-sm font-semibold">{title}</div> : null}

        <div className="px-4 pb-24 pt-4 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}
