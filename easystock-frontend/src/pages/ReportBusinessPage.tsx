import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BusinessReportSaleItem = {
  product_name: string;
  customer_name: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  sold_by: string | null;
  branch_name: string | null;
};

type BusinessReport = {
  sales_items: BusinessReportSaleItem[];
  purchase_total: number;
  sell_total: number;
  profit: number;
  due: number;
  expense_total: number;
  loss: number;
  currency: string;
};

type ReportSummary = {
  business_name: string;
  total_sales: number;
  total_qty_sold: number;
  currency: string;
};

export function ReportBusinessPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [report, setReport] = React.useState<BusinessReport | null>(null);
  const [summary, setSummary] = React.useState<ReportSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    Promise.all([
      apiRequest<BusinessReport>("/api/reports/business-report", { token, signal: controller.signal }),
      apiRequest<ReportSummary>("/api/reports/summary", { token, signal: controller.signal }),
    ])
      .then(([r, s]) => {
        if (!controller.signal.aborted) {
          setReport(r);
          setSummary(s);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load report");
      });
    return () => controller.abort();
  }, [token]);

  const currency = report?.currency ?? summary?.currency ?? "";
  const storeName = summary?.business_name ?? "Store";

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "Business report",
        text: `${storeName} - Sell: ${currency} ${report?.sell_total.toFixed(2) ?? "0"} | Profit: ${currency} ${report?.profit.toFixed(2) ?? "0"}`,
      }).catch(() => {});
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-lg font-semibold">Business report</div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="text-sm text-muted-foreground">{storeName}</div>
      <div className="text-sm text-muted-foreground">
        Statement Period: {new Date().toLocaleDateString()} - {new Date().toLocaleDateString()}
      </div>

      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            Sales transactions
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        {expanded && (
          <CardContent className="pt-0">
            <div className="max-h-80 overflow-x-auto overflow-y-auto rounded-md border">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="sticky top-0 bg-blue-600 text-white">
                  <tr>
                    <th className="p-2 text-left">No</th>
                    <th className="p-2 text-left">Item name</th>
                    <th className="p-2 text-left">Customer</th>
                    <th className="p-2 text-right">Total Qty</th>
                    <th className="p-2 text-right">Selling price</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-left">Sold by</th>
                    <th className="p-2 text-left">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.sales_items.map((item, idx) => (
                    <tr key={idx} className="border-t even:bg-muted/30">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 max-w-[140px] truncate" title={item.product_name}>{item.product_name}</td>
                      <td className="p-2">{item.customer_name ?? "—"}</td>
                      <td className="p-2 text-right">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">{currency} {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2">{item.sold_by ?? "—"}</td>
                      <td className="p-2">{item.branch_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report?.sales_items.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No sales yet.</div>
            )}
          </CardContent>
        )}
      </Card>

      {report && report.expense_total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">Total: {currency} {report.expense_total.toFixed(2)}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Financial summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex justify-between rounded-lg border p-3 text-sm">
            <span>Purchase</span>
            <span>{currency} {report?.purchase_total.toFixed(2) ?? "0.00"}</span>
          </div>
          <div className="flex justify-between rounded-lg border p-3 text-sm text-blue-600 dark:text-blue-400">
            <span>Sell</span>
            <span>{currency} {report?.sell_total.toFixed(2) ?? "0.00"}</span>
          </div>
          <div className="flex justify-between rounded-lg border p-3 text-sm font-medium text-green-600 dark:text-green-400">
            <span>Profit</span>
            <span>{currency} {report?.profit.toFixed(2) ?? "0.00"}</span>
          </div>
          <div className="flex justify-between rounded-lg border p-3 text-sm text-amber-600 dark:text-amber-400">
            <span>Due</span>
            <span>{currency} {report?.due.toFixed(2) ?? "0.00"}</span>
          </div>
          <div className="flex justify-between rounded-lg border p-3 text-sm text-red-600 dark:text-red-400">
            <span>Expense</span>
            <span>{currency} {report?.expense_total.toFixed(2) ?? "0.00"}</span>
          </div>
          <div className="flex justify-between rounded-lg border p-3 text-sm text-red-600 dark:text-red-400">
            <span>Loss</span>
            <span>{currency} {report?.loss.toFixed(2) ?? "0.00"}</span>
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
