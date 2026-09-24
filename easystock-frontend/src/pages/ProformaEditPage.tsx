import * as React from "react";
import { ChevronLeft, Plus, Search, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, apiRequest, getApiBaseUrl, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saleUnitShort } from "@/lib/sale-unit";

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  selling_price: number;
  sale_unit?: string | null;
  sale_unit_custom?: string | null;
};

type LineDraft = {
  key: string;
  product_id: string | null;
  description: string;
  sku: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  price_source: "catalog" | "custom";
};

type ProformaDetail = {
  id: string;
  proforma_number: string;
  document_type: string;
  status: string;
  issue_date: string | null;
  valid_until: string | null;
  issuer_tin: string | null;
  client_company_name: string;
  client_contact_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_tin: string | null;
  tender_title: string | null;
  tender_reference: string | null;
  tender_closing_date: string | null;
  currency: string;
  tax_rate: number;
  discount_amount: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  authorized_name: string | null;
  authorized_title: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  items: {
    product_id: string | null;
    description: string;
    sku: string | null;
    unit: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    price_source: string;
  }[];
};

type BusinessMe = {
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
};

function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00Z`).toISOString();
}

function productUnit(p: Product) {
  if (p.sale_unit === "other") return (p.sale_unit_custom || "unit").trim() || "unit";
  return saleUnitShort(p.sale_unit) === "pc" ? "piece" : saleUnitShort(p.sale_unit);
}

export function ProformaEditPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";

  const [business, setBusiness] = React.useState<BusinessMe | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [productSearch, setProductSearch] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false);

  const [documentType, setDocumentType] = React.useState<"quotation" | "tender_bid">("quotation");
  const [status, setStatus] = React.useState("draft");
  const [issueDate, setIssueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = React.useState("");
  const [issuerTin, setIssuerTin] = React.useState("");

  const [clientCompany, setClientCompany] = React.useState("");
  const [clientContact, setClientContact] = React.useState("");
  const [clientAddress, setClientAddress] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [clientTin, setClientTin] = React.useState("");

  const [tenderTitle, setTenderTitle] = React.useState("");
  const [tenderRef, setTenderRef] = React.useState("");
  const [tenderClosing, setTenderClosing] = React.useState("");

  const [taxRate, setTaxRate] = React.useState("0");
  const [headerDiscount, setHeaderDiscount] = React.useState("0");
  const [paymentTerms, setPaymentTerms] = React.useState("Payment within 30 days of acceptance");
  const [deliveryTerms, setDeliveryTerms] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [terms, setTerms] = React.useState(
    "This proforma is not a tax invoice. Prices are valid until the expiry date. Stock is reserved only after confirmed order.",
  );
  const [authorizedName, setAuthorizedName] = React.useState(user?.full_name ?? "");
  const [authorizedTitle, setAuthorizedTitle] = React.useState("Authorized signatory");
  const [stampUrl, setStampUrl] = React.useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = React.useState<string | null>(null);
  const [lines, setLines] = React.useState<LineDraft[]>([]);
  const [loadedNumber, setLoadedNumber] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    apiRequest<BusinessMe>("/api/business/me", { token }).then(setBusiness).catch(() => undefined);
    apiRequest<Product[]>("/api/products?limit=200", { token })
      .then(setProducts)
      .catch(() => undefined);
  }, [token]);

  React.useEffect(() => {
    if (!token || isNew) return;
    apiRequest<ProformaDetail>(`/api/proformas/${id}`, { token })
      .then((p) => {
        setLoadedNumber(p.proforma_number);
        setDocumentType(p.document_type === "tender_bid" ? "tender_bid" : "quotation");
        setStatus(p.status);
        setIssueDate(toDateInput(p.issue_date) || issueDate);
        setValidUntil(toDateInput(p.valid_until));
        setIssuerTin(p.issuer_tin ?? "");
        setClientCompany(p.client_company_name);
        setClientContact(p.client_contact_name ?? "");
        setClientAddress(p.client_address ?? "");
        setClientPhone(p.client_phone ?? "");
        setClientEmail(p.client_email ?? "");
        setClientTin(p.client_tin ?? "");
        setTenderTitle(p.tender_title ?? "");
        setTenderRef(p.tender_reference ?? "");
        setTenderClosing(toDateInput(p.tender_closing_date));
        setTaxRate(String(p.tax_rate ?? 0));
        setHeaderDiscount(String(p.discount_amount ?? 0));
        setPaymentTerms(p.payment_terms ?? "");
        setDeliveryTerms(p.delivery_terms ?? "");
        setNotes(p.notes ?? "");
        setTerms(p.terms_and_conditions ?? "");
        setAuthorizedName(p.authorized_name ?? user?.full_name ?? "");
        setAuthorizedTitle(p.authorized_title ?? "Authorized signatory");
        setStampUrl(p.stamp_url);
        setSignatureUrl(p.signature_url);
        setLines(
          p.items.map((i) => ({
            key: newKey(),
            product_id: i.product_id,
            description: i.description,
            sku: i.sku ?? "",
            unit: i.unit || "piece",
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount_amount: i.discount_amount || 0,
            price_source: i.price_source === "custom" ? "custom" : "catalog",
          })),
        );
      })
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load proforma");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, isNew]);

  const searchLower = productSearch.trim().toLowerCase();
  const filteredProducts = React.useMemo(() => {
    const list = products;
    if (!searchLower) return list.slice(0, 15);
    return list
      .filter((p) => {
        const name = (p.name ?? "").toLowerCase();
        const sku = (p.sku ?? "").toLowerCase();
        return name.includes(searchLower) || sku.includes(searchLower);
      })
      .slice(0, 15);
  }, [products, searchLower]);

  function addProduct(p: Product) {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        product_id: p.id,
        description: p.name,
        sku: p.sku ?? "",
        unit: productUnit(p),
        quantity: 1,
        unit_price: Number(p.selling_price) || 0,
        discount_amount: 0,
        price_source: "catalog",
      },
    ]);
    setShowSearch(false);
    setProductSearch("");
  }

  function addCustomLine() {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        product_id: null,
        description: "",
        sku: "",
        unit: "piece",
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        price_source: "custom",
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const subtotal = lines.reduce(
    (sum, l) => sum + Math.max(l.quantity * l.unit_price - (l.discount_amount || 0), 0),
    0,
  );
  const discount = Math.min(Number(headerDiscount) || 0, subtotal);
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = taxable * ((Number(taxRate) || 0) / 100);
  const total = taxable + taxAmount;

  async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${getApiBaseUrl()}/api/uploads/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = (await res.json()) as { url: string };
    return data.url;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!clientCompany.trim()) {
      setError("Client company is required");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one line item");
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setError("Each line needs a description");
      return;
    }
    if (documentType === "tender_bid" && !tenderTitle.trim() && !tenderRef.trim()) {
      setError("Open tender needs a title or reference number");
      return;
    }

    setSaving(true);
    setError(null);
    const body = {
      document_type: documentType,
      status,
      issue_date: fromDateInput(issueDate),
      valid_until: fromDateInput(validUntil),
      issuer_tin: issuerTin.trim() || null,
      client_company_name: clientCompany.trim(),
      client_contact_name: clientContact.trim() || null,
      client_address: clientAddress.trim() || null,
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
      client_tin: clientTin.trim() || null,
      tender_title: tenderTitle.trim() || null,
      tender_reference: tenderRef.trim() || null,
      tender_closing_date: fromDateInput(tenderClosing),
      tax_rate: Number(taxRate) || 0,
      discount_amount: Number(headerDiscount) || 0,
      currency: "ETB",
      payment_terms: paymentTerms.trim() || null,
      delivery_terms: deliveryTerms.trim() || null,
      notes: notes.trim() || null,
      terms_and_conditions: terms.trim() || null,
      authorized_name: authorizedName.trim() || null,
      authorized_title: authorizedTitle.trim() || null,
      stamp_url: stampUrl,
      signature_url: signatureUrl,
      items: lines.map((l) => ({
        product_id: l.product_id,
        description: l.description.trim(),
        sku: l.sku.trim() || null,
        unit: l.unit || "piece",
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_amount: l.discount_amount || 0,
        price_source: l.price_source,
      })),
    };

    try {
      if (isNew) {
        const created = await apiRequest<{ id: string }>("/api/proformas", {
          method: "POST",
          token,
          body,
        });
        navigate(`/proformas/${created.id}`, { replace: true });
      } else {
        await apiRequest(`/api/proformas/${id}`, { method: "PUT", token, body });
        navigate(`/proformas/${id}`, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to save proforma");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-4 pb-28 lg:space-y-5">
      <div>
        <button
          type="button"
          onClick={() => navigate(isNew ? "/proformas" : `/proformas/${id}`)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {isNew ? "New proforma" : `Edit ${loadedNumber ?? "proforma"}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          From: <span className="font-medium text-foreground">{business?.name ?? "Your company"}</span>
          {business?.city ? ` · ${business.city}` : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form className="space-y-5" onSubmit={onSave}>
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold">Document</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="docType">Type</Label>
              <select
                id="docType"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as "quotation" | "tender_bid")}
              >
                <option value="quotation">Quotation / proforma</option>
                <option value="tender_bid">Open tender bid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Issue date</Label>
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid until</Label>
              <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="issuerTin">Your TIN / VAT (optional)</Label>
              <Input id="issuerTin" value={issuerTin} onChange={(e) => setIssuerTin(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold">To company (client)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="clientCompany">Company name *</Label>
              <Input
                id="clientCompany"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Organization receiving this proforma"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientContact">Contact person</Label>
              <Input id="clientContact" value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientTin">Client TIN</Label>
              <Input id="clientTin" value={clientTin} onChange={(e) => setClientTin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone">Phone</Label>
              <Input id="clientPhone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientEmail">Email</Label>
              <Input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="clientAddress">Address</Label>
              <Input id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
            </div>
          </div>
        </section>

        {documentType === "tender_bid" ? (
          <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-semibold">Open tender</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tenderTitle">Tender title</Label>
                <Input
                  id="tenderTitle"
                  value={tenderTitle}
                  onChange={(e) => setTenderTitle(e.target.value)}
                  placeholder="e.g. Supply of building materials"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenderRef">Tender / RFQ reference</Label>
                <Input id="tenderRef" value={tenderRef} onChange={(e) => setTenderRef(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenderClosing">Closing date</Label>
                <Input
                  id="tenderClosing"
                  type="date"
                  value={tenderClosing}
                  onChange={(e) => setTenderClosing(e.target.value)}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Line items</h2>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowSearch((v) => !v)}>
                <Search className="mr-1 h-4 w-4" />
                From stock
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addCustomLine}>
                <Plus className="mr-1 h-4 w-4" />
                Custom
              </Button>
            </div>
          </div>

          {showSearch ? (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
              <Input
                placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                autoFocus
              />
              <ul className="max-h-48 overflow-y-auto divide-y divide-border/60">
                {filteredProducts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-1 py-2 text-left text-sm hover:bg-accent/50"
                      onClick={() => addProduct(p)}
                    >
                      <span className="min-w-0 truncate">
                        {p.name}
                        {p.sku ? <span className="text-muted-foreground"> · {p.sku}</span> : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {Number(p.selling_price).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
                {filteredProducts.length === 0 ? (
                  <li className="px-1 py-3 text-center text-xs text-muted-foreground">No products found</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Add materials from stock (price from selling price) or a custom tender line.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((l, idx) => (
                <li key={l.key} className="rounded-xl border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeLine(l.key)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Description *</Label>
                      <Input
                        value={l.description}
                        onChange={(e) => updateLine(l.key, { description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>SKU</Label>
                      <Input value={l.sku} onChange={(e) => updateLine(l.key, { sku: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Unit</Label>
                      <Input value={l.unit} onChange={(e) => updateLine(l.key, { unit: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Unit price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={l.unit_price}
                        onChange={(e) =>
                          updateLine(l.key, {
                            unit_price: Number(e.target.value) || 0,
                            price_source: "custom",
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {l.price_source === "catalog" ? "From product selling price — edit to override" : "Custom price"}
                        {l.product_id ? (
                          <>
                            {" · "}
                            <button
                              type="button"
                              className="underline"
                              onClick={() => {
                                const p = products.find((x) => x.id === l.product_id);
                                if (p) {
                                  updateLine(l.key, {
                                    unit_price: Number(p.selling_price) || 0,
                                    price_source: "catalog",
                                  });
                                }
                              }}
                            >
                              Reset to catalog
                            </button>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label>Line discount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={l.discount_amount}
                        onChange={(e) => updateLine(l.key, { discount_amount: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-end justify-end text-sm font-semibold tabular-nums sm:col-span-2">
                      Line total:{" "}
                      {Math.max(l.quantity * l.unit_price - (l.discount_amount || 0), 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tax % (VAT)</Label>
              <Input type="number" min="0" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Overall discount</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={headerDiscount}
                onChange={(e) => setHeaderDiscount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">ETB {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold">Terms</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="paymentTerms">Payment terms</Label>
              <Input id="paymentTerms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliveryTerms">Delivery terms</Label>
              <Input id="deliveryTerms" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="terms">Terms & conditions</Label>
              <textarea
                id="terms"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold">Footer — stamp & signature</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="authName">Responsible name</Label>
              <Input id="authName" value={authorizedName} onChange={(e) => setAuthorizedName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="authTitle">Title / position</Label>
              <Input id="authTitle" value={authorizedTitle} onChange={(e) => setAuthorizedTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Company stamp</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setStampUrl(await uploadImage(file));
                  } catch {
                    setError("Failed to upload stamp");
                  }
                }}
              />
              {stampUrl ? (
                <img src={getFullImageUrl(stampUrl) ?? stampUrl} alt="Stamp" className="mt-2 h-16 object-contain" />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Signature image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setSignatureUrl(await uploadImage(file));
                  } catch {
                    setError("Failed to upload signature");
                  }
                }}
              />
              {signatureUrl ? (
                <img
                  src={getFullImageUrl(signatureUrl) ?? signatureUrl}
                  alt="Signature"
                  className="mt-2 h-16 object-contain"
                />
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving…" : isNew ? "Create proforma" : "Save changes"}
          </Button>
          {!isNew ? (
            <Button type="button" variant="outline" asChild>
              <Link to={`/proformas/${id}`}>Cancel</Link>
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
