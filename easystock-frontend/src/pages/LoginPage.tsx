import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Sign in" description="Use your email and password to manage stock, sales, and expiry.">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <div className="space-y-1 text-center text-sm text-muted-foreground">
          <div>
            No account?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/register">
              Register company
            </Link>
          </div>
          <div>
            Have an OTP?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/activate">
              Activate account
            </Link>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
