import * as React from "react";
import {
  BarChart3,
  Calendar,
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
        <div className="text-lg font-semibold lg:text-xl">Report</div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="text-base font-medium lg:text-lg">Hello {storeName}</div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:gap-6">
        <Link
          to="/report/shop"
          className="group flex flex-col rounded-xl border-0 bg-gradient-to-br from-rose-400 to-pink-500 p-4 text-white shadow-md transition hover:shadow-lg lg:p-6"
        >
          <ShoppingBag className="mb-2 h-6 w-6 opacity-90" />
          <div className="text-xl font-bold truncate">
            {summary ? `${currency} ${summary.total_sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </div>
          <div className="mt-1 text-sm opacity-90">{summary ? `${summary.total_qty_sold.toLocaleString()} Total Qty sold` : "—"}</div>
          <ChevronRight className="mt-auto h-5 w-5 self-end opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          to="/report/warehouse"
          className="group flex flex-col rounded-xl border-0 bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-md transition hover:shadow-lg lg:p-6"
        >
          <Package className="mb-2 h-6 w-6 opacity-90" />
          <div className="text-xl font-bold truncate">
            {netWorth ? `${currency} ${netWorth.inventory_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </div>
          <div className="mt-1 text-sm opacity-90">
            {netWorth ? `${netWorth.total_qty.toLocaleString()} Total Qty` : "—"}
          </div>
          <ChevronRight className="mt-auto h-5 w-5 self-end opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3">
        {reportCategories.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between rounded-lg px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span>{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
