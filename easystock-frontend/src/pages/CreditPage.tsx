import * as React from "react";

import { ChevronLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreditSale = {
  id: string;
  customer_name: string | null;
  items_count: number;
  sale_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: "UNPAID" | "FULL PAYMENT" | "ADVANCE PAYMENT" | string;
};

function formatAmount(value: number) {
  return String(Math.round(value));
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  if (status === "UNPAID") return "text-muted-foreground";
  if (status === "FULL PAYMENT") return "text-primary";
  if (status === "ADVANCE PAYMENT") return "text-primary";
  return "text-muted-foreground";
}

export function CreditPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [query, setQuery] = React.useState("");
  const [sales, setSales] = React.useState<CreditSale[]>([]);
  const [sort, setSort] = React.useState<"date_desc" | "amount_desc">("date_desc");

  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<CreditSale | null>(null);
  const [payAmount, setPayAmount] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  async function load() {
    if (!token) return;
    const data = await apiRequest<CreditSale[]>("/api/sales/credit", { token });
    setSales(data);
  }

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    apiRequest<CreditSale[]>("/api/sales/credit", { token, signal: controller.signal })
      .then(setSales)
      .catch(() => {});
    return () => controller.abort();
  }, [token]);

  async function receivePayment() {
    if (!token || !selected) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setIsSaving(true);
    try {
      await apiRequest(`/api/sales/${selected.id}/payment`, {
        method: "PATCH",
        token,
        body: { amount },
      });
      await load();
      setOpen(false);
      setSelected(null);
      setPayAmount("");
    } catch {
      // Error not displayed per user request
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = sales;
    if (q) {
      rows = rows.filter((s) => (s.customer_name || "N/A").toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      if (sort === "amount_desc") return (b.total_amount ?? 0) - (a.total_amount ?? 0);
      return new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime();
    });
    return rows;
  }, [query, sales, sort]);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-5xl">
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by cheque No, customer name, ..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <button type="button" className="inline-flex items-center gap-1" onClick={() => {}}>
          <span>Filter</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1"
          onClick={() => setSort((s) => (s === "date_desc" ? "amount_desc" : "date_desc"))}
        >
          <span>Sort by</span>
        </button>
      </div>

      <div className="divide-y rounded-lg border bg-card">
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-accent"
            onClick={() => {
              setSelected(s);
              setPayAmount("");
              setOpen(true);
            }}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{s.customer_name || "N/A"}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.items_count} Items</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDate(s.sale_date)}</div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold">{formatAmount(s.total_amount)}</div>
              <div className={`mt-1 text-xs font-semibold ${statusClass(s.payment_status)}`}>{s.payment_status}</div>
            </div>
          </button>
        ))}

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">No credit sales</div>
        ) : null}
      </div>

      <BottomSheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSelected(null);
            setPayAmount("");
          }
        }}
        title={selected ? selected.customer_name || "N/A" : "Receive payment"}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border bg-muted/30 p-2">
                <div className="text-muted-foreground">Total</div>
                <div className="mt-1 font-semibold">{formatAmount(selected.total_amount)}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <div className="text-muted-foreground">Paid</div>
                <div className="mt-1 font-semibold">{formatAmount(selected.paid_amount)}</div>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <div className="text-muted-foreground">Remaining</div>
                <div className="mt-1 font-semibold">{formatAmount(selected.remaining_amount)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay">Receive amount</Label>
              <Input
                id="pay"
                type="number"
                min="0"
                step="1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            <Button className="w-full" disabled={isSaving} onClick={receivePayment}>
              {isSaving ? "Saving..." : "Receive payment"}
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
