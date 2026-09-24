import * as React from "react";

import { CheckCircle2, ChevronRight, FileText, Search, Tag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Summary = {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  today_sales: number;
  credit_count?: number;
  expiring_soon_count?: number;
  currency: string;
};

export function DashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = React.useState<Summary | null>(null);
  const [query, setQuery] = React.useState("");

  function formatCompact(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  }

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    apiRequest<Summary>("/api/dashboard/summary", { token, signal: controller.signal })
      .then(setData)
      .catch(() => {});

    return () => controller.abort();
  }, [token]);

  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  function goSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/warehouse?q=${encodeURIComponent(q)}` : "/warehouse");
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 pb-24 sm:max-w-5xl lg:max-w-7xl lg:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-1 lg:pt-0">
        <div className="animate-fade-up">
          <div className="font-display text-2xl font-bold leading-none tracking-tight text-foreground sm:text-3xl">
            Easy<span className="text-primary">Stock</span>
          </div>
          <div className="mt-1.5 text-sm text-muted-foreground">
            {user?.full_name ?? "—"}
            {(user?.role === "owner" || user?.role === "manager") && " · Admin"}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-online-green px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>ONLINE</span>
        </div>
      </div>

      <Card className="animate-fade-up overflow-hidden border-0 bg-hero text-hero-foreground shadow-md shadow-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-hero-foreground/90">Today · {todayLabel}</div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 divide-x divide-white/25">
            <Link to="/report" className="flex flex-col items-center px-2 py-3 text-center transition hover:bg-white/10 sm:px-3">
              <FileText className="mb-1 h-5 w-5 text-white/90" />
              <div className="text-lg font-bold">{data ? formatCompact(data.today_sales) : "—"}</div>
              <div className="mt-0.5 text-[11px] text-white/80 sm:text-xs">Sales</div>
            </Link>
            <Link to="/credit" className="flex flex-col items-center px-2 py-3 text-center transition hover:bg-white/10 sm:px-3">
              <div className="text-lg font-bold">{data?.credit_count ?? 0}</div>
              <div className="mt-0.5 text-[11px] text-white/80 sm:text-xs">Credit</div>
            </Link>
            <Link
              to="/warehouse?expiring=1"
              className="flex flex-col items-center px-2 py-3 text-center transition hover:bg-white/10 sm:px-3"
            >
              <div className="text-lg font-bold">{data?.expiring_soon_count ?? 0}</div>
              <div className="mt-0.5 text-[11px] text-white/80 sm:text-xs">Expiring</div>
            </Link>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={goSearch} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stock by name or barcode…"
          className="rounded-xl border-border/60 bg-card pl-9 shadow-sm"
        />
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold">Stock alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <Link
              to="/warehouse?stock=low"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
            >
              <span className="text-sm">Soon out of stock · reorder</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-destructive">{data?.low_stock_count ?? 0}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Link
              to="/warehouse?stock=out"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
            >
              <span className="text-sm">Out of stock</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-destructive">{data?.out_of_stock_count ?? 0}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Link
              to="/warehouse?expiring=1"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
            >
              <span className="text-sm">Expiring soon</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-warning-foreground">
                  {data?.expiring_soon_count ?? 0}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <Link
              to="/shop"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
            >
              <span className="text-sm">Sales history</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/report"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
            >
              <span className="text-sm">Reports</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/products"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
            >
              <span className="text-sm">Product catalog</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Link
        to="/sales"
        className="fixed bottom-20 right-5 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 lg:px-6 lg:py-3.5"
      >
        <Tag className="h-4 w-4 lg:h-5 lg:w-5" />
        <span className="font-medium">Sale</span>
      </Link>
    </div>
  );
}
