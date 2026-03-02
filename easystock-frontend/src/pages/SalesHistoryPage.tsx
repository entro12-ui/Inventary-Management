import * as React from "react";

import { Filter, MoreHorizontal, Phone, Printer, Search, SlidersHorizontal, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  items: SaleDetailItem[];
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  sale_date: string;
  payment_status: string;
  payment_method: PaymentMethod;
  sold_by_name: string | null;
  store_name: string | null;
};

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString();
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusClass(status: string): string {
  const upper = status.toUpperCase();
  if (upper === "UNPAID") return "text-amber-600 dark:text-amber-300";
  if (upper === "FULL PAYMENT") return "text-emerald-600 dark:text-emerald-300";
  if (upper === "ADVANCE PAYMENT") return "text-purple-600 dark:text-purple-300";
  return "text-muted-foreground";
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
    return () => controller.abort();
  }, [token]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => {
      const name = (s.customer_name ?? "N/A").toLowerCase();
      const invoice = (s.invoice_number ?? "").toLowerCase();
      return name.includes(q) || invoice.includes(q);
    });
  }, [sales, query]);

  React.useEffect(() => {
    if (!token || !selectedSaleId) return;
    const controller = new AbortController();
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
  }

  function printInvoice() {
    if (!saleDetail) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${saleDetail.invoice_number}</title>
      <style>body{font-family:sans-serif;padding:20px;max-width:400px;margin:0 auto}
      h1{font-size:18px} table{width:100%;border-collapse:collapse}
      th,td{border-bottom:1px solid #eee;padding:8px;text-align:left}
      .total{font-weight:bold;font-size:16px}
      .meta{color:#666;font-size:12px;margin-top:16px}</style></head><body>
      <h1>Invoice ${saleDetail.invoice_number}</h1>
      <p class="meta">${formatDate(saleDetail.sale_date)} · ${saleDetail.store_name ?? "—"}</p>
      <p class="meta">Customer: ${saleDetail.customer_name ?? "—"}</p>
      <table>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      ${saleDetail.items.map((i) => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${i.unit_price.toFixed(2)}</td><td>${i.total.toFixed(2)}</td></tr>`).join("")}
      </table>
      <p class="total">Total: ${saleDetail.total_amount.toFixed(2)}</p>
      <p class="meta">Payment: ${paymentMethodLabel(saleDetail.payment_method)} · Sold by: ${saleDetail.sold_by_name ?? "—"}</p>
      </body></html>`);
    w.document.close();
    w.print();
    w.close();
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-3 pb-20 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center gap-2 pt-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer, invoice..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Filter">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Sort">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="divide-y rounded-lg border bg-card">
        {filtered.map((sale) => {
          const customer = sale.customer_name?.trim() || "N/A";
          const itemsCount = sale.items?.length ?? 0;
          const status = sale.payment_status || (sale.payment_method === "credit" ? "UNPAID" : "FULL PAYMENT");
          return (
            <button
              key={sale.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-accent/50"
              onClick={() => openSaleDetail(sale.id)}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{customer}</div>
                <div className="text-[11px] text-muted-foreground">
                  {itemsCount} {itemsCount === 1 ? "item" : "items"}
                </div>
                <div className="text-[11px] text-muted-foreground">{formatDate(sale.sale_date)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-sm font-semibold">{formatAmount(sale.total_amount)}</div>
                <div className={`text-[11px] font-semibold ${statusClass(status)}`}>{status}</div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && !error ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No sales found.</div>
        ) : null}
      </div>

      <BottomSheet
        open={!!selectedSaleId}
        onOpenChange={(open) => !open && closeSaleDetail()}
        title={
          <div className="flex items-center justify-between">
            <span>Sale details</span>
            <button
              type="button"
              aria-label="Close"
              className="rounded p-1 hover:bg-accent"
              onClick={closeSaleDetail}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        }
      >
        {saleDetail ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold">Product Items</div>
              <div className="space-y-3">
                {saleDetail.items.map((item) => (
                  <div key={item.product_id} className="flex gap-3 rounded-lg border p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted">
                      {item.image_url ? (
                        <img src={getFullImageUrl(item.image_url) ?? item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">P.N: {item.part_no ?? item.sku ?? "—"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-destructive">Price: {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        {item.store_name && <span className="text-emerald-600 dark:text-emerald-400">{item.store_name} (Shop)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">Quantity: {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs text-muted-foreground">Custom price: {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="mt-1 font-semibold">Total: {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                Customer detail
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div>Customer name: {saleDetail.customer_name ?? "—"}</div>
                {saleDetail.customer_phone && (
                  <a href={`tel:${saleDetail.customer_phone}`} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Phone className="h-4 w-4" />
                    Customer phone: {saleDetail.customer_phone}
                  </a>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">More detail</div>
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div>Date of sale: {formatDate(saleDetail.sale_date)}</div>
                <div>Payment type: {paymentMethodLabel(saleDetail.payment_method)}</div>
                <div>Sold By: {saleDetail.sold_by_name ?? "—"}</div>
                <div>Sold at: {saleDetail.store_name ? `${saleDetail.store_name} (Shop)` : "—"}</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={printInvoice}>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </Button>
              <Button variant="destructive" className="flex-1" disabled>
                The item is returned
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        )}
      </BottomSheet>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background sm:pl-0">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 pb-[env(safe-area-inset-bottom)] pt-3 sm:max-w-5xl">
          <Button variant="outline" size="sm" onClick={() => navigate("/report")}>
            <MoreHorizontal className="mr-1 h-4 w-4" />
            Summary
          </Button>
          <Button size="sm" className="flex-1" onClick={() => navigate("/sales")}>
            New sale
          </Button>
        </div>
      </div>
    </div>
  );
}

