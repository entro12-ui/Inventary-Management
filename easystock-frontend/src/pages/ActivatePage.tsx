import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ActivatePage() {
  const { activateAccount } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      await activateAccount(email, otp, newPassword);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Activation failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Activate account"
      description="Enter the OTP from admin approval and choose your password."
    >
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
          <Label htmlFor="otp">One-time password (OTP)</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="e.g. 123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
          {isSubmitting ? "Activating..." : "Activate account"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/login">
            Back to login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
