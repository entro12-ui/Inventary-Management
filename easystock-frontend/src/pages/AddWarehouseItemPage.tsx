import * as React from "react";

import { Building2, ChevronLeft, Image as ImageIcon, QrCode, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiRequest, getApiBaseUrl, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddWarehouseItemPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [stores, setStores] = React.useState<{ id: string; name: string; location?: string | null }[]>([]);
  const [storeId, setStoreId] = React.useState<string>("");

  const [name, setName] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [partNo, setPartNo] = React.useState("");
  const [purchasePrice, setPurchasePrice] = React.useState("");
  const [sellingPrice, setSellingPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("0");
  const [location, setLocation] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  async function uploadImage(file: File): Promise<string> {
    if (!token) throw new Error("Not authenticated");

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/uploads/image`;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

  React.useEffect(() => {
    if (!token) return;
    apiRequest<{ id: string; name: string; location?: string | null }[]>("/api/business/stores", { token })
      .then(setStores)
      .catch(() => setStores([]));
  }, [token]);

  React.useEffect(() => {
    if (stores.length > 0 && !storeId) setStoreId(stores[0].id);
  }, [stores, storeId]);

  function reset() {
    setName("");
    setBarcode("");
    setPartNo("");
    setPurchasePrice("");
    setSellingPrice("");
    setQuantity("0");
    setLocation("");
    setImageUrl(null);
  }

  async function submit(action: "back" | "continue") {
    if (!token) return;

    const trimmedName = name.trim();
    const trimmedBarcode = barcode.trim();
    const trimmedPartNo = partNo.trim();
    const trimmedLocation = location.trim();

    if (!trimmedName) {
      setError("Item name is required");
      return;
    }

    const costPrice = Number(purchasePrice);
    const salePrice = Number(sellingPrice);
    const qty = Number(quantity || 0);

    if (!Number.isFinite(costPrice) || costPrice <= 0) {
      setError("Purchase price must be greater than 0");
      return;
    }

    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      setError("Selling price must be greater than 0");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const sku = trimmedPartNo || trimmedBarcode || trimmedName;
      await apiRequest("/api/products", {
        method: "POST",
        token,
        body: {
          name: trimmedName,
          sku,
          barcode: trimmedBarcode || null,
          part_no: trimmedPartNo || null,
          location: trimmedLocation || null,
          image_url: imageUrl,
          cost_price: costPrice,
          selling_price: salePrice,
          quantity: qty,
          store_id: storeId || null,
        },
      });

      if (action === "back") {
        navigate("/warehouse");
      } else {
        reset();
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-sm font-semibold">Add Warehouse item</div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={() => navigate("/warehouse")}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setError(null);
            setIsUploadingImage(true);
            try {
              const url = await uploadImage(file);
              setImageUrl(url);
            } catch (err) {
              setImageUrl(null);
              setError(err instanceof Error ? err.message : "Failed to upload image");
            } finally {
              setIsUploadingImage(false);
              // allow selecting the same file again
              e.currentTarget.value = "";
            }
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex w-full items-center justify-center overflow-hidden rounded-md border bg-background py-8 text-muted-foreground"
        >
          {imageUrl ? (
            <img alt="Item" src={getFullImageUrl(imageUrl) ?? imageUrl} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className={imageUrl ? "relative rounded-md bg-background/70 px-3 py-2 text-xs" : "flex flex-col items-center gap-2 text-xs"}>
            <ImageIcon className="h-6 w-6" />
            <div>{isUploadingImage ? "Uploading..." : imageUrl ? "Change image" : "Item image"}</div>
          </div>
        </button>

        <div className="mt-4 grid gap-3">
          {stores.length > 0 ? (
            <div className="space-y-1">
              <Label htmlFor="store">Add to branch</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <select
                  id="store"
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="name">Item name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Scan barcode (focuses field for scanner or paste)"
                title="Click then scan with barcode scanner, or type/paste barcode"
                onClick={() => document.getElementById("barcode")?.focus()}
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="partNo">Part No</Label>
            <Input id="partNo" value={partNo} onChange={(e) => setPartNo(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="purchase">Purchase price</Label>
            <Input
              id="purchase"
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="selling">Selling price</Label>
            <Input
              id="selling"
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="G6" />
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Button
          className="w-full border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
          disabled={isSubmitting}
          onClick={() => submit("back")}
        >
          {isSubmitting ? "Adding..." : "Add and go back"}
        </Button>
        <Button
          className="w-full border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => submit("continue")}
        >
          {isSubmitting ? "Adding..." : "Add and continue to add"}
        </Button>
      </div>
    </div>
  );
}
