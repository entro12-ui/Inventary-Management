import * as React from "react";
import { ChevronLeft, Pencil, Printer } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError, apiRequest, getFullImageUrl } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

type ProformaDetail = {
  id: string;
  proforma_number: string;
  document_type: string;
  status: string;
  issue_date: string | null;
  valid_until: string | null;
  issuer_name: string;
  issuer_address: string | null;
  issuer_city: string | null;
  issuer_country: string | null;
  issuer_phone: string | null;
  issuer_email: string | null;
  issuer_logo_url: string | null;
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
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  authorized_name: string | null;
  authorized_title: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  revision: number;
  created_by_name: string | null;
  items: {
    id: string;
    line_no: number;
    description: string;
    sku: string | null;
    unit: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
  }[];
};

function money(n: number, currency = "ETB") {
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function ProformaViewPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = React.useState<ProformaDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [statusSaving, setStatusSaving] = React.useState(false);

  const load = React.useCallback(() => {
    if (!token || !id) return;
    apiRequest<ProformaDetail>(`/api/proformas/${id}`, { token })
      .then(setDoc)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load proforma");
      });
  }, [token, id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: string) {
    if (!token || !id) return;
    setStatusSaving(true);
    try {
      const updated = await apiRequest<ProformaDetail>(`/api/proformas/${id}/status`, {
        method: "PATCH",
        token,
        body: { status },
      });
      setDoc(updated);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  if (error && !doc) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => navigate("/proformas")} className="text-sm text-muted-foreground">
          ← Back
        </button>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!doc) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const issuerPlace = [doc.issuer_address, doc.issuer_city, doc.issuer_country].filter(Boolean).join(", ");
  const logo = getFullImageUrl(doc.issuer_logo_url) ?? doc.issuer_logo_url;
  const stamp = getFullImageUrl(doc.stamp_url) ?? doc.stamp_url;
  const signature = getFullImageUrl(doc.signature_url) ?? doc.signature_url;

  return (
    <div className="w-full space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button
          type="button"
          onClick={() => navigate("/proformas")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Proformas
        </button>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={doc.status}
            disabled={statusSaving}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {doc.status !== "accepted" && doc.status !== "cancelled" ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/proformas/${doc.id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : null}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive print:hidden">
          {error}
        </div>
      ) : null}

      <article className="proforma-print mx-auto max-w-3xl space-y-6 rounded-2xl border border-border bg-white p-5 text-slate-900 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3">
            {logo ? (
              <img src={logo} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 font-display text-sm font-bold">
                {doc.issuer_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-display text-lg font-semibold tracking-tight">{doc.issuer_name}</div>
              {issuerPlace ? <div className="mt-0.5 text-xs text-slate-600">{issuerPlace}</div> : null}
              <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                {doc.issuer_phone ? <div>Tel: {doc.issuer_phone}</div> : null}
                {doc.issuer_email ? <div>{doc.issuer_email}</div> : null}
                {doc.issuer_tin ? <div>TIN: {doc.issuer_tin}</div> : null}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-bold uppercase tracking-wide">
              {doc.document_type === "tender_bid" ? "Tender bid" : "Proforma invoice"}
            </div>
            <div className="mt-1 text-sm font-semibold">{doc.proforma_number}</div>
            <div className="mt-1 text-xs text-slate-600">
              Status: <span className="font-medium uppercase">{doc.status}</span>
              {doc.revision > 1 ? ` · Rev ${doc.revision}` : ""}
            </div>
            <div className="mt-1 text-xs text-slate-600">Issue: {formatDate(doc.issue_date)}</div>
            <div className="text-xs text-slate-600">Valid until: {formatDate(doc.valid_until)}</div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">From</div>
            <div className="mt-1 font-semibold">{doc.issuer_name}</div>
            <div className="text-sm text-slate-600">{issuerPlace || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">To</div>
            <div className="mt-1 font-semibold">{doc.client_company_name}</div>
            {doc.client_contact_name ? <div className="text-sm text-slate-600">Attn: {doc.client_contact_name}</div> : null}
            {doc.client_address ? <div className="text-sm text-slate-600">{doc.client_address}</div> : null}
            <div className="text-sm text-slate-600">
              {[doc.client_phone, doc.client_email].filter(Boolean).join(" · ")}
            </div>
            {doc.client_tin ? <div className="text-sm text-slate-600">TIN: {doc.client_tin}</div> : null}
          </div>
        </section>

        {doc.document_type === "tender_bid" || doc.tender_reference || doc.tender_title ? (
          <section className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Open tender</div>
            {doc.tender_title ? <div className="mt-1 font-medium">{doc.tender_title}</div> : null}
            <div className="mt-0.5 text-slate-600">
              {[doc.tender_reference ? `Ref: ${doc.tender_reference}` : null, doc.tender_closing_date ? `Closes: ${formatDate(doc.tender_closing_date)}` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </section>
        ) : null}

        <section className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2">Unit</th>
                <th className="py-2 pr-2 text-right">Qty</th>
                <th className="py-2 pr-2 text-right">Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top">
                  <td className="py-2.5 pr-2 text-slate-500">{item.line_no}</td>
                  <td className="py-2.5 pr-2">
                    <div className="font-medium">{item.description}</div>
                    {item.sku ? <div className="text-xs text-slate-500">{item.sku}</div> : null}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-600">{item.unit}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{item.unit_price.toLocaleString()}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{item.line_total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="tabular-nums">{money(doc.subtotal, doc.currency)}</span>
          </div>
          {doc.discount_amount > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-600">Discount</span>
              <span className="tabular-nums">-{money(doc.discount_amount, doc.currency)}</span>
            </div>
          ) : null}
          {doc.tax_rate > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-600">Tax ({doc.tax_rate}%)</span>
              <span className="tabular-nums">{money(doc.tax_amount, doc.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{money(doc.total_amount, doc.currency)}</span>
          </div>
        </section>

        {(doc.payment_terms || doc.delivery_terms || doc.notes || doc.terms_and_conditions) && (
          <section className="space-y-2 border-t border-slate-200 pt-4 text-sm">
            {doc.payment_terms ? (
              <div>
                <span className="font-medium">Payment: </span>
                {doc.payment_terms}
              </div>
            ) : null}
            {doc.delivery_terms ? (
              <div>
                <span className="font-medium">Delivery: </span>
                {doc.delivery_terms}
              </div>
            ) : null}
            {doc.notes ? (
              <div>
                <span className="font-medium">Notes: </span>
                {doc.notes}
              </div>
            ) : null}
            {doc.terms_and_conditions ? (
              <div className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">Terms: </span>
                {doc.terms_and_conditions}
              </div>
            ) : null}
          </section>
        )}

        <footer className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <div className="flex flex-col items-start">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Company stamp</div>
            <div className="mt-2 flex h-24 w-32 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50">
              {stamp ? (
                <img src={stamp} alt="Company stamp" className="max-h-22 max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-400">Stamp</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Authorized signature</div>
            <div className="mt-2 flex h-16 w-40 items-end justify-center border-b border-slate-400">
              {signature ? (
                <img src={signature} alt="Signature" className="max-h-14 max-w-full object-contain" />
              ) : null}
            </div>
            <div className="mt-2 text-sm font-semibold">{doc.authorized_name || "________________"}</div>
            <div className="text-xs text-slate-600">{doc.authorized_title || "Authorized signatory"}</div>
            {doc.created_by_name ? (
              <div className="mt-1 text-[10px] text-slate-500">Prepared by {doc.created_by_name}</div>
            ) : null}
          </div>
        </footer>
      </article>
    </div>
  );
}
