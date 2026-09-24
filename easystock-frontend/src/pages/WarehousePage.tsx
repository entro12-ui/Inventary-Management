import * as React from "react";

import {
  Building2,
  Filter,
  FileText,
  Layers2,
  MoreHorizontal,
  Plus,
  Search,
  SquarePen,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ExpiryBadge } from "@/components/ui/expiry-badge";
import { Input } from "@/components/ui/input";
import { SaleUnitFields } from "@/components/ui/sale-unit-fields";
import { getExpiryStatus } from "@/lib/expiry";
import { saleUnitLabel, saleUnitShort } from "@/lib/sale-unit";
import type { SaleUnit } from "@/lib/sale-unit";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  batch_no?: string | null;
  selling_price: number;
  quantity: number;
  min_stock?: number;
  sale_unit?: string | null;
  sale_unit_custom?: string | null;
  image_url?: string | null;
  expiry_date?: string | null;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function WarehousePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const expiringOnly = searchParams.get("expiring") === "1";
  const stockFilter = searchParams.get("stock"); // "out" | "low" | null
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = React.useState(initialQuery);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [adjustQty, setAdjustQty] = React.useState("1");
  const [minStockEdit, setMinStockEdit] = React.useState("10");
  const [saleUnitEdit, setSaleUnitEdit] = React.useState<SaleUnit>("piece");
  const [saleUnitCustomEdit, setSaleUnitCustomEdit] = React.useState("");
  const [isActionBusy, setIsActionBusy] = React.useState(false);

  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");
  const [stores, setStores] = React.useState<{ id: string; name: string; location?: string | null }[]>([]);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [fromStoreId, setFromStoreId] = React.useState("");
  const [toStoreId, setToStoreId] = React.useState("");
  const [transferQty, setTransferQty] = React.useState("1");
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [businessMinStock, setBusinessMinStock] = React.useState(10);

  React.useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const loadProducts = React.useCallback(() => {
    if (!token) return;
    const params = new URLSearchParams({ skip: "0", limit: "200" });
    if (selectedStoreId) params.set("store_id", selectedStoreId);
    // Stock filters need full list; only use API expiring filter when that chip is active alone
    if (expiringOnly && stockFilter !== "out" && stockFilter !== "low") {
      params.set("expiring", "true");
    }
    apiRequest<Product[]>(`/api/products?${params}`, { token })
      .then(setProducts)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load warehouse items");
      });
  }, [token, selectedStoreId, expiringOnly, stockFilter]);

  function openActions(p: Product) {
    setSelected(p);
    setAdjustQty("1");
    setMinStockEdit(String(p.min_stock ?? businessMinStock));
    setSaleUnitEdit(((p.sale_unit as SaleUnit) || "piece"));
    setSaleUnitCustomEdit(p.sale_unit_custom ?? "");
    setSheetOpen(true);
  }

  function updateLocalProduct(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  }

  async function saveMinStock() {
    if (!token || !selected) return;
    const value = Math.max(0, Number.parseInt(minStockEdit || "0", 10) || 0);
    setIsActionBusy(true);
    setError(null);
    try {
      const updated = await apiRequest<Product>(`/api/products/${selected.id}`, {
        method: "PATCH",
        token,
        body: { min_stock: value },
      });
      updateLocalProduct(updated);
      setMinStockEdit(String(updated.min_stock ?? value));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to update minimum stock");
    } finally {
      setIsActionBusy(false);
    }
  }

  async function saveSaleUnit() {
    if (!token || !selected) return;
    if (saleUnitEdit === "other" && !saleUnitCustomEdit.trim()) {
      setError("Select or type a custom unit for Other");
      return;
    }
    setIsActionBusy(true);
    setError(null);
    try {
      const updated = await apiRequest<Product>(`/api/products/${selected.id}`, {
        method: "PATCH",
        token,
        body: {
          sale_unit: saleUnitEdit,
          sale_unit_custom: saleUnitEdit === "other" ? saleUnitCustomEdit.trim() : null,
        },
      });
      updateLocalProduct(updated);
      setSaleUnitEdit(((updated.sale_unit as SaleUnit) || saleUnitEdit));
      setSaleUnitCustomEdit(updated.sale_unit_custom ?? "");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to update sold-as unit");
    } finally {
      setIsActionBusy(false);
    }
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
    loadProducts();
  }, [loadProducts]);

  React.useEffect(() => {
    if (!token) return;
    apiRequest<{ id: string; name: string; location?: string | null }[]>("/api/business/stores", { token })
      .then(setStores)
      .catch(() => setStores([]));
    apiRequest<{ default_min_stock?: number }>("/api/business/me", { token })
      .then((b) => {
        if (b.default_min_stock != null) setBusinessMinStock(b.default_min_stock);
      })
      .catch(() => {});
  }, [token]);

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
    return products.filter((p) => {
      if (stockFilter === "out" && (p.quantity ?? 0) > 0) return false;
      if (stockFilter === "low") {
        const min = p.min_stock ?? businessMinStock;
        const qty = p.quantity ?? 0;
        if (!(qty > 0 && qty <= min)) return false;
      }
      if (!q) return true;
      const hay = `${p.name} ${p.sku} ${p.barcode ?? ""} ${p.batch_no ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, query, stockFilter, businessMinStock]);

  function setAlertFilter(next: { stock?: "out" | "low" | null; expiring?: boolean }) {
    const params = new URLSearchParams(searchParams);
    if (next.stock === undefined) {
      /* keep */
    } else if (next.stock) {
      params.set("stock", next.stock);
      params.delete("expiring");
    } else {
      params.delete("stock");
    }
    if (next.expiring === undefined) {
      /* keep */
    } else if (next.expiring) {
      params.set("expiring", "1");
      params.delete("stock");
    } else {
      params.delete("expiring");
    }
    setSearchParams(params);
  }

  function toggleExpiring() {
    setAlertFilter({ expiring: !expiringOnly, stock: null });
  }

  function toggleStock(kind: "out" | "low") {
    const active = stockFilter === kind;
    setAlertFilter({ stock: active ? null : kind, expiring: false });
  }

  const filterLabel =
    stockFilter === "out"
      ? "Showing out-of-stock items"
      : stockFilter === "low"
        ? "Showing items that need reorder"
        : expiringOnly
          ? "Showing items expiring within 30 days"
          : "Stock across branches";

  return (
    <div className="mx-auto w-full max-w-md space-y-3 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Warehouse</h1>
          <p className="text-sm text-muted-foreground">{filterLabel}</p>
        </div>
      </div>

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
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, barcode, batch…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => toggleStock("low")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition",
            stockFilter === "low"
              ? "bg-warning/20 text-warning-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Need reorder</span>
        </button>
        <button
          type="button"
          onClick={() => toggleStock("out")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition",
            stockFilter === "out"
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Out of stock</span>
        </button>
        <button
          type="button"
          onClick={toggleExpiring}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition",
            expiringOnly
              ? "bg-warning/20 text-warning-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Expiring soon</span>
        </button>
        {(stockFilter || expiringOnly) && (
          <button
            type="button"
            onClick={() => setAlertFilter({ stock: null, expiring: false })}
            className="rounded-full bg-muted px-3 py-1.5 font-medium text-foreground hover:bg-accent"
          >
            Clear filter
          </button>
        )}
        <span className="text-muted-foreground">{filtered.length} items</span>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="divide-y rounded-xl border border-border/70 bg-card lg:grid lg:grid-cols-2 xl:grid-cols-2 lg:divide-y-0 lg:gap-4 lg:divide-x-0">
        {filtered.map((p) => {
          const available = p.quantity > 0;
          const outOfStock = p.quantity <= 0;
          const min = p.min_stock ?? businessMinStock;
          const lowStock = available && p.quantity <= min;
          const expiryStatus = getExpiryStatus(p.expiry_date);
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
              className={cn(
                "flex w-full cursor-pointer gap-3 p-3 text-left transition hover:bg-accent/50 lg:rounded-lg lg:border lg:p-4",
                outOfStock && "border-l-4 border-l-destructive bg-destructive/5 lg:border-l-4",
                lowStock && !outOfStock && "border-l-4 border-l-warning bg-warning/5",
                expiryStatus === "expired" && "border-l-4 border-l-destructive",
                expiryStatus === "soon" && !outOfStock && !lowStock && "border-l-4 border-l-warning",
              )}
              onClick={() => openActions(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openActions(p);
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-xs font-semibold text-muted-foreground">
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
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    outOfStock
                      ? "bg-destructive/10 text-destructive"
                      : lowStock
                        ? "bg-warning/20 text-warning-foreground"
                        : "bg-primary/15 text-primary",
                  )}
                >
                  {outOfStock ? "Out of stock" : lowStock ? "Reorder" : "Available"}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      SKU: {p.sku}
                      {p.barcode ? ` · ${p.barcode}` : ""}
                      {p.batch_no ? ` · Batch ${p.batch_no}` : ""}
                      {` · ${saleUnitLabel(p.sale_unit, p.sale_unit_custom)}`}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <ExpiryBadge expiry={p.expiry_date} />
                      {lowStock ? (
                        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                          Soon out of stock
                        </span>
                      ) : null}
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
                    stock:{" "}
                    <span className={cn(lowStock || outOfStock ? "font-semibold text-destructive" : "text-primary")}>
                      {p.quantity} {saleUnitShort(p.sale_unit, p.sale_unit_custom)}
                    </span>{" "}
                    <span className="text-muted-foreground">/ min {min}</span>{" "}
                    <span className="text-primary">
                      ({selectedStoreId ? stores.find((s) => s.id === selectedStoreId)?.name ?? "Branch" : "Total"})
                    </span>
                    <span className="mx-2">·</span>
                    Price: <span className="text-primary">{formatMoney(p.selling_price)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <div className="col-span-full space-y-2 p-8 text-center">
            <div className="font-display text-base font-semibold text-foreground">
              {stockFilter === "out"
                ? "No out-of-stock items"
                : stockFilter === "low"
                  ? "No items need reorder"
                  : expiringOnly
                    ? "No expiring items"
                    : "No stock items yet"}
            </div>
            <p className="text-sm text-muted-foreground">
              {stockFilter === "out"
                ? "All products currently have stock available."
                : stockFilter === "low"
                  ? "Nothing is at or below the minimum stock level."
                  : expiringOnly
                    ? "Nothing is expiring in the next 30 days — great for pharmacies and shops."
                    : "Add products with optional expiry and batch for pharmacy-ready tracking."}
            </p>
            {!expiringOnly && !stockFilter ? (
              <Button asChild className="mt-2">
                <Link to="/warehouse/add">Add first item</Link>
              </Button>
            ) : (expiringOnly || stockFilter) ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => setAlertFilter({ stock: null, expiring: false })}
              >
                Clear filter
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button
        asChild
        className={cn(
          "fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:bottom-6 sm:max-w-5xl sm:w-[min(56rem,calc(100%-2rem))]",
          (sheetOpen || transferOpen) && "hidden",
        )}
      >
        <Link to="/warehouse/add">
          <Plus className="h-4 w-4" />
          Add stock item
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
          <div className="space-y-2 rounded-lg border border-border/70 bg-card px-3 py-3">
            <SaleUnitFields
              compact
              idPrefix="wh-saleUnit"
              saleUnit={saleUnitEdit}
              saleUnitCustom={saleUnitCustomEdit}
              onSaleUnitChange={setSaleUnitEdit}
              onSaleUnitCustomChange={setSaleUnitCustomEdit}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!selected || isActionBusy}
              onClick={saveSaleUnit}
            >
              Save sold as
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-3">
            <div className="flex items-center gap-2">
              <Layers2 className="h-4 w-4 text-warning-foreground" />
              <div className="text-xs font-semibold text-warning-foreground">This item’s min stock</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Set a different alert level for this product (business default is {businessMinStock}).
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={minStockEdit}
                onChange={(e) => setMinStockEdit(e.target.value)}
                className="h-9 w-24"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selected || isActionBusy}
                onClick={saveMinStock}
              >
                Save min
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Qty ({saleUnitShort(selected?.sale_unit, selected?.sale_unit_custom)})
            </div>
            <Input
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              inputMode="numeric"
              className="h-9 w-24"
            />
            <div className="ml-auto text-xs text-muted-foreground">
              Current: <span className="text-foreground">{selected?.quantity ?? "—"}</span>
              {" · "}
              Min: <span className="text-foreground">{selected?.min_stock ?? businessMinStock}</span>
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
              className="justify-start"
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
              className="col-span-2 justify-start"
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
