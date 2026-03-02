import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

type YearlyTopItem = {
  product_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  qty: number;
  amount: number;
};

type YearlySalesSummaryResponse = {
  year: number;
  months: { month: number; label: string; total_amount: number }[];
  top_items: YearlyTopItem[];
  currency: string;
};

export function ReportTopProductsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [topItems, setTopItems] = React.useState<YearlyTopItem[]>([]);
  const [currency, setCurrency] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    apiRequest<YearlySalesSummaryResponse>("/api/sales/summary/year?months=6", { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setTopItems(data.top_items ?? []);
          setCurrency(data.currency ?? "");
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load top products");
      });
    return () => controller.abort();
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold">Top products</div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Top selling products (last 6 months)</div>
        <div className="space-y-4">
          {topItems.map((item, index) => (
            <div key={item.product_id} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </div>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.image_url ? (
                  <img src={getFullImageUrl(item.image_url) ?? item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">—</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{item.qty.toLocaleString()} Qty sold</div>
              </div>
              <div className="shrink-0 text-right text-sm font-semibold text-green-600">
                {currency} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
        {topItems.length === 0 && !error && (
          <div className="py-8 text-center text-sm text-muted-foreground">No sales yet</div>
        )}
      </div>
    </div>
  );
}
