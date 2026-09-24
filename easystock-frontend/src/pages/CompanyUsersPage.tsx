import * as React from "react";

import { ArrowLeft, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanyUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export function CompanyUsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = React.useState<CompanyUser[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("staff");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const canInvite = user?.role === "owner" || user?.role === "manager";

  function load() {
    if (!token) return;
    apiRequest<CompanyUser[]>("/api/business/users", { token })
      .then(setUsers)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load users");
      });
  }

  React.useEffect(load, [token]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email.trim() || !fullName.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("/api/business/users", {
        method: "POST",
        token,
        body: { email: email.trim(), full_name: fullName.trim(), password, role },
      });
      setEmail("");
      setFullName("");
      setPassword("");
      setShowAdd(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to add user");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold tracking-tight">Company users</h1>
        {canInvite && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        )}
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {showAdd && canInvite && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Invite user</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  {user?.role === "owner" && <option value="owner">Owner</option>}
                </select>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add user"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" asChild className="w-full">
        <Link to="/profile" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
      </Button>
    </div>
  );
}
