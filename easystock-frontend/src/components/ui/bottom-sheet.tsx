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
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          // Full usable height on mobile so content is not cut by bottom nav / FOOTER
          "relative z-[101] flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border bg-background shadow-2xl",
          "h-[min(92dvh,100%)] max-h-[92dvh]",
          "sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:max-w-2xl",
          className,
        )}
      >
        <div className="shrink-0 px-4 pt-3 sm:hidden">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
        </div>

        {title ? (
          <div className="shrink-0 border-b border-border/60 px-4 pb-3 pt-2 text-sm font-semibold sm:pt-4">
            {title}
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4",
            // Extra bottom space so last actions stay above home indicator / thumbs
            "pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.25rem))]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
