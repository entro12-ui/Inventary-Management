import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; token?: string } | null;

  const [email, setEmail] = React.useState(state?.email ?? "");
  const [token, setToken] = React.useState(state?.token ?? "");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: { email, token, new_password: newPassword },
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Password updated</CardTitle>
            <CardDescription>Your password has been reset. You can now sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter the code you received and your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Reset code</Label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 123456"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
              <Label htmlFor="confirmPassword">Confirm password</Label>
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
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <Link className="text-primary underline-offset-4 hover:underline" to="/login">
                Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
