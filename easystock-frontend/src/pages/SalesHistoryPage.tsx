import * as React from "react";

import { CreditCard, Phone, Printer, Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SaleItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "card" | "credit";

type Sale = {
  id: string;
  invoice_number: string;
  total_amount: number;
  items: SaleItem[];
  customer_name: string | null;
  sale_date: string;
  payment_status: string;
  payment_method: PaymentMethod;
  payment_proof_url?: string | null;
};

type SaleDetailItem = {
  product_id: string;
  product_name: string;
  image_url: string | null;
  sku: string | null;
  part_no: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  store_name: string | null;
};

type SaleDetail = {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  notes?: string | null;
  items: SaleDetailItem[];
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  sale_date: string;
  payment_status: string;
  payment_method: PaymentMethod;
  payment_proof_url?: string | null;
  sold_by_name: string | null;
  store_name: string | null;
};

type LowStockProduct = {
  id: string;
  name: string;
  quantity: number;
  min_stock?: number;
};

type PaymentFilter = "all" | "paid" | "unpaid" | "credit";
type SortMode = "date_desc" | "amount_desc";

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string): string {
  const upper = status.toUpperCase();
  if (upper === "UNPAID") return "bg-warning/20 text-warning-foreground";
  if (upper === "FULL PAYMENT") return "bg-primary/15 text-primary";
  if (upper === "ADVANCE PAYMENT") return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

function paymentMethodLabel(m: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    cash: "Cash",
    mobile_money: "Mobile money",
    bank_transfer: "Bank transfer",
    card: "Card",
    credit: "Credit",
  };
  return map[m] ?? m;
}

