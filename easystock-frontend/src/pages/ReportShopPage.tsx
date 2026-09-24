import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RevenueByBranchItem = {
  store_id: string | null;
  store_name: string;
  total_sales: number;
  total_qty_sold: number;
};

type ViewMode = "items" | "networth";

export function ReportShopPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [revenue, setRevenue] = React.useState<{ items: RevenueByBranchItem[]; currency: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [shopView, setShopView] = React.useState<ViewMode>("networth");

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    apiRequest<{ items: RevenueByBranchItem[]; currency: string }>("/api/reports/revenue-by-branch", { token, signal: controller.signal })
      .then(setRevenue)
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load report");
      });
    return () => controller.abort();
  }, [token]);

  const currency = revenue?.currency ?? "";
  const shopTotal = revenue?.items.reduce((a, i) => a + i.total_sales, 0) ?? 0;
  const shopQtyTotal = revenue?.items.reduce((a, i) => a + i.total_qty_sold, 0) ?? 0;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold">Shop report</div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <p className="text-xs text-muted-foreground">
        Each branch (store) can have sales. Select a branch when creating a sale to see it here.
      </p>

      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">Total sales</div>
        <div className="text-2xl font-bold">{currency} {shopTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>

      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Shop</CardTitle>
            <span className="text-sm font-medium">{currency} {shopTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setShopView("items")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${shopView === "items" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"}`}
            >
              Total items per branch
            </button>
            <button
              type="button"
              onClick={() => setShopView("networth")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${shopView === "networth" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"}`}
            >
              Total Net worth per branch
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-emerald-100 dark:bg-emerald-900/50">
                <tr>
                  <th className="p-2 text-left font-medium">Branch name</th>
                  <th className="p-2 text-right font-medium">Quantity</th>
                  <th className="p-2 text-right font-medium">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {revenue?.items.map((r) => (
                  <tr key={r.store_id ?? r.store_name} className="border-t even:bg-white/50 dark:even:bg-black/5">
                    <td className="p-2">{r.store_name}</td>
                    <td className="p-2 text-right">{r.total_qty_sold.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right">{currency} {r.total_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-200/70 dark:bg-emerald-900/70 font-semibold">
                <tr>
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{shopQtyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 text-right">{currency} {shopTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {revenue?.items.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No branches yet. Add branches in Settings → Branches, then create sales and select a branch.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
