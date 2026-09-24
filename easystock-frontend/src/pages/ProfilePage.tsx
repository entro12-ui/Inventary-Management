import * as React from "react";

import { Building2, ChevronRight, CreditCard, FileText, KeyRound, Package, ShoppingBag, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_TYPE_OPTIONS, businessTypeLabel, type BusinessType } from "@/lib/business-type";

type BusinessMe = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  default_min_stock?: number;
  business_type?: string;
};

export function ProfilePage() {
  const { token, user, logout, changePassword } = useAuth();
  const navigate = useNavigate();

  const [business, setBusiness] = React.useState<BusinessMe | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState(false);
  const [minStockInput, setMinStockInput] = React.useState("10");
  const [businessType, setBusinessType] = React.useState<BusinessType>("general");
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = React.useState(false);

  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;

  React.useEffect(() => {
    if (!token || isSystemAdmin) return;
    const controller = new AbortController();

    apiRequest<BusinessMe>("/api/business/me", { token, signal: controller.signal })
      .then((b) => {
        setBusiness(b);
        setMinStockInput(String(b.default_min_stock ?? 10));
        setBusinessType((b.business_type as BusinessType) || "general");
      })
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load profile");
      });

    return () => controller.abort();
  }, [token, isSystemAdmin]);

  const place = [business?.city, business?.country].filter(Boolean).join(", ");

  async function saveBusinessSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const value = Math.max(0, Number(minStockInput) || 0);
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSaved(false);
    try {
      const updated = await apiRequest<BusinessMe>("/api/business/me", {
        method: "PATCH",
        token,
        body: { default_min_stock: value, business_type: businessType },
      });
      setBusiness(updated);
      setMinStockInput(String(updated.default_min_stock ?? value));
      setBusinessType((updated.business_type as BusinessType) || businessType);
      setSettingsSaved(true);
    } catch (err) {
      if (err instanceof ApiError) setSettingsError(err.message);
      else setSettingsError("Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  }
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    } catch (err) {
      if (err instanceof ApiError) setPasswordError(err.message);
      else setPasswordError("Failed to change password");
    }
  }

  return (
    <div className="w-full space-y-5 lg:space-y-6">
        <div className="rounded-3xl bg-hero px-5 py-6 text-hero-foreground shadow-lg shadow-primary/15 sm:px-7 sm:py-7">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-hero-foreground/15 sm:h-14 sm:w-14">
              {!isSystemAdmin && business?.logo_url ? (
                <img
                  alt={business.name}
                  src={business.logo_url}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-sm font-semibold">
                  {(isSystemAdmin ? "SA" : business?.name ?? "E").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
                {isSystemAdmin ? "System Admin" : business?.name ?? "Profile"}
              </div>
              <div className="truncate text-xs opacity-80 sm:text-sm">
                {isSystemAdmin
                  ? "Platform admin"
                  : place
                    ? `${businessTypeLabel(business?.business_type)} · ${place}`
                    : businessTypeLabel(business?.business_type)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)] sm:gap-5">
            <div className="rounded-2xl bg-hero-foreground/10 px-4 py-4 sm:px-5">
              <div className="text-xs font-medium uppercase tracking-wide opacity-80">Signed in as</div>
              <div className="mt-2 truncate text-base font-semibold sm:text-lg">{user?.full_name ?? "—"}</div>
              <div className="truncate text-xs opacity-90 sm:text-sm">{user?.email ?? "—"}</div>
            </div>

            <div className="rounded-2xl bg-hero-foreground/10 px-4 py-4 sm:px-5">
              <div className="text-xs font-medium uppercase tracking-wide opacity-80">Role</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-hero-foreground/20 px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-online-green" />
                <span>{isSystemAdmin ? "System admin" : user?.role ?? "User"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {!isSystemAdmin ? (
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Business settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Set your shop type and the default stock alert for new products. You can still override
                    minimum stock on each product.
                  </p>
                  <form className="space-y-3" onSubmit={saveBusinessSettings}>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business type</Label>
                      <select
                        id="businessType"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={businessType}
                        onChange={(e) => {
                          setBusinessType(e.target.value as BusinessType);
                          setSettingsSaved(false);
                        }}
                      >
                        {BUSINESS_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        {BUSINESS_TYPE_OPTIONS.find((o) => o.value === businessType)?.hint}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultMinStock">Default min stock</Label>
                      <Input
                        id="defaultMinStock"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={minStockInput}
                        onChange={(e) => {
                          setMinStockInput(e.target.value);
                          setSettingsSaved(false);
                        }}
                        className="h-11"
                      />
                    </div>
                    {settingsError ? <div className="text-sm text-destructive">{settingsError}</div> : null}
                    {settingsSaved ? <div className="text-sm text-primary">Saved</div> : null}
                    <Button type="submit" size="sm" disabled={settingsSaving}>
                      {settingsSaving ? "Saving…" : "Save settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Security
                  </span>
                  {!showChangePassword && (
                    <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
                      Change password
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showChangePassword && (
                  <form className="space-y-3" onSubmit={handleChangePassword}>
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm new password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {passwordError ? <div className="text-sm text-destructive">{passwordError}</div> : null}
                    {passwordSuccess ? <div className="text-sm text-green-600">Password updated</div> : null}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        Update password
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowChangePassword(false);
                          setPasswordError(null);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-full flex-1 lg:max-w-xs">
            {!isSystemAdmin ? (
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm font-semibold">Quick navigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2">
                  <Link
                    to="/proformas"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span>Proformas</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/report"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span>Report</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/warehouse"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <span>Warehouse</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/shop"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      <span>Shop</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/credit"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <span>Credit</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    to="/branches"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span>Branches</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  {(user?.role === "owner" || user?.role === "manager") && (
                    <Link
                      to="/company-users"
                      className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span>Company Users</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm font-semibold">Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    to="/admin"
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent"
                  >
                    <span>Manage Companies</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </CardContent>
              </Card>
            )}

            <Button
              variant="outline"
              className="mt-4 w-full rounded-2xl"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
    </div>
  );
}
