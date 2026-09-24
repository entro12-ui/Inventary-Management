import * as React from "react";

import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { ApiError, apiRequest, getApiBaseUrl, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SaleUnitFields } from "@/components/ui/sale-unit-fields";
import { ExpiryBadge } from "@/components/ui/expiry-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateInputToIso, toDateInputValue } from "@/lib/expiry";
import { saleUnitLabel, saleUnitShort } from "@/lib/sale-unit";
import type { SaleUnit } from "@/lib/sale-unit";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  business_id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  min_stock?: number;
  sale_unit?: SaleUnit | string | null;
  sale_unit_custom?: string | null;
  batch_no?: string | null;
  expiry_date?: string | null;
};

type SortMode = "name_asc" | "name_desc" | "qty_desc" | "price_desc" | "expiry_asc";

const PAGE_SIZE = 10;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "qty_desc", label: "Stock high→low" },
  { value: "price_desc", label: "Price high→low" },
  { value: "expiry_asc", label: "Expiry soonest" },
];

export function ProductsPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const deepLinkEditId = searchParams.get("edit");
  const appliedDeepLinkRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [query, setQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("name_asc");
  const [page, setPage] = React.useState(1);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [sellingPrice, setSellingPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("0");
  const [minStock, setMinStock] = React.useState("10");
  const [saleUnit, setSaleUnit] = React.useState<SaleUnit>("piece");
  const [saleUnitCustom, setSaleUnitCustom] = React.useState("");
  const [businessMinStock, setBusinessMinStock] = React.useState(10);
  const [batchNo, setBatchNo] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  async function uploadImage(file: File): Promise<string> {
    if (!token) throw new Error("Not authenticated");
    const baseUrl = getApiBaseUrl();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${baseUrl}/api/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");
    if (!res.ok) {
      const message = typeof (payload as any)?.detail === "string" ? (payload as any).detail : "Upload failed";
      throw new Error(message);
    }
    const returnedUrl = (payload as any)?.url as string | undefined;
    if (!returnedUrl) throw new Error("Upload failed");
    return returnedUrl;
  }

  async function load() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const [list, business] = await Promise.all([
        apiRequest<Product[]>("/api/products?skip=0&limit=200", { token }),
        apiRequest<{ default_min_stock?: number }>("/api/business/me", { token }).catch(() => null),
      ]);
      const bizMin = business?.default_min_stock ?? 10;
      setBusinessMinStock(bizMin);
      setProducts(list);
      if (deepLinkEditId && !appliedDeepLinkRef.current) {
        const target = list.find((p) => p.id === deepLinkEditId);
        if (target) {
          appliedDeepLinkRef.current = true;
          openEdit(target, bizMin);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deepLinkEditId]);

  React.useEffect(() => {
    setPage(1);
  }, [query, sortMode]);

  const filteredSorted = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = products;
    if (q) {
      rows = rows.filter((p) => {
        const hay = `${p.name} ${p.sku} ${p.barcode ?? ""} ${p.batch_no ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    rows = [...rows].sort((a, b) => {
      switch (sortMode) {
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "qty_desc":
          return (b.quantity ?? 0) - (a.quantity ?? 0);
        case "price_desc":
          return (b.selling_price ?? 0) - (a.selling_price ?? 0);
        case "expiry_asc": {
          const ae = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.POSITIVE_INFINITY;
          const be = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.POSITIVE_INFINITY;
          return ae - be;
        }
        case "name_asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return rows;
  }, [products, query, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetForm() {
    setEditingProductId(null);
    setName("");
    setSku("");
    setCostPrice("");
    setSellingPrice("");
    setQuantity("0");
    setMinStock(String(businessMinStock));
    setSaleUnit("piece");
    setSaleUnitCustom("");
    setBatchNo("");
    setExpiryDate("");
    setImageUrl(null);
    setFormError(null);
  }

  function openAdd() {
    resetForm();
    setSheetOpen(true);
  }

  function openEdit(p: Product, bizMin = businessMinStock) {
    setEditingProductId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCostPrice(String(p.cost_price));
    setSellingPrice(String(p.selling_price));
    setQuantity(String(p.quantity));
    setMinStock(String(p.min_stock ?? bizMin));
    setSaleUnit((p.sale_unit as SaleUnit) || "piece");
    setSaleUnitCustom(p.sale_unit_custom ?? "");
    setBatchNo(p.batch_no ?? "");
    setExpiryDate(toDateInputValue(p.expiry_date));
    setImageUrl(p.image_url ?? null);
    setFormError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    resetForm();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (saleUnit === "other" && !saleUnitCustom.trim()) {
        setFormError("Select or type a custom unit for Other");
        setIsSubmitting(false);
        return;
      }
      const body = {
        name: name.trim(),
        sku: sku.trim(),
        cost_price: Number(costPrice),
        selling_price: Number(sellingPrice),
        quantity: Number(quantity),
        min_stock: Math.max(0, Number(minStock) || 0),
        sale_unit: saleUnit,
        sale_unit_custom: saleUnit === "other" ? saleUnitCustom.trim() : null,
        image_url: imageUrl,
        batch_no: batchNo.trim() || null,
        expiry_date: dateInputToIso(expiryDate),
      };
      if (editingProductId) {
        await apiRequest<Product>(`/api/products/${editingProductId}`, { method: "PATCH", token, body });
      } else {
        await apiRequest<Product>("/api/products", { method: "POST", token, body });
      }
      closeSheet();
      await load();
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError(editingProductId ? "Failed to update product" : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-28 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            {filteredSorted.length} product{filteredSorted.length === 1 ? "" : "s"}
            {query ? " found" : ""}
          </p>
        </div>
        <Button className="hidden shrink-0 sm:inline-flex" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, barcode, batch…"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortMode(opt.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                sortMode === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
            Loading products…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-border p-8 text-center">
            <div className="font-display text-base font-semibold">
              {query ? "No products match" : "No products yet"}
            </div>
            <p className="text-sm text-muted-foreground">
              {query ? "Try another search." : "Tap Add product to create your first item."}
            </p>
            {!query ? (
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            ) : null}
          </div>
        ) : (
          pageItems.map((p) => {
            const initials = (p.name || "P")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase())
              .join("");
            const min = p.min_stock ?? businessMinStock;
            const isLow = p.quantity > 0 && p.quantity <= min;
            const isOut = p.quantity <= 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openEdit(p)}
                className={cn(
                  "flex w-full gap-3 rounded-xl border border-border/70 bg-card p-3 text-left shadow-sm transition active:scale-[0.99] hover:bg-accent/40",
                  isLow && "border-warning/40 bg-warning/5",
                  isOut && "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  {p.image_url ? (
                    <img
                      src={getFullImageUrl(p.image_url) ?? p.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials || "P"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    SKU {p.sku}
                    {p.batch_no ? ` · Batch ${p.batch_no}` : ""}
                    {` · ${saleUnitLabel(p.sale_unit, p.sale_unit_custom)}`}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <ExpiryBadge expiry={p.expiry_date} />
                    {isOut ? (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        Out of stock
                      </span>
                    ) : isLow ? (
                      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                        Soon out of stock · reorder
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <span
                      className={cn(
                        isOut || isLow ? "font-semibold text-destructive" : "text-muted-foreground",
                      )}
                    >
                      Qty {p.quantity} {saleUnitShort(p.sale_unit, p.sale_unit_custom)}
                      <span className="font-normal text-muted-foreground"> · min {min}</span>
                    </span>
                    <span className="font-semibold text-foreground">{Number(p.selling_price).toFixed(2)} ETB</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {filteredSorted.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <div className="text-xs font-medium text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {/* Mobile FAB — always reachable above bottom nav */}
      <Button
        className={cn(
          "fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg shadow-primary/30 sm:hidden",
          sheetOpen && "hidden",
        )}
        size="icon"
        aria-label="Add product"
        onClick={openAdd}
      >
        <Plus className="h-5 w-5" />
      </Button>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
          else setSheetOpen(true);
        }}
        title={
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-base font-semibold">
              {editingProductId ? "Edit product" : "Add product"}
            </span>
            <button type="button" aria-label="Close" className="rounded p-1 hover:bg-accent" onClick={closeSheet}>
              <X className="h-5 w-5" />
            </button>
          </div>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFormError(null);
              setIsUploadingImage(true);
              try {
                const url = await uploadImage(file);
                setImageUrl(url);
              } catch (err) {
                setImageUrl(null);
                setFormError(err instanceof Error ? err.message : "Failed to upload image");
              } finally {
                setIsUploadingImage(false);
                e.currentTarget.value = "";
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/40 text-muted-foreground"
          >
            {imageUrl ? (
              <img
                alt="Product"
                src={getFullImageUrl(imageUrl) ?? imageUrl}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <span
              className={cn(
                "text-xs font-medium",
                imageUrl && "relative rounded-md bg-background/80 px-3 py-1.5",
              )}
            >
              {isUploadingImage ? "Uploading…" : imageUrl ? "Change photo" : "Add photo (optional)"}
            </span>
          </button>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required className="h-11" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost *</Label>
              <Input
                id="cost"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling">Sell price *</Label>
              <Input
                id="selling"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </div>

          <SaleUnitFields
            saleUnit={saleUnit}
            saleUnitCustom={saleUnitCustom}
            onSaleUnitChange={setSaleUnit}
            onSaleUnitCustomChange={setSaleUnitCustom}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity ({saleUnitShort(saleUnit, saleUnitCustom)})</Label>
              <Input
                id="qty"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">This item’s min stock *</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">Batch / Lot</Label>
            <Input
              id="batch"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="Optional"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Set each product’s own alert level. Prefilled from business default ({businessMinStock}).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry date</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-11"
            />
          </div>

          {formError ? <div className="text-sm text-destructive">{formError}</div> : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={closeSheet} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-11" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editingProductId ? "Save changes" : "Create product"}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
