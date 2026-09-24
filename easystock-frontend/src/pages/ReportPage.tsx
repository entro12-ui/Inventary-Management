import * as React from "react";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Package,
  ShoppingBag,
  Star,
  Warehouse,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

type ReportSummary = {
  business_name: string;
  total_sales: number;
  total_qty_sold: number;
  currency: string;
};

type NetWorth = {
  inventory_value: number;
  total_qty: number;
  currency: string;
};

const reportCategories = [
  { to: "/report/daily", icon: CalendarCheck, label: "Daily closing" },
  { to: "/report/yearly", icon: Calendar, label: "Yearly report" },
  { to: "/report/warehouse", icon: Warehouse, label: "Warehouse report" },
  { to: "/report/shop", icon: ShoppingBag, label: "Shop report" },
  { to: "/report/business", icon: BarChart3, label: "Business report" },
  { to: "/credit", icon: CreditCard, label: "Credit report" },
  { to: "/report/product", icon: Package, label: "Product report" },
  { to: "/report/top-products", icon: Star, label: "Top products" },
] as const;

export function ReportPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [summary, setSummary] = React.useState<ReportSummary | null>(null);
  const [netWorth, setNetWorth] = React.useState<NetWorth | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    Promise.all([
      apiRequest<ReportSummary>("/api/reports/summary", { token, signal: controller.signal }),
      apiRequest<NetWorth>("/api/reports/net-worth", { token, signal: controller.signal }).catch(() => null),
    ])
      .then(([s, nw]) => {
        if (!controller.signal.aborted) {
          setSummary(s);
          setNetWorth(nw ?? null);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load report");
      });
    return () => controller.abort();
  }, [token]);

  const currency = summary?.currency ?? netWorth?.currency ?? "";
  const storeName = summary?.business_name ?? "Store";

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl lg:space-y-6">
      <div className="flex items-center gap-2 pt-2 lg:pt-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="font-display text-xl font-semibold tracking-tight lg:text-2xl">Reports</div>
          <div className="text-sm text-muted-foreground">Hello {storeName}</div>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:gap-6">
        <Link
          to="/report/shop"
          className="group flex flex-col rounded-xl border-0 bg-hero p-4 text-hero-foreground shadow-md shadow-primary/20 transition hover:opacity-95 lg:p-6"
        >
          <ShoppingBag className="mb-2 h-6 w-6 opacity-90" />
          <div className="truncate text-xl font-bold">
            {summary ? `${currency} ${summary.total_sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </div>
          <div className="mt-1 text-sm opacity-90">{summary ? `${summary.total_qty_sold.toLocaleString()} Total Qty sold` : "—"}</div>
          <ChevronRight className="mt-auto h-5 w-5 self-end opacity-80 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/report/warehouse"
          className="group flex flex-col rounded-xl border border-border/60 bg-card p-4 text-foreground shadow-sm transition hover:bg-accent/40 lg:p-6"
        >
          <Package className="mb-2 h-6 w-6 text-primary" />
          <div className="truncate text-xl font-bold">
            {netWorth ? `${currency} ${netWorth.inventory_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {netWorth ? `${netWorth.total_qty.toLocaleString()} Total Qty` : "—"}
          </div>
          <ChevronRight className="mt-auto h-5 w-5 self-end text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-1 rounded-xl border border-border/70 bg-card p-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-2 lg:p-3">
        {reportCategories.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
