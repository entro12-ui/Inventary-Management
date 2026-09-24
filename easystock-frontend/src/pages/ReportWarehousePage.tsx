import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BranchInventoryItem = {
  store_id: string;
  store_name: string;
  quantity: number;
  total_amount: number;
};

type RevenueByBranchItem = {
  store_id: string | null;
  store_name: string;
  total_sales: number;
  total_qty_sold: number;
};

type NetWorth = {
  inventory_value: number;
  total_qty: number;
  currency: string;
};

type ViewMode = "items" | "networth";

export function ReportWarehousePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [inventory, setInventory] = React.useState<{ items: BranchInventoryItem[]; currency: string } | null>(null);
  const [revenue, setRevenue] = React.useState<{ items: RevenueByBranchItem[]; currency: string } | null>(null);
  const [netWorth, setNetWorth] = React.useState<NetWorth | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [warehouseView, setWarehouseView] = React.useState<ViewMode>("items");
  const [shopView, setShopView] = React.useState<ViewMode>("networth");

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    Promise.all([
      apiRequest<{ items: BranchInventoryItem[]; currency: string }>("/api/reports/inventory-by-branch", { token, signal: controller.signal }),
      apiRequest<{ items: RevenueByBranchItem[]; currency: string }>("/api/reports/revenue-by-branch", { token, signal: controller.signal }),
      apiRequest<NetWorth>("/api/reports/net-worth", { token, signal: controller.signal }),
    ])
      .then(([inv, rev, nw]) => {
        if (!controller.signal.aborted) {
          setInventory(inv);
          setRevenue(rev);
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

  const currency = inventory?.currency ?? revenue?.currency ?? netWorth?.currency ?? "";
  const warehouseTotal = inventory?.items.reduce((a, i) => a + i.total_amount, 0) ?? 0;
  const warehouseQtyTotal = inventory?.items.reduce((a, i) => a + i.quantity, 0) ?? 0;
  const shopTotal = revenue?.items.reduce((a, i) => a + i.total_sales, 0) ?? 0;
  const shopQtyTotal = revenue?.items.reduce((a, i) => a + i.total_qty_sold, 0) ?? 0;
  const totalNetWorth = (netWorth?.inventory_value ?? 0) + shopTotal;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl lg:space-y-6">
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold">Warehouse report</div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium text-muted-foreground">Total Net worth</div>
        <div className="text-2xl font-bold">{currency} {totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Warehouse</CardTitle>
            <span className="text-sm font-medium">{currency} {warehouseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setWarehouseView("items")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${warehouseView === "items" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Total items per branch
            </button>
            <button
              type="button"
              onClick={() => setWarehouseView("networth")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${warehouseView === "networth" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Total Net worth per branch
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left font-medium">Branch name</th>
                  <th className="p-2 text-right font-medium">Quantity</th>
                  <th className="p-2 text-right font-medium">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.items.map((i) => (
                  <tr key={i.store_id} className="border-t even:bg-white/50 dark:even:bg-black/5">
                    <td className="p-2">{i.store_name}</td>
                    <td className="p-2 text-right">{i.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right">{currency} {i.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/80 font-semibold">
                <tr>
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{warehouseQtyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="p-2 text-right">{currency} {warehouseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 bg-secondary/40 shadow-sm">
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
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
