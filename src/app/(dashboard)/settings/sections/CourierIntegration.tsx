"use client";

import { useCallback, useEffect, useState } from "react";
import { Truck, Plus, X } from "lucide-react";
import api from "@/lib/api";
import type { Courier, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PROVIDER_OPTIONS = [
  { value: "pathao", label: "Pathao" },
  { value: "steadfast", label: "Steadfast" },
] as const;

type ConnectForm = {
  provider: string;
  api_key: string;
  secret_key: string;
  access_token: string;
  refresh_token: string;
};

const emptyForm: ConnectForm = {
  provider: "steadfast",
  api_key: "",
  secret_key: "",
  access_token: "",
  refresh_token: "",
};

export default function CourierIntegration() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCouriers = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Courier> | Courier[]>("admin/couriers/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setCouriers(list ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("admin/couriers/", form);
      setShowForm(false);
      setForm({ ...emptyForm });
      fetchCouriers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to connect courier.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Disconnect this courier?")) return;
    setDeletingId(publicId);
    try {
      await api.delete(`admin/couriers/${publicId}/`);
      fetchCouriers();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(courier: Courier) {
    setTogglingId(courier.public_id);
    try {
      await api.patch(`admin/couriers/${courier.public_id}/`, {
        is_active: !courier.is_active,
      });
      fetchCouriers();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Courier Integration
          </h3>
        </div>
        {!showForm && couriers.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="text-xs"
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Connect Pathao or Steadfast to dispatch orders directly from the
        dashboard.
      </p>

      {showForm && (
        <div className="mb-4 rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Connect a Courier
            </span>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <form onSubmit={handleConnect} className="space-y-3 max-w-md">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Provider
              </label>
              <select
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value })
                }
                className="input"
              >
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                API Key
              </label>
              <Input
                type="password"
                required
                value={form.api_key}
                onChange={(e) =>
                  setForm({ ...form, api_key: e.target.value })
                }
                placeholder="Enter API key"
                className="max-w-md"
                autoComplete="off"
              />
            </div>
            {form.provider === "steadfast" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Secret Key
                </label>
                <Input
                  type="password"
                  required
                  value={form.secret_key}
                  onChange={(e) =>
                    setForm({ ...form, secret_key: e.target.value })
                  }
                  placeholder="Enter secret key"
                  className="max-w-md"
                  autoComplete="off"
                />
              </div>
            )}
            {form.provider === "pathao" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Access Token
                  </label>
                  <Input
                    type="password"
                    required
                    value={form.access_token}
                    onChange={(e) =>
                      setForm({ ...form, access_token: e.target.value })
                    }
                    placeholder="Enter access/bearer token"
                    className="max-w-md"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Refresh Token (optional)
                  </label>
                  <Input
                    type="password"
                    value={form.refresh_token}
                    onChange={(e) =>
                      setForm({ ...form, refresh_token: e.target.value })
                    }
                    placeholder="Enter refresh token"
                    className="max-w-md"
                    autoComplete="off"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Connecting..." : "Connect"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : couriers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No couriers connected yet.
          </p>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="text-xs"
            >
              <Plus className="mr-1 size-3.5" />
              Connect Courier
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((c) => (
            <div
              key={c.public_id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground capitalize">
                    {c.provider}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    API Key:{" "}
                    <code className="font-mono">
                      {c.api_key_masked || "---"}
                    </code>
                  </span>
                  {c.secret_key_masked && (
                    <span>
                      Secret:{" "}
                      <code className="font-mono">{c.secret_key_masked}</code>
                    </span>
                  )}
                  {c.access_token_masked && (
                    <span>
                      Token:{" "}
                      <code className="font-mono">
                        {c.access_token_masked}
                      </code>
                    </span>
                  )}
                  <span>
                    Connected {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={togglingId === c.public_id}
                  onClick={() => handleToggleActive(c)}
                  className="text-xs"
                >
                  {togglingId === c.public_id
                    ? "..."
                    : c.is_active
                      ? "Deactivate"
                      : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingId === c.public_id}
                  onClick={() => handleDelete(c.public_id)}
                  className="border-destructive text-destructive hover:bg-destructive/10 text-xs"
                >
                  {deletingId === c.public_id ? "Removing..." : "Disconnect"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
