import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  quantity: number;
  cost_price: number;
  selling_price: number;
  image_url?: string | null;
};

export function ReportProductPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setError(null);
    apiRequest<Product[]>("/api/products?limit=200", { token, signal: controller.signal })
      .then(setProducts)
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load products");
      });
    return () => controller.abort();
  }, [token]);

  const totalValue = products.reduce((a, p) => a + p.quantity * p.cost_price, 0);
  const totalQty = products.reduce((a, p) => a + p.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-8 sm:max-w-5xl lg:max-w-7xl">
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-lg font-semibold">Product report</div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total products</div>
          <div className="text-xl font-bold">{products.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total quantity</div>
          <div className="text-xl font-bold">{totalQty.toLocaleString()}</div>
        </div>
      </div>

      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            Products by quantity & value
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        {expanded && (
          <CardContent className="pt-0">
            <div className="max-h-80 overflow-x-auto overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t even:bg-muted/30">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                            {p.image_url ? (
                              <img src={getFullImageUrl(p.image_url) ?? p.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">—</div>
                            )}
                          </div>
                          <span className="truncate max-w-[160px]" title={p.name}>{p.name}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right">{p.quantity.toLocaleString()}</td>
                      <td className="p-2 text-right">{p.cost_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">{(p.quantity * p.cost_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{totalQty.toLocaleString()}</td>
                    <td className="p-2 text-right">—</td>
                    <td className="p-2 text-right">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
