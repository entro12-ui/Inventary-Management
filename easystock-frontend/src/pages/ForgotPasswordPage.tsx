import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ email: string; resetToken?: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; reset_token?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setDone({ email, resetToken: res.reset_token });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Check your email" description={`If an account exists for ${done.email}, a reset code is ready.`}>
        <div className="space-y-4">
          {done.resetToken ? (
            <>
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <div className="text-xs font-medium text-muted-foreground">Your reset code (valid 1 hour)</div>
                <div className="mt-2 font-mono text-lg font-bold tracking-widest text-foreground">
                  {done.resetToken}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate("/reset-password", { state: { email: done.email, token: done.resetToken } })}
              >
                Reset password
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Check your email for the reset code, then go to Reset password.
            </p>
          )}
          <div className="text-center text-sm text-muted-foreground">
            <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" description="Enter your email and we'll send a code to reset your password.">
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
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset code"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/login">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
