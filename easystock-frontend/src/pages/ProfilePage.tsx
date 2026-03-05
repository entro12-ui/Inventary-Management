import * as React from "react";

import { Building2, ChevronRight, CreditCard, FileText, KeyRound, Package, ShoppingBag, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BusinessMe = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
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

  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;

  React.useEffect(() => {
    if (!token || isSystemAdmin) return;
    const controller = new AbortController();

    apiRequest<BusinessMe>("/api/business/me", { token, signal: controller.signal })
      .then(setBusiness)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load profile");
      });

    return () => controller.abort();
  }, [token, isSystemAdmin]);

  const place = [business?.city, business?.country].filter(Boolean).join(", ");

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
    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-5xl lg:max-w-7xl">
      <div
        className="rounded-2xl px-4 py-5 text-primary-foreground"
        style={{ backgroundColor: "rgb(40 102 195)" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-primary-foreground/15">
            {!isSystemAdmin && business?.logo_url ? (
              <img
                alt={business.name}
                src={business.logo_url}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                {(isSystemAdmin ? "SA" : business?.name ?? "E").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {isSystemAdmin ? "System Admin" : business?.name ?? "Profile"}
            </div>
            <div className="truncate text-xs opacity-80">{isSystemAdmin ? "Platform admin" : place || "—"}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-primary-foreground/10 px-3 py-3">
          <div className="text-xs opacity-80">Signed in as</div>
          <div className="mt-1 truncate text-sm font-semibold">{user?.full_name ?? "—"}</div>
          <div className="truncate text-xs opacity-80">{user?.email ?? "—"}</div>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4" />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showChangePassword ? (
            <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
              Change password
            </Button>
          ) : (
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

      {!isSystemAdmin ? (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Menu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Admin</CardTitle>
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
        className="w-full"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Logout
      </Button>
    </div>
  );
}
