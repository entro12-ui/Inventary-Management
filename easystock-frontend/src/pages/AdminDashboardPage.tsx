import * as React from "react";

import { Building2, CheckCircle } from "lucide-react";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Company = {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  approval_status?: string;
  created_at: string | null;
};

export function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [lastOtp, setLastOtp] = React.useState<{ companyId: string; otp: string; email: string } | null>(null);

  const loadCompanies = React.useCallback(() => {
    if (!token) return;
    apiRequest<Company[]>("/api/admin/companies", { token })
      .then(setCompanies)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load companies");
      });
  }, [token]);

  React.useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;

  async function approveCompany(companyId: string) {
    if (!token) return;
    setApprovingId(companyId);
    setError(null);
    setLastOtp(null);
    try {
      const res = await apiRequest<{ otp: string; admin_email: string }>(
        `/api/admin/companies/${companyId}/approve`,
        { method: "POST", token }
      );
      setLastOtp({ companyId, otp: res.otp, email: res.admin_email });
      loadCompanies();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to approve");
    } finally {
      setApprovingId(null);
    }
  }

  if (!isSystemAdmin) {
    return (
      <div className="mx-auto max-w-md p-4 text-center text-destructive">
        System admin access required.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-5xl">
      <div className="pt-2">
        <div className="font-display text-xl font-semibold tracking-tight">System Admin</div>
        <div className="text-sm text-muted-foreground">Approve shops and pharmacies</div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {lastOtp ? (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="text-sm font-semibold">OTP generated</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Share this OTP with <strong>{lastOtp.email}</strong> (one-time use, expires in 24h)
          </div>
          <div className="mt-2 font-mono text-lg font-bold tracking-widest text-primary">{lastOtp.otp}</div>
        </div>
      ) : null}

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            Registered companies ({companies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {companies.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.approval_status === "approved"
                        ? "bg-primary/15 text-primary"
                        : "bg-warning/20 text-warning-foreground"
                    }`}
                  >
                    {c.approval_status === "approved" ? "Approved" : "Pending"}
                  </span>
                  {c.approval_status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => approveCompany(c.id)}
                      disabled={approvingId === c.id}
                    >
                      {approvingId === c.id ? "..." : (
                        <>
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {companies.length === 0 && !error ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No companies registered yet.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
