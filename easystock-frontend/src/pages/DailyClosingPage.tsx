import * as React from "react";

import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentBreakdown = { method: string; amount: number };
type LowStockItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  min_stock: number;
};

type DailyClosing = {
  date: string;
  currency: string;
  sales_count: number;
  total_sales: number;
  total_paid: number;
  total_due: number;
  by_payment_method: PaymentBreakdown[];
  low_stock_items: LowStockItem[];
};

function methodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    mobile_money: "Mobile money",
    bank_transfer: "Bank transfer",
    card: "Card",
    credit: "Credit",
  };
  return map[method] ?? method;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyClosingPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [day, setDay] = React.useState(todayInputValue);
  const [data, setData] = React.useState<DailyClosing | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiRequest<DailyClosing>(`/api/reports/daily-closing?day=${day}`, {
      token,
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) setData(res);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load daily closing");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, day]);

  const currency = data?.currency ?? "";

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="font-display text-lg font-semibold tracking-tight">Daily closing</div>
          <div className="text-xs text-muted-foreground">End-of-day sales summary</div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
        <Label htmlFor="closing-day">Closing date</Label>
        <Input
          id="closing-day"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="h-11"
        />
      </div>

      {error ? <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Sales</div>
              <div className="mt-1 font-display text-2xl font-semibold">{data.sales_count}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="mt-1 font-display text-2xl font-semibold">
                {currency} {data.total_sales.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Collected</div>
              <div className="mt-1 text-lg font-semibold text-primary">
                {currency} {data.total_paid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Still due</div>
              <div className="mt-1 text-lg font-semibold text-destructive">
                {currency} {data.total_due.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-sm font-semibold">By payment method</div>
            {data.by_payment_method.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales on this day.</p>
            ) : (
              <div className="space-y-2">
                {data.by_payment_method.map((row) => (
                  <div key={row.method} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{methodLabel(row.method)}</span>
                    <span className="font-semibold">
                      {currency} {row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Need reorder</div>
              <Link to="/warehouse" className="text-xs font-medium text-primary">
                Open stock
              </Link>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Items at or below minimum stock — reorder soon.
            </p>
            {data.low_stock_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low-stock items right now.</p>
            ) : (
              <div className="space-y-2">
                {data.low_stock_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">SKU {item.sku}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <div className="font-semibold text-destructive">Qty {item.quantity}</div>
                      <div className="text-muted-foreground">Min {item.min_stock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
