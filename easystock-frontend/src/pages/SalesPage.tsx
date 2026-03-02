import * as React from "react";

import { Search, Trash2, X as XIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  part_no?: string | null;
  barcode?: string | null;
  quantity: number;
  selling_price: number;
  image_url?: string | null;
};

type LineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "card" | "credit";

export function SalesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [items, setItems] = React.useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = React.useState("");
  const [showProductSearch, setShowProductSearch] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("credit");
  const [storeId, setStoreId] = React.useState<string>("");
  const [stores, setStores] = React.useState<{ id: string; name: string }[]>([]);
  const [includeTax, setIncludeTax] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [note, setNote] = React.useState("");
  const [showNote, setShowNote] = React.useState(false);

  const unpaid = paymentMethod === "credit";

  const searchLower = productSearch.trim().toLowerCase();
  const availableProducts = React.useMemo(() => {
    const inCart = new Set(items.map((i) => i.productId));
    return products.filter((p) => !inCart.has(p.id));
  }, [products, items]);
  const filteredProducts = React.useMemo(() => {
    if (!searchLower) return availableProducts.slice(0, 20);
    return availableProducts.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const sku = (p.sku ?? p.part_no ?? "").toLowerCase();
      const barcode = (p.barcode ?? "").toLowerCase();
      return name.includes(searchLower) || sku.includes(searchLower) || barcode.includes(searchLower);
    }).slice(0, 20);
  }, [availableProducts, searchLower]);

  async function load() {
    if (!token) return;
    setError(null);
    try {
      const [productList, storeList] = await Promise.all([
        apiRequest<Product[]>("/api/products?skip=0&limit=200", { token }),
        apiRequest<{ id: string; name: string }[]>("/api/business/stores", { token }),
      ]);
      setProducts(productList);
      setStores(storeList ?? []);
      if (storeList?.length) setStoreId((prev) => prev || storeList[0].id);
      setItems((prev) => (prev.length > 0 ? prev : []));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load products");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function getProduct(id: string) {
    return products.find((p) => p.id === id) ?? null;
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function addProduct(p: Product) {
    if (items.some((i) => i.productId === p.id)) return;
    setItems((prev) => [...prev, { productId: p.id, quantity: 1, unitPrice: Number(p.selling_price ?? 0) }]);
    setProductSearch("");
    setShowProductSearch(false);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function onCreateSale() {
    if (!token) return;
    if (items.length === 0) {
      setError("Add at least one product");
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

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-24 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-sm font-semibold">Add new sale | stock {items.length}</div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={() => navigate(-1)}>
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex justify-center">
        <div className="rounded-md bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {unpaid ? "UNPAID" : "PAID"}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="text-sm font-semibold">Items</div>

        {items.map((item, index) => {
          const product = getProduct(item.productId);
          const name = product?.name ?? "—";
          const partNo = product?.part_no ?? "";
          const stock = product?.quantity ?? 0;
          const imageUrl = product?.image_url ?? null;
          const lineTotal = item.quantity * item.unitPrice;

          return (
            <div key={`${item.productId}-${index}`} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {imageUrl ? (
                    <img src={getFullImageUrl(imageUrl) ?? imageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  {partNo ? <div className="text-xs text-muted-foreground">P.N.: {partNo}</div> : null}
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <div className="text-muted-foreground">Price: {item.unitPrice.toFixed(1)}</div>
                    <div className={stock <= 0 ? "font-semibold text-destructive" : "text-primary"}>
                      stock {stock} {stock <= 0 ? "(out of stock)" : ""}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={String(item.quantity)}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value || 1) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={String(item.unitPrice)}
                    onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total</Label>
                  <div className="flex h-10 items-center justify-end rounded-md border bg-muted/30 px-3 text-sm font-semibold">
                    {lineTotal.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <input
              id="includeTax"
              type="checkbox"
              checked={includeTax}
              onChange={(e) => setIncludeTax(e.target.checked)}
            />
            <Label htmlFor="includeTax" className="text-sm">
              Including tax?
            </Label>
          </div>
          <div className="font-semibold">Total: {total.toFixed(1)}</div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, part no or barcode..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductSearch(true);
              }}
              onFocus={() => setShowProductSearch(true)}
              className="pl-9"
            />
          </div>
          {showProductSearch ? (
            <div className="max-h-48 overflow-auto rounded-md border bg-background">
              {filteredProducts.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  {searchLower ? "No products match" : "All products already added or no products"}
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = (p.quantity ?? 0) <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`flex w-full items-center gap-3 border-b p-3 text-left last:border-b-0 hover:bg-accent ${isOutOfStock ? "cursor-not-allowed opacity-60" : ""}`}
                      onClick={() => !isOutOfStock && addProduct(p)}
                      disabled={isOutOfStock}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                        {p.image_url ? (
                          <img src={getFullImageUrl(p.image_url) ?? p.image_url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[p.sku ?? p.part_no, p.barcode].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div className={`text-xs ${isOutOfStock ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                          Stock: {p.quantity} · {Number(p.selling_price).toFixed(2)}
                          {isOutOfStock ? " (do not sell)" : ""}
                        </div>
                      </div>
                      <span className={`text-xs font-medium ${isOutOfStock ? "text-muted-foreground" : "text-primary"}`}>
                        {isOutOfStock ? "Out of stock" : "Add"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowProductSearch((v) => !v)}>
            {showProductSearch ? "Hide search" : "Search & add product"}
          </Button>
        </div>
      </div>

      {stores.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="text-sm font-semibold">Branch / Shop</div>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Select the branch where this sale is made</p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="text-sm font-semibold">Payment</div>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        >
          <option value="credit">Credit</option>
          <option value="cash">Cash</option>
          <option value="mobile_money">Mobile money</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="card">Card</option>
        </select>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Customer</div>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setCustomerName(""); setCustomerPhone(""); }}>
            Clear
          </Button>
        </div>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
        />
        <Input
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Phone number (for calls)"
          type="tel"
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="link" onClick={() => setShowNote((v) => !v)}>
          Add Note
        </Button>
      </div>

      {showNote ? (
        <div className="rounded-lg border bg-card p-4">
          <Label htmlFor="note">Note</Label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      ) : null}

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background sm:pl-0">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 pb-[env(safe-area-inset-bottom)] pt-3">
          <Button className="w-full" disabled={isSubmitting || items.length === 0} onClick={onCreateSale}>
            {isSubmitting ? "Saving..." : "Sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
