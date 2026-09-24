import * as React from "react";

import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

type MonthBar = {
  label: string;
  value: number;
};

type YearlySalesMonth = {
  month: number;
  label: string;
  total_amount: number;
};

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
  months: YearlySalesMonth[];
  top_items: YearlyTopItem[];
  currency: string;
};

function formatBr(value: number) {
  return `${Math.round(value).toLocaleString()} Br`;
}

function formatQty(value: number) {
  return `${Math.round(value)} Qty`;
}

export function ShopYearPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [bars, setBars] = React.useState<MonthBar[]>([]);
  const [topItems, setTopItems] = React.useState<Array<{ id: string; name: string; sku?: string | null; barcode?: string | null; imageUrl?: string | null; qty: number; amount: number }>>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);

    apiRequest<YearlySalesSummaryResponse>("/api/sales/summary/year?months=6", { token, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setBars(
          (data.months ?? []).map((m) => ({
            label: m.label,
            value: m.total_amount,
          })),
        );
        setTopItems(
          (data.top_items ?? []).slice(0, 8).map((i) => ({
            id: i.product_id,
            name: i.name,
            sku: i.sku ?? null,
            barcode: i.barcode ?? null,
            imageUrl: i.image_url ?? null,
            qty: i.qty,
            amount: i.amount,
          })),
        );
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        if (err instanceof ApiError) {
          setError(err.status === 401 ? "Please sign in again" : err.message);
        } else {
          setError("Failed to load items");
        }
      });

    return () => controller.abort();
  }, [token]);

  const rawMax = Math.max(...bars.map((b) => b.value), 1);
  const scale = rawMax <= 0 ? 1 : rawMax;
  const yMax = Math.ceil(scale / 100000) * 100000 || 1;
  const yMid = Math.round(yMax / 2);
  const max = yMax;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center gap-2 rounded-t-xl bg-hero px-4 py-3 text-hero-foreground">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)} className="text-hero-foreground hover:bg-white/20 hover:text-hero-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center font-display text-base font-semibold">This year</div>
        <div className="h-10 w-10" />
      </div>

      <div className="rounded-b-xl border border-t-0 border-border/70 bg-card p-4 shadow-sm">
        <div className="mb-4 font-display text-sm font-semibold">Sales history</div>
        {bars.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">No sales data for this period</div>
        ) : (
        <>
        <div className="grid grid-cols-[56px_1fr] gap-3">
          <div className="relative h-52 text-[10px] font-medium text-muted-foreground">
            <div className="absolute left-0 top-0">{yMax.toLocaleString()}</div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2">{yMid.toLocaleString()}</div>
            <div className="absolute left-0 bottom-0">0</div>
          </div>
          <div className="relative h-52">
            <div className="absolute inset-0 grid grid-rows-4">
              <div className="border-b border-border/70" />
              <div className="border-b border-border/70" />
              <div className="border-b border-border/70" />
              <div className="border-b border-border/70" />
            </div>
            <div className="relative z-10 flex h-full items-end justify-between gap-2 px-1">
              {bars.map((b) => {
                const pct = max > 0 ? b.value / max : 0;
                const barHeightPx = Math.max(pct * 208, b.value > 0 ? 8 : 0);
                return (
                  <div key={b.label} className="flex h-full w-full flex-col items-center justify-end">
                    <div
                      className="w-full min-w-[8px] max-w-[40px] rounded-t"
                      style={{ height: `${barHeightPx}px`, backgroundColor: "rgb(105 196 110)" }}
                      title={`${b.label}: ${formatBr(b.value)}`}
                      aria-label={`${b.label} ${b.value}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-1 border-t border-border/60 pt-3 text-[11px] font-medium text-muted-foreground">
          {bars.map((b) => (
            <div key={b.label} className="flex-1 text-center truncate" title={b.label}>
              {b.label}
            </div>
          ))}
        </div>
        </>
        )}
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Top selling products</div>
        <div className="space-y-3">
          {topItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 rounded-xl border bg-muted/30 p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.imageUrl ? (
                  <img src={getFullImageUrl(item.imageUrl) ?? item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">—</div>
                )}
                <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-foreground shadow-sm">
                  {index + 1}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-medium text-foreground">{item.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{formatQty(item.qty)}</div>
              </div>
              <div className="shrink-0 text-right text-sm font-semibold text-green-600">{formatBr(item.amount)}</div>
            </div>
          ))}
        </div>
        {topItems.length === 0 && !error ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No sales yet</div>
        ) : null}
      </div>
    </div>
  );
}
