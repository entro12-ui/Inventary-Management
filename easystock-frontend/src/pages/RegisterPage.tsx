import * as React from "react";
import { Link } from "react-router-dom";

import { Plus, Trash2 } from "lucide-react";

import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Branch = { name: string; location: string };

export function RegisterPage() {
  const { register } = useAuth();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  function addBranch() {
    setBranches((prev) => [...prev, { name: "", location: "" }]);
  }

  function removeBranch(i: number) {
    setBranches((prev) => (prev.length <= 1 ? [] : prev.filter((_, idx) => idx !== i)));
  }

  function updateBranch(i: number, field: "name" | "location", value: string) {
    setBranches((prev) =>
      prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) {
      setError("Company name is required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setSuccess(false);
    try {
      const branchList = branches
        .map((b) => ({ name: b.name.trim(), location: b.location.trim() || undefined }))
        .filter((b) => b.name.length > 0);
      await register(email, fullName, {
        businessName: businessName.trim(),
        phone: phone.trim() || undefined,
        branches: branchList.length > 0 ? branchList : undefined,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Registration submitted</CardTitle>
            <CardDescription>
              Your company registration is pending approval. The system admin will review and approve your request.
              After approval, you will receive a one-time password (OTP). Use that OTP to set your password and activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Go to the <strong>Activate account</strong> page once you receive the OTP.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/activate">Activate account</Link>
            </Button>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link className="text-primary underline-offset-4 hover:underline" to="/login">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Register company</CardTitle>
          <CardDescription>
            Register your company. No password yet. After system admin approval, you will receive a one-time password (OTP) to set your password and activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Admin full name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Admin email *</Label>
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
              <Label htmlFor="businessName">Company name *</Label>
              <Input
                id="businessName"
                placeholder="e.g. My Company Ltd"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+251..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Branches (optional)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addBranch}>
                  <Plus className="h-4 w-4" />
                  Add branch
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add 0, 1, 2, or more branches. Need 2+ branches to transfer stock between them.
              </p>
              {branches.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  No branches. Click &quot;Add branch&quot; to add, or leave empty (default Main Warehouse will be created).
                </p>
              ) : null}
              {branches.map((b, i) => (
                <div key={i} className="flex gap-2 rounded-lg border p-2">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Branch name"
                      value={b.name}
                      onChange={(e) => updateBranch(i, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Location (optional)"
                      value={b.location}
                      onChange={(e) => updateBranch(i, "location", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBranch(i)}
                    aria-label="Remove branch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Register company"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already activated?{" "}
              <Link className="text-primary underline-offset-4 hover:underline" to="/login">
                Sign in
              </Link>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Have an OTP?{" "}
              <Link className="text-primary underline-offset-4 hover:underline" to="/activate">
                Activate account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