export function SalesHistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [sales, setSales] = React.useState<Sale[]>([]);
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = React.useState<string | null>(null);
  const [saleDetail, setSaleDetail] = React.useState<SaleDetail | null>(null);
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all");
  const [sortMode, setSortMode] = React.useState<SortMode>("date_desc");
  const [payAmount, setPayAmount] = React.useState("");
  const [isPaying, setIsPaying] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [lowStock, setLowStock] = React.useState<LowStockProduct[]>([]);
  const [businessMinStock, setBusinessMinStock] = React.useState(10);

  async function loadSales() {
    if (!token) return;
    setError(null);
    try {
      const list = await apiRequest<Sale[]>("/api/sales", { token });
      setSales(list);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load sales");
    }
  }

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    apiRequest<Sale[]>("/api/sales", { token, signal: controller.signal })
      .then(setSales)
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load sales");
      });
    apiRequest<LowStockProduct[]>("/api/products?skip=0&limit=200", { token, signal: controller.signal })
      .then(async (products) => {
        if (controller.signal.aborted) return;
        let bizMin = 10;
        try {
          const business = await apiRequest<{ default_min_stock?: number }>("/api/business/me", {
            token,
            signal: controller.signal,
          });
          bizMin = business.default_min_stock ?? 10;
          setBusinessMinStock(bizMin);
        } catch {
          /* keep default */
        }
        if (controller.signal.aborted) return;
        setLowStock(
          products.filter((p) => {
            const min = p.min_stock ?? bizMin;
            return p.quantity > 0 && p.quantity <= min;
          }),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [token]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = sales.filter((s) => {
      if (paymentFilter === "credit" && s.payment_method !== "credit") return false;
      if (paymentFilter === "paid" && s.payment_status.toUpperCase() !== "FULL PAYMENT") return false;
      if (
        paymentFilter === "unpaid" &&
        s.payment_status.toUpperCase() !== "UNPAID" &&
        s.payment_status.toUpperCase() !== "ADVANCE PAYMENT"
      ) {
        return false;
      }
      if (!q) return true;
      const name = (s.customer_name ?? "").toLowerCase();
      const invoice = (s.invoice_number ?? "").toLowerCase();
      return name.includes(q) || invoice.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      if (sortMode === "amount_desc") return (b.total_amount ?? 0) - (a.total_amount ?? 0);
      return new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime();
    });
    return rows;
  }, [sales, query, paymentFilter, sortMode]);

  React.useEffect(() => {
    if (!token || !selectedSaleId) return;
    const controller = new AbortController();
    setSaleDetail(null);
    setPayAmount("");
    setPayError(null);
    apiRequest<SaleDetail>(`/api/sales/${selectedSaleId}`, { token, signal: controller.signal })
      .then(setSaleDetail)
      .catch(() => setSaleDetail(null));
    return () => controller.abort();
  }, [token, selectedSaleId]);

  function openSaleDetail(id: string) {
    setSelectedSaleId(id);
  }

  function closeSaleDetail() {
    setSelectedSaleId(null);
    setSaleDetail(null);
    setPayAmount("");
    setPayError(null);
  }

  async function receivePayment() {
    if (!token || !saleDetail) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a valid amount");
      return;
    }
    setIsPaying(true);
    setPayError(null);
    try {
      await apiRequest(`/api/sales/${saleDetail.id}/payment`, {
        method: "PATCH",
        token,
        body: { amount },
      });
      const refreshed = await apiRequest<SaleDetail>(`/api/sales/${saleDetail.id}`, { token });
      setSaleDetail(refreshed);
      setPayAmount("");
      await loadSales();
    } catch (err) {
      if (err instanceof ApiError) setPayError(err.message);
      else setPayError("Payment failed");
    } finally {
      setIsPaying(false);
    }
  }

  function printInvoice() {
    if (!saleDetail) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${saleDetail.invoice_number}</title>
      <style>body{font-family:sans-serif;padding:20px;max-width:420px;margin:0 auto}
      h1{font-size:18px;margin-bottom:4px} table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:13px}
      .total{font-weight:bold;font-size:16px;margin-top:12px}
      .meta{color:#666;font-size:12px;margin-top:6px}</style></head><body>
      <h1>EasyStock Invoice</h1>
      <div class="meta">${saleDetail.invoice_number}</div>
      <p class="meta">${formatDate(saleDetail.sale_date)} · ${saleDetail.store_name ?? "—"}</p>
      <p class="meta">Customer: ${saleDetail.customer_name ?? "Walk-in"}</p>
      <table>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      ${saleDetail.items
        .map(
          (i) =>
            `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${i.unit_price.toFixed(2)}</td><td>${i.total.toFixed(2)}</td></tr>`,
        )
        .join("")}
      </table>
      <p class="total">Total: ${saleDetail.total_amount.toFixed(2)} ETB</p>
      <p class="meta">Payment: ${paymentMethodLabel(saleDetail.payment_method)} · ${saleDetail.payment_status}</p>
      <p class="meta">Sold by: ${saleDetail.sold_by_name ?? "—"}</p>
      </body></html>`);
    w.document.close();
    w.print();
    w.close();
  }

  const remaining = saleDetail?.remaining_amount ?? 0;
  const canReceivePayment =
    saleDetail &&
    (saleDetail.payment_method === "credit" || remaining > 0) &&
    remaining > 0;

  return (
    <div className="mx-auto w-full max-w-md space-y-3 pb-24 sm:max-w-5xl lg:max-w-7xl">
      <div className="pt-1">
        <h1 className="font-display text-xl font-semibold tracking-tight">Sales history</h1>
        <p className="text-sm text-muted-foreground">Tap a sale to see invoice details</p>
      </div>

      {lowStock.length > 0 ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-warning-foreground">
                Soon out of stock — need reorder
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {lowStock.length} item{lowStock.length === 1 ? "" : "s"} at or below minimum
              </p>
            </div>
            <Link to="/warehouse" className="shrink-0 text-xs font-semibold text-primary">
              View stock
            </Link>
          </div>
          <ul className="mt-2 space-y-1">
            {lowStock.slice(0, 4).map((p) => (
              <li key={p.id} className="flex justify-between gap-2 text-xs">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 font-semibold text-destructive">
                  Qty {p.quantity} / min {p.min_stock ?? businessMinStock}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customer or invoice…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["paid", "Paid"],
            ["unpaid", "Unpaid"],
            ["credit", "Credit"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPaymentFilter(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              paymentFilter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortMode((s) => (s === "date_desc" ? "amount_desc" : "date_desc"))}
          className="ml-auto rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          Sort: {sortMode === "date_desc" ? "Newest" : "Amount"}
        </button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="divide-y rounded-xl border border-border/70 bg-card">
        {filtered.map((sale) => {
          const customer = sale.customer_name?.trim() || "Walk-in";
          const itemsCount = sale.items?.length ?? 0;
          const status = sale.payment_status || (sale.payment_method === "credit" ? "UNPAID" : "FULL PAYMENT");
          return (
            <button
              key={sale.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-accent/50"
              onClick={() => openSaleDetail(sale.id)}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{customer}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {sale.invoice_number} · {itemsCount} {itemsCount === 1 ? "item" : "items"} ·{" "}
                  {paymentMethodLabel(sale.payment_method)}
                </div>
                <div className="text-[11px] text-muted-foreground">{formatDate(sale.sale_date)}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="text-sm font-semibold">{formatAmount(sale.total_amount)}</div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusClass(status))}>
                  {status}
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && !error ? (
          <div className="space-y-2 p-8 text-center">
            <div className="font-display text-base font-semibold">No sales found</div>
            <p className="text-sm text-muted-foreground">Create a sale to see it listed here.</p>
            <Button className="mt-2" onClick={() => navigate("/sales")}>
              New sale
            </Button>
          </div>
        ) : null}
      </div>

      <BottomSheet
        open={!!selectedSaleId}
        onOpenChange={(open) => !open && closeSaleDetail()}
        title={
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display text-base font-semibold">Sale details</div>
              {saleDetail ? (
                <div className="truncate text-xs font-normal text-muted-foreground">{saleDetail.invoice_number}</div>
              ) : null}
            </div>
            <button type="button" aria-label="Close" className="rounded p-1 hover:bg-accent" onClick={closeSaleDetail}>
              <X className="h-5 w-5" />
            </button>
          </div>
        }
      >
        {saleDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</div>
                <div className="mt-1 text-sm font-semibold">{formatAmount(saleDetail.total_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</div>
                <div className="mt-1 text-sm font-semibold">{formatAmount(saleDetail.paid_amount ?? 0)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Due</div>
                <div className="mt-1 text-sm font-semibold text-destructive">
                  {formatAmount(saleDetail.remaining_amount ?? 0)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusClass(saleDetail.payment_status))}>
                {saleDetail.payment_status}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
                {paymentMethodLabel(saleDetail.payment_method)}
              </span>
              {saleDetail.store_name ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">{saleDetail.store_name}</span>
              ) : null}
            </div>

            {saleDetail.payment_proof_url ? (
              <div>
                <div className="mb-2 text-sm font-semibold">Payment proof</div>
                <a
                  href={getFullImageUrl(saleDetail.payment_proof_url) ?? saleDetail.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-border/70"
                >
                  <img
                    src={getFullImageUrl(saleDetail.payment_proof_url) ?? saleDetail.payment_proof_url}
                    alt="Payment screenshot"
                    className="max-h-56 w-full object-contain bg-muted/40"
                  />
                </a>
              </div>
            ) : null}

            <div>
              <div className="mb-2 text-sm font-semibold">Items ({saleDetail.items.length})</div>
              <div className="space-y-2">
                {saleDetail.items.map((item) => (
                  <div key={`${item.product_id}-${item.sku}`} className="flex gap-3 rounded-lg border border-border/70 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                      {item.image_url ? (
                        <img
                          src={getFullImageUrl(item.image_url) ?? item.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">SKU: {item.part_no ?? item.sku ?? "—"}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          {item.quantity} × {item.unit_price.toFixed(2)}
                        </span>
                        <span className="font-semibold text-foreground">= {item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Customer</div>
              <div className="space-y-1 rounded-lg border border-border/70 p-3 text-sm">
                <div>{saleDetail.customer_name ?? "Walk-in"}</div>
                {saleDetail.customer_phone ? (
                  <a href={`tel:${saleDetail.customer_phone}`} className="inline-flex items-center gap-2 text-primary">
                    <Phone className="h-4 w-4" />
                    {saleDetail.customer_phone}
                  </a>
                ) : (
                  <div className="text-xs text-muted-foreground">No phone on file</div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Sale info</div>
              <div className="space-y-1 rounded-lg border border-border/70 p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Date</span>
                  <span>{formatDate(saleDetail.sale_date)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Sold by</span>
                  <span>{saleDetail.sold_by_name ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Branch</span>
                  <span>{saleDetail.store_name ?? "—"}</span>
                </div>
                {saleDetail.notes ? (
                  <div className="border-t pt-2">
                    <div className="text-muted-foreground">Note</div>
                    <div className="mt-0.5">{saleDetail.notes}</div>
                  </div>
                ) : null}
              </div>
            </div>

            {canReceivePayment ? (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Receive payment
                </div>
                <p className="text-xs text-muted-foreground">Remaining due: {formatAmount(remaining)} ETB</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <Button disabled={isPaying} onClick={receivePayment}>
                    {isPaying ? "…" : "Pay"}
                  </Button>
                </div>
                {payError ? <div className="text-xs text-destructive">{payError}</div> : null}
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link to="/credit">Open credit page</Link>
                </Button>
              </div>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={printInvoice}>
                <Printer className="mr-2 h-4 w-4" />
                Print invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading sale…</div>
        )}
      </BottomSheet>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur",
          selectedSaleId && "hidden",
        )}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pb-[env(safe-area-inset-bottom)] pt-3 sm:max-w-5xl">
          <Button variant="outline" size="sm" onClick={() => navigate("/report")}>
            Reports
          </Button>
          <Button size="sm" className="flex-1" onClick={() => navigate("/sales")}>
            New sale
          </Button>
        </div>
      </div>
    </div>
  );
}
