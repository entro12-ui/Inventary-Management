import * as React from "react";

import { Minus, Plus, Search, Trash2, X as XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getApiBaseUrl, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { ExpiryBadge } from "@/components/ui/expiry-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saleUnitShort } from "@/lib/sale-unit";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  part_no?: string | null;
  barcode?: string | null;
  quantity: number;
  min_stock?: number;
  sale_unit?: string | null;
  sale_unit_custom?: string | null;
  selling_price: number;
  image_url?: string | null;
  expiry_date?: string | null;
};

type LineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "card" | "credit";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: "cash", label: "Cash", hint: "Marked paid immediately" },
  { value: "mobile_money", label: "Mobile money", hint: "Upload transfer screenshot — marked paid" },
  { value: "bank_transfer", label: "Bank transfer", hint: "Upload transfer screenshot — marked paid" },
  { value: "card", label: "Card", hint: "Marked paid immediately" },
  { value: "credit", label: "Credit", hint: "Customer pays later — name recommended" },
];

function needsPaymentProof(method: PaymentMethod): boolean {
  return method === "bank_transfer" || method === "mobile_money";
}
export function SalesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [items, setItems] = React.useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = React.useState("");
  const [showProductSearch, setShowProductSearch] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [storeId, setStoreId] = React.useState<string>("");
  const [stores, setStores] = React.useState<{ id: string; name: string }[]>([]);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [note, setNote] = React.useState("");
  const [showNote, setShowNote] = React.useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = React.useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);
  const proofInputRef = React.useRef<HTMLInputElement | null>(null);

  const isCredit = paymentMethod === "credit";
  const requiresProof = needsPaymentProof(paymentMethod);

  const [businessMinStock, setBusinessMinStock] = React.useState(10);

  const lowStockProducts = React.useMemo(
    () =>
      products.filter((p) => {
        const min = p.min_stock ?? businessMinStock;
        return p.quantity > 0 && p.quantity <= min;
      }),
    [products, businessMinStock],
  );

  const searchLower = productSearch.trim().toLowerCase();
  const availableProducts = React.useMemo(() => {
    const inCart = new Set(items.map((i) => i.productId));
    return products.filter((p) => !inCart.has(p.id));
  }, [products, items]);
  const filteredProducts = React.useMemo(() => {
    if (!searchLower) return availableProducts.slice(0, 20);
    return availableProducts
      .filter((p) => {
        const name = (p.name ?? "").toLowerCase();
        const sku = (p.sku ?? p.part_no ?? "").toLowerCase();
        const barcode = (p.barcode ?? "").toLowerCase();
        return name.includes(searchLower) || sku.includes(searchLower) || barcode.includes(searchLower);
      })
      .slice(0, 20);
  }, [availableProducts, searchLower]);

  async function load(selectedStore?: string) {
    if (!token) return;
    setError(null);
    try {
      const storeParam = selectedStore || storeId;
      const productsUrl = storeParam
        ? `/api/products?skip=0&limit=200&store_id=${storeParam}`
        : "/api/products?skip=0&limit=200";
      const [productList, storeList, business] = await Promise.all([
        apiRequest<Product[]>(productsUrl, { token }),
        apiRequest<{ id: string; name: string }[]>("/api/business/stores", { token }),
        apiRequest<{ default_min_stock?: number }>("/api/business/me", { token }).catch(() => null),
      ]);
      setProducts(productList);
      setStores(storeList ?? []);
      if (storeList?.length) setStoreId((prev) => prev || storeList[0].id);
      if (business?.default_min_stock != null) setBusinessMinStock(business.default_min_stock);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load products");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  React.useEffect(() => {
    if (!token || !storeId) return;
    load(storeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  function getProduct(id: string) {
    return products.find((p) => p.id === id) ?? null;
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  function addProduct(p: Product) {
    if ((p.quantity ?? 0) <= 0) return;
    if (items.some((i) => i.productId === p.id)) return;
    setItems((prev) => [...prev, { productId: p.id, quantity: 1, unitPrice: Number(p.selling_price ?? 0) }]);
    setProductSearch("");
    setShowProductSearch(false);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, ...patch };
        const product = getProduct(it.productId);
        const maxQty = product?.quantity ?? next.quantity;
        if (next.quantity > maxQty) next.quantity = Math.max(1, maxQty);
        if (next.quantity < 1) next.quantity = 1;
        return next;
      }),
    );
  }

  function bumpQty(index: number, delta: number) {
    const item = items[index];
    if (!item) return;
    updateItem(index, { quantity: item.quantity + delta });
  }

  async function uploadProof(file: File): Promise<string> {
    if (!token) throw new Error("Not authenticated");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${getApiBaseUrl()}/api/uploads/image`, {
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

  async function onCreateSale() {
    if (!token) return;
    if (items.length === 0) {
      setError("Add at least one product to the sale");
      return;
    }
    for (const item of items) {
      const product = getProduct(item.productId);
      if (!product) {
        setError("A product in the cart is no longer available");
        return;
      }
      if (item.quantity > (product.quantity ?? 0)) {
        setError(`Not enough stock for ${product.name} (available: ${product.quantity})`);
        return;
      }
    }
    if (isCredit && !customerName.trim()) {
      setError("Enter a customer name for credit sales");
      return;
    }
    if (requiresProof && !paymentProofUrl) {
      setError("Upload a payment screenshot before completing the sale");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest("/api/sales", {
        method: "POST",
        token,
        body: {
          payment_method: paymentMethod,
          store_id: storeId || null,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          notes: note.trim() || null,
          payment_proof_url: requiresProof ? paymentProofUrl : null,
          items: items.map((i) => ({
            product_id: i.productId,
            quantity: Number(i.quantity),
            unit_price: Number(i.unitPrice),
          })),
        },
      });
      navigate("/shop");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  }

  const paymentHint = PAYMENT_OPTIONS.find((p) => p.value === paymentMethod)?.hint;

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-36 sm:max-w-5xl sm:pb-28 lg:max-w-7xl">
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          <div className="font-display text-lg font-semibold tracking-tight">New sale</div>
          <div className="text-xs text-muted-foreground">
            {items.length === 0
              ? "Search and add products below"
              : `${items.length} product${items.length === 1 ? "" : "s"} · ${itemCount} units`}
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={() => navigate(-1)}>
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      {lowStockProducts.length > 0 ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
          <div className="text-sm font-semibold text-warning-foreground">
            Soon out of stock — reorder ({lowStockProducts.length})
          </div>
          <ul className="mt-2 space-y-1">
            {lowStockProducts.slice(0, 5).map((p) => (
              <li key={p.id} className="flex justify-between gap-2 text-xs">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 font-semibold text-destructive">
                  Qty {p.quantity} / min {p.min_stock ?? businessMinStock}
                </span>
              </li>
            ))}
          </ul>
          {lowStockProducts.length > 5 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">+{lowStockProducts.length - 5} more in stock list</p>
          ) : null}
        </div>
      ) : null}

      {stores.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
          <Label htmlFor="store">Selling from branch</Label>
          <select
            id="store"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setItems([]);
            }}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Stock quantities update for the selected branch.</p>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Products</div>
            <div className="text-xs text-muted-foreground">
              {items.length === 0 ? "Add items to start the sale" : `${items.length} in cart`}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={showProductSearch ? "secondary" : "default"}
            onClick={() => setShowProductSearch((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            {showProductSearch ? "Close" : "Add product"}
          </Button>
        </div>

        {showProductSearch ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, SKU, or barcode…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border bg-background">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchLower ? "No products match" : "No more products to add"}
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = (p.quantity ?? 0) <= 0;
                  const min = p.min_stock ?? businessMinStock;
                  const isLow = !isOutOfStock && p.quantity <= min;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 border-b p-3 text-left last:border-b-0 hover:bg-accent",
                        isOutOfStock && "cursor-not-allowed opacity-60",
                        isLow && "bg-warning/5",
                      )}
                      onClick={() => !isOutOfStock && addProduct(p)}
                      disabled={isOutOfStock}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                        {p.image_url ? (
                          <img
                            src={getFullImageUrl(p.image_url) ?? p.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[p.sku ?? p.part_no, p.barcode].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ExpiryBadge expiry={p.expiry_date} />
                          {isLow ? (
                            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                              Reorder
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "text-xs",
                            isOutOfStock || isLow ? "font-medium text-destructive" : "text-muted-foreground",
                          )}
                        >
                          Stock {p.quantity} {saleUnitShort(p.sale_unit, p.sale_unit_custom)}
                          {isLow ? ` · min ${min}` : ""} · {Number(p.selling_price).toFixed(2)} ETB
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isOutOfStock ? "text-muted-foreground" : "text-primary",
                        )}
                      >
                        {isOutOfStock ? "Out of stock" : "Add"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Cart</div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              isCredit ? "bg-warning/20 text-warning-foreground" : "bg-primary/15 text-primary",
            )}
          >
            {isCredit ? "Credit · unpaid" : "Will mark paid"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Cart is empty. Use search above to add products.
          </div>
        ) : (
          items.map((item, index) => {
            const product = getProduct(item.productId);
            const name = product?.name ?? "—";
            const stock = product?.quantity ?? 0;
            const imageUrl = product?.image_url ?? null;
            const lineTotal = item.quantity * item.unitPrice;
            const overStock = item.quantity > stock;

            return (
              <div
                key={`${item.productId}-${index}`}
                className={cn("space-y-2 rounded-lg border p-3", overStock && "border-destructive/50 bg-destructive/5")}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {imageUrl ? (
                      <img
                        src={getFullImageUrl(imageUrl) ?? imageUrl}
                        alt={name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      SKU: {product?.sku ?? product?.part_no ?? "—"}
                    </div>
                    <div className={cn("mt-1 text-xs", overStock ? "font-semibold text-destructive" : "text-muted-foreground")}>
                      Available stock: {stock} {saleUnitShort(product?.sale_unit, product?.sale_unit_custom)}
                      {overStock ? " — reduce quantity" : ""}
                    </div>
                    <div className="mt-1">
                      <ExpiryBadge expiry={product?.expiry_date} />
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => bumpQty(index, -1)}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max={stock}
                        className="h-9 w-14 text-center"
                        value={String(item.quantity)}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value || 1) })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => bumpQty(index, 1)}
                        disabled={item.quantity >= stock}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(item.unitPrice)}
                      onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value || 0) })}
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <Label className="text-xs">Line total</Label>
                    <div className="flex h-10 items-center justify-end px-1 text-sm font-semibold">
                      {lineTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Sale total</span>
          <span className="font-display text-lg font-semibold">{total.toFixed(2)} ETB</span>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
        <div className="text-sm font-semibold">Payment method</div>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={paymentMethod}
          onChange={(e) => {
            const next = e.target.value as PaymentMethod;
            setPaymentMethod(next);
            if (!needsPaymentProof(next)) setPaymentProofUrl(null);
          }}
        >
          {PAYMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {paymentHint ? <p className="text-xs text-muted-foreground">{paymentHint}</p> : null}

        {requiresProof ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <input
              ref={proofInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setError(null);
                setIsUploadingProof(true);
                try {
                  const url = await uploadProof(file);
                  setPaymentProofUrl(url);
                } catch (err) {
                  setPaymentProofUrl(null);
                  setError(err instanceof Error ? err.message : "Failed to upload screenshot");
                } finally {
                  setIsUploadingProof(false);
                  e.currentTarget.value = "";
                }
              }}
            />
            <Label>
              {paymentMethod === "mobile_money" ? "Mobile money screenshot *" : "Bank transfer screenshot *"}
            </Label>
            <button
              type="button"
              onClick={() => proofInputRef.current?.click()}
              className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40 text-sm text-muted-foreground"
            >
              {paymentProofUrl ? (
                <img
                  src={getFullImageUrl(paymentProofUrl) ?? paymentProofUrl}
                  alt="Payment proof"
                  className="absolute inset-0 h-full w-full object-contain bg-background"
                />
              ) : null}
              <span
                className={cn(
                  "relative rounded-md bg-background/85 px-3 py-1.5 text-xs font-medium",
                  !paymentProofUrl && "bg-transparent",
                )}
              >
                {isUploadingProof
                  ? "Uploading…"
                  : paymentProofUrl
                    ? "Change screenshot"
                    : "Upload transfer screenshot"}
              </span>
            </button>
            {!paymentProofUrl ? (
              <p className="text-xs text-muted-foreground">Required for {paymentMethod === "mobile_money" ? "mobile money" : "bank transfer"} sales.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            Customer {isCredit ? <span className="text-destructive">*</span> : "(optional)"}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomerName("");
              setCustomerPhone("");
            }}
          >
            Clear
          </Button>
        </div>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={isCredit ? "Customer name (required for credit)" : "Customer name"}
        />
        <Input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Phone (optional)"
          type="tel"
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="link" onClick={() => setShowNote((v) => !v)}>
          {showNote ? "Hide note" : "Add note"}
        </Button>
      </div>

      {showNote ? (
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <Label htmlFor="note">Note</Label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Optional note for this sale"
          />
        </div>
      ) : null}

      {error ? <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t bg-background/95 backdrop-blur sm:bottom-0">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 sm:max-w-5xl sm:pb-[env(safe-area-inset-bottom)]">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">Total</div>
            <div className="truncate text-sm font-semibold">{total.toFixed(2)} ETB</div>
          </div>
          <Button
            className="h-11 min-w-[9.5rem] shrink-0 px-4"
            disabled={isSubmitting || items.length === 0 || (requiresProof && !paymentProofUrl)}
            onClick={onCreateSale}
          >
            {isSubmitting
              ? "Saving…"
              : isCredit
                ? "Save credit"
                : requiresProof && !paymentProofUrl
                  ? "Add screenshot"
                  : "Complete sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
