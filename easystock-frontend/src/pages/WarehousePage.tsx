import * as React from "react";

import {
  ArrowDownUp,
  Building2,
  Boxes,
  Filter,
  FileText,
  Layers2,
  Layers3,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  SquarePen,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  selling_price: number;
  quantity: number;
  image_url?: string | null;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function WarehousePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [adjustQty, setAdjustQty] = React.useState("1");
  const [isActionBusy, setIsActionBusy] = React.useState(false);

  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");
  const [stores, setStores] = React.useState<{ id: string; name: string; location?: string | null }[]>([]);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [fromStoreId, setFromStoreId] = React.useState("");
  const [toStoreId, setToStoreId] = React.useState("");
  const [transferQty, setTransferQty] = React.useState("1");
  const [isTransferring, setIsTransferring] = React.useState(false);

  const loadProducts = React.useCallback(() => {
    if (!token) return;
    const url = selectedStoreId
      ? `/api/products?skip=0&limit=200&store_id=${selectedStoreId}`
      : "/api/products?skip=0&limit=200";
    apiRequest<Product[]>(url, { token })
      .then(setProducts)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load warehouse items");
      });
  }, [token, selectedStoreId]);

  function openActions(p: Product) {
    setSelected(p);
    setAdjustQty("1");
    setSheetOpen(true);
  }

  function updateLocalProduct(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  }

  async function patchQuantity(delta: number) {
    if (!token || !selected) return;
    const amount = Math.max(1, Number.parseInt(adjustQty || "1", 10) || 1);
    const nextQty = Math.max(0, (selected.quantity ?? 0) + delta * amount);
    setIsActionBusy(true);
    setError(null);
    try {
      const updated = await apiRequest<Product>(`/api/products/${selected.id}`, {
        method: "PATCH",
        token,
        body: { quantity: nextQty },
      });
      updateLocalProduct(updated);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to update quantity");
    } finally {
      setIsActionBusy(false);
    }
  }

  async function onDelete() {
    if (!token || !selected) return;
    setIsActionBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/products/${selected.id}`, { method: "DELETE", token });
      setProducts((prev) => prev.filter((p) => p.id !== selected.id));
      setSheetOpen(false);
      setSelected(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to delete item");
    } finally {
      setIsActionBusy(false);
    }
  }

  React.useEffect(() => {
    if (!token) return;
    let canceled = false;

    const url = selectedStoreId ? `/api/products?skip=0&limit=200&store_id=${selectedStoreId}` : "/api/products?skip=0&limit=200";
    apiRequest<Product[]>(url, { token })
      .then((list) => {
        if (!canceled) setProducts(list);
      })
      .catch((err) => {
        if (canceled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load warehouse items");
      });

    return () => {
      canceled = true;
    };
  }, [token, selectedStoreId]);

  React.useEffect(() => {
    if (!token) return;
    apiRequest<{ id: string; name: string; location?: string | null }[]>("/api/business/stores", { token })
      .then(setStores)
      .catch(() => setStores([]));
  }, [token]);

  React.useEffect(loadProducts, [loadProducts]);

  function openTransfer() {
    if (!selected) return;
    setFromStoreId(selectedStoreId || "");
    setToStoreId("");
    setTransferQty(String(Math.max(1, selected.quantity ?? 0)));
    setTransferOpen(true);
  }

  async function submitTransfer() {
    if (!token || !selected || !fromStoreId || !toStoreId) return;
    const qty = Math.max(1, Number.parseInt(transferQty || "1", 10) || 1);
    const availableInSource = selected.quantity ?? 0;
    if (selectedStoreId && selectedStoreId === fromStoreId && qty > availableInSource) {
      setError("Quantity exceeds available stock in this branch");
      return;
    }
    if (!selectedStoreId && qty > availableInSource) {
      setError("Quantity exceeds available stock");
      return;
    }
    if (fromStoreId === toStoreId) {
      setError("From and To store must be different");
      return;
    }
    setError(null);
    setIsTransferring(true);
    try {
      await apiRequest("/api/transfers", {
        method: "POST",
        token,
        body: {
          from_store_id: fromStoreId,
          to_store_id: toStoreId,
          product_id: selected.id,
          quantity: qty,
        },
      });
      loadProducts();
      if (selectedStoreId === fromStoreId) {
        updateLocalProduct({ ...selected, quantity: availableInSource - qty });
      }
      setTransferOpen(false);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = `${p.name} ${p.sku} ${p.barcode ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, query]);

  return (
    <div className="mx-auto w-full max-w-md space-y-3 sm:max-w-5xl lg:max-w-7xl">
      {stores.length > 1 ? (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <select
            className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
          >
            <option value="">All branches (total)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-9" />
        </div>

        <Button variant="outline" size="icon" aria-label="Scan">
          <QrCode className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Collections">
          <Layers3 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <button type="button" className="inline-flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter</span>
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent">
          <ArrowDownUp className="h-3.5 w-3.5" />
          <span>Sort by</span>
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent">
          <Boxes className="h-3.5 w-3.5" />
          <span>Collection</span>
        </button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="divide-y rounded-lg border bg-card lg:grid lg:grid-cols-2 xl:grid-cols-2 lg:divide-y-0 lg:gap-4 lg:divide-x-0">
        {filtered.map((p) => {
          const available = p.quantity > 0;
          const outOfStock = p.quantity <= 0;
          const initials = (p.name || "Item")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("");

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`flex w-full cursor-pointer gap-3 p-3 text-left hover:bg-accent/50 lg:rounded-lg lg:border lg:p-4 ${outOfStock ? "border-l-4 border-l-destructive bg-destructive/5 lg:border-l-4" : ""}`}
              onClick={() => openActions(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openActions(p);
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
                  {p.image_url ? (
                    <img
                      src={getFullImageUrl(p.image_url) ?? p.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || "IMG"
                  )}
                </div>
                <div
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                    (available
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300")
                  }
                >
                  {available ? "Available" : "Out of stock"}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      P.N: {p.sku}
                      {p.barcode ? ` · Barcode: ${p.barcode}` : ""}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="More"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openActions(p);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-muted-foreground">
                    stock: <span className="text-primary">{p.quantity}</span>{" "}
                    <span className="text-primary">
                      ({selectedStoreId ? stores.find((s) => s.id === selectedStoreId)?.name ?? "Branch" : "Total"})
                    </span>
                    <span className="mx-2">·</span>
                    Price: <span className="text-primary">{formatMoney(p.selling_price)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Quantity: <span className={available ? "text-foreground" : "font-semibold text-destructive"}>{p.quantity}</span>
                    {outOfStock ? " (insufficient)" : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No items found.</div>
        ) : null}
      </div>

      <Button
        asChild
        className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white sm:max-w-5xl sm:bottom-6 sm:w-[min(56rem,calc(100%-2rem))]"
      >
        <Link to="/warehouse/add">
          <Plus className="h-4 w-4" />
          Add item to Warehouse
        </Link>
      </Button>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelected(null);
        }}
        title={
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 truncate">{selected?.name ?? ""}</div>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => setSheetOpen(false)}
            >
              ✕
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
            <div>
              <div className="text-xs font-medium text-amber-800 dark:text-amber-200">Update stock safety</div>
              <div className="text-xs text-amber-700 dark:text-amber-300">Minimum stock safety is set to 10</div>
            </div>
            <Button type="button" variant="outline" size="icon" aria-label="Stock safety" className="border-amber-300 dark:border-amber-700">
              <Layers2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="text-xs text-muted-foreground">Qty</div>
            <Input
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              inputMode="numeric"
              className="h-9 w-24"
            />
            <div className="ml-auto text-xs text-muted-foreground">
              Current: <span className="text-foreground">{selected?.quantity ?? "—"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                if (!selected) return;
                navigate(`/products?edit=${encodeURIComponent(selected.id)}`);
                setSheetOpen(false);
              }}
              disabled={!selected}
            >
              <FileText className="h-4 w-4" />
              Show product detail
            </Button>

            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                if (!selected) return;
                navigate(`/products?edit=${encodeURIComponent(selected.id)}`);
                setSheetOpen(false);
              }}
              disabled={!selected}
            >
              <SquarePen className="h-4 w-4" />
              Edit item
            </Button>

            <Button
              type="button"
              variant="outline"
              className="justify-start border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              onClick={() => patchQuantity(+1)}
              disabled={!selected || isActionBusy}
            >
              <Download className="h-4 w-4" />
              Stock in
            </Button>

            <Button
              type="button"
              variant="outline"
              className="justify-start border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
              onClick={() => patchQuantity(-1)}
              disabled={!selected || isActionBusy}
            >
              <Upload className="h-4 w-4" />
              Stock out
            </Button>

            <Button
              type="button"
              variant="outline"
              className="col-span-2 justify-start border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
              disabled={!selected || isActionBusy}
              onClick={openTransfer}
            >
              <Upload className="h-4 w-4" />
              Transfer to Branch
            </Button>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={onDelete}
            disabled={!selected || isActionBusy}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={
          <div className="flex items-center justify-between gap-3">
            <span>Transfer to Branch</span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              onClick={() => setTransferOpen(false)}
            >
              ✕
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {selected ? (
            <>
              <div className="rounded-lg border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground">Product</div>
                <div className="font-medium">{selected.name}</div>
                <div className="text-xs text-muted-foreground">Available: {selected.quantity ?? 0}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From store</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={fromStoreId}
                  onChange={(e) => setFromStoreId(e.target.value)}
                >
                  <option value="">Select store</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To store</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                >
                  <option value="">Select store</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={selected.quantity ?? 0}
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                />
              </div>
              {stores.length < 2 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  Add at least two branches to transfer between them.{" "}
                  <Link to="/branches" className="font-medium underline" onClick={() => setTransferOpen(false)}>
                    Add branches
                  </Link>
                </div>
              ) : null}
              <Button
                className="w-full"
                disabled={!fromStoreId || !toStoreId || fromStoreId === toStoreId || isTransferring || stores.length < 2}
                onClick={submitTransfer}
              >
                {isTransferring ? "Transferring..." : "Transfer"}
              </Button>
            </>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}
