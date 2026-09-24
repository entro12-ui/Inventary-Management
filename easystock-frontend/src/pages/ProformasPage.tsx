import * as React from "react";
import { ChevronLeft, FileText, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProformaListItem = {
  id: string;
  proforma_number: string;
  document_type: string;
  status: string;
  issue_date: string | null;
  valid_until: string | null;
  client_company_name: string;
  tender_reference: string | null;
  tender_title: string | null;
  total_amount: number;
  currency: string;
  items_count: number;
  revision: number;
};

function formatMoney(n: number, currency = "ETB") {
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function statusClass(status: string) {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground";
    case "sent":
      return "bg-sky-100 text-sky-800";
    case "accepted":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    case "expired":
      return "bg-amber-100 text-amber-800";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function ProformasPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<ProformaListItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [docType, setDocType] = React.useState("");

  const load = React.useCallback(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (docType) params.set("document_type", docType);
    const qs = params.toString();
    apiRequest<ProformaListItem[]>(`/api/proformas${qs ? `?${qs}` : ""}`, { token })
      .then(setRows)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load proformas");
      });
  }, [token, q, status, docType]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full space-y-4 pb-24 lg:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Proformas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quotations and open-tender bids — prices from catalog or custom.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/proformas/new">
            <Plus className="mr-1 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Search number, client, tender…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="flex h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="quotation">Quotation</option>
          <option value="tender_bid">Open tender</option>
        </select>
        <select
          className="flex h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {rows.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No proformas yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create a quotation or open-tender bid for a client.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/proformas/new">Create proforma</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/proformas/${row.id}`}
                className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.proforma_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {row.document_type === "tender_bid" ? "Tender" : "Quote"}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{row.client_company_name}</div>
                  {row.tender_reference || row.tender_title ? (
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[row.tender_reference, row.tender_title].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(row.issue_date)} · {row.items_count} item{row.items_count === 1 ? "" : "s"}
                    {row.revision > 1 ? ` · Rev ${row.revision}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatMoney(row.total_amount, row.currency)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
