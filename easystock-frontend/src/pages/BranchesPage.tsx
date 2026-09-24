import * as React from "react";

import { ArrowLeft, Building2, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { ApiError, apiRequest } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Store = {
  id: string;
  name: string;
  location?: string | null;
};

export function BranchesPage() {
  const { token } = useAuth();
  const [stores, setStores] = React.useState<Store[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newLocation, setNewLocation] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function loadStores() {
    if (!token) return;
    setLoading(true);
    apiRequest<Store[]>("/api/business/stores", { token })
      .then(setStores)
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Failed to load branches");
      })
      .finally(() => setLoading(false));
  }

  React.useEffect(loadStores, [token]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("/api/business/stores", {
        method: "POST",
        token,
        body: {
          name: newName.trim(),
          location: newLocation.trim() || undefined,
        },
      });
      setNewName("");
      setNewLocation("");
      setShowAdd(false);
      loadStores();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to add branch");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold tracking-tight">Branches & stores</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          Add branch
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Add stores or branches to enable transfers between them. You need at least two branches to
        transfer stock.
      </p>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {showAdd ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Add new branch</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Downtown Branch"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Location (optional)</label>
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Addis Ababa, Bole"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || !newName.trim()}>
                  {isSubmitting ? "Adding..." : "Add branch"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAdd(false);
                    setNewName("");
                    setNewLocation("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Your branches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : stores.length === 0 ? (
            <div className="space-y-3 p-6">
              <div className="text-center text-sm text-muted-foreground">
                No branches yet. Add your first branch above.
              </div>
              <div className="text-center text-xs text-muted-foreground">
                New accounts get a default &quot;Main Warehouse&quot; branch. If you don&apos;t see
                it, add branches manually.
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {stores.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.name}</div>
                    {s.location ? (
                      <div className="truncate text-xs text-muted-foreground">{s.location}</div>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild className="w-full">
        <Link to="/warehouse" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Warehouse
        </Link>
      </Button>
    </div>
  );
}
