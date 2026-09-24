import * as React from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AuthShell({ children, title, description, className, contentClassName }: AuthShellProps) {
  return (
    <div className={cn("auth-atmosphere relative min-h-screen", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231f6f68' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 animate-fade-up text-center">
          <Link to="/login" className="inline-block">
            <div className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Easy<span className="text-primary">Stock</span>
            </div>
          </Link>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
            Inventory and sales for shops and pharmacies
          </p>
        </div>

        <div
          className={cn(
            "animate-fade-up rounded-2xl border border-border/80 bg-card/95 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-8",
            contentClassName,
          )}
          style={{ animationDelay: "80ms" }}
        >
          <div className="mb-6 space-y-1.5">
            <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
            {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
