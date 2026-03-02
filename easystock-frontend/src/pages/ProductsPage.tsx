import * as React from "react";

import { useSearchParams } from "react-router-dom";

import { ApiError, apiRequest, getApiBaseUrl, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Product = {
  id: string;
  business_id: string;
  name: string;
  sku: string;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
};

export function ProductsPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const deepLinkEditId = searchParams.get("edit");
  const appliedDeepLinkRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [sellingPrice, setSellingPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("0");
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

  const editingProduct = React.useMemo(() => {
    if (!editingProductId) return null;
    return products.find((p) => p.id === editingProductId) ?? null;
  }, [editingProductId, products]);

  async function load() {
    if (!token) return;
    setError(null);
    try {
      const list = await apiRequest<Product[]>("/api/products?skip=0&limit=200", { token });
      setProducts(list);

      if (deepLinkEditId && !appliedDeepLinkRef.current) {
        const target = list.find((p) => p.id === deepLinkEditId);
        if (target) {
          appliedDeepLinkRef.current = true;
          startEdit(target);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load products");
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deepLinkEditId]);

  function startEdit(p: Product) {
    setEditingProductId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCostPrice(String(p.cost_price));
    setSellingPrice(String(p.selling_price));
    setQuantity(String(p.quantity));
    setImageUrl(p.image_url ?? null);
  }

  function resetForm() {
    setEditingProductId(null);
    setName("");
    setSku("");
    setCostPrice("");
    setSellingPrice("");
    setQuantity("0");
    setImageUrl(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const body = {
        name,
        sku,
        cost_price: Number(costPrice),
        selling_price: Number(sellingPrice),
        quantity: Number(quantity),
        image_url: imageUrl,
      };

      if (editingProductId) {
        await apiRequest<Product>(`/api/products/${editingProductId}`, {
          method: "PATCH",
          token,
          body,
        });
      } else {
        await apiRequest<Product>("/api/products", {
          method: "POST",
          token,
          body,
        });
      }

      resetForm();
      await load();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(editingProductId ? "Failed to update product" : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingProduct ? "Update product" : "Add product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
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
                  e.currentTarget.value = "";
                }
              }}
            />

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Image</Label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex w-full items-center justify-center overflow-hidden rounded-md border bg-background py-6 text-muted-foreground"
              >
                {imageUrl ? (
                  <img
                    alt="Product"
                    src={getFullImageUrl(imageUrl) ?? imageUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div
                  className={
                    imageUrl
                      ? "relative rounded-md bg-background/70 px-3 py-1.5 text-xs"
                      : "flex flex-col items-center gap-1 text-xs"
                  }
                >
                  <span>{isUploadingImage ? "Uploading..." : imageUrl ? "Change image" : "Upload image"}</span>
                </div>
              </button>
              <p className="text-xs text-muted-foreground">Optional product photo.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost price</Label>
              <Input id="cost" type="number" min="0.01" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling">Selling price</Label>
              <Input id="selling" type="number" min="0.01" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingProduct ? "Update" : "Create"}
              </Button>
              {editingProduct ? (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product list</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow
                  key={p.id}
                  className={editingProductId === p.id ? "bg-muted/50" : "cursor-pointer"}
                  onClick={() => startEdit(p)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-between gap-2">
                      <span>{p.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEdit(p);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell className="text-right">{p.quantity}</TableCell>
                  <TableCell className="text-right">{p.selling_price.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    <div className="space-y-2">
                      <div>No products yet</div>
                      <div className="text-xs">
                        Examples: Dove | Washing sete | 3 | 0.03, Shampo | Washing | 30 | 120.00
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
