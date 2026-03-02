import * as React from "react";

import { CheckCircle2, ChevronRight, FileText, Cloud, Search, Tag } from "lucide-react";
import { Link } from "react-router-dom";

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
  currency: string;
};

export function DashboardPage() {
  const { token, user } = useAuth();
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

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-24 sm:max-w-5xl lg:max-w-7xl lg:space-y-6">
      <div className="flex items-start justify-between gap-3 pt-2 lg:pt-0">
        <div>
          <div className="text-xl font-bold leading-none text-foreground">
            Easy<span className="font-normal text-muted-foreground">Stock</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Sign in as: {user?.full_name ?? "—"}
            {(user?.role === "owner" || user?.role === "manager") && " (Admin)"}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-online-green px-3 py-1.5 text-xs font-semibold text-white">
          <CheckCircle2 className="h-4 w-4" />
          <span>ONLINE</span>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-md" style={{ backgroundColor: "rgb(40 102 195)" }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Today {todayLabel}</div>
            <Cloud className="h-5 w-5 text-white/60" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 divide-x divide-white/40">
            <Link to="/report" className="flex flex-col items-center px-3 py-3 text-center hover:bg-white/10">
              <FileText className="mb-1 h-5 w-5 text-white/90" />
              <div className="text-lg font-bold text-white">
                {data ? formatCompact(data.today_sales) : "—"}
              </div>
              <div className="mt-0.5 text-xs text-white/80">View Report</div>
            </Link>
            <Link to="/credit" className="flex flex-col items-center px-3 py-3 text-center hover:bg-white/10">
              <div className="text-lg font-bold text-white">
                {data?.credit_count ?? 0}
              </div>
              <div className="mt-0.5 text-xs text-white/80">PT Credit</div>
            </Link>
            <div className="flex flex-col items-center px-3 py-3 text-center">
              <div className="text-lg font-bold text-white">0</div>
              <div className="mt-0.5 text-xs text-white/80">To be expired</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product"
          className="rounded-xl border-0 bg-white pl-9 shadow-sm"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border-0 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Low Stock Reminder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <Link
              to="/warehouse"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50"
            >
              <span className="text-sm">Low in stock</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-destructive">{data?.low_stock_count ?? 0} items</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Link
              to="/warehouse"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50"
            >
              <span className="text-sm">Out of stock</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-destructive">{data?.out_of_stock_count ?? 0} items</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <Link
              to="/shop"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50"
            >
              <span className="text-sm">Sales history</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/report"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50"
            >
              <span className="text-sm">General history</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Link
        to="/sales"
        className="fixed bottom-20 right-5 flex items-center gap-2 rounded-full px-5 py-3 text-white shadow-lg transition hover:opacity-90 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 lg:px-6 lg:py-3.5"
        style={{ backgroundColor: "rgb(40 102 195)" }}
      >
        <Tag className="h-4 w-4 lg:h-5 lg:w-5" />
        <span className="font-medium">Sale</span>
      </Link>
    </div>
  );
}
