"use client";

import { useCallback, useEffect, useState } from "react";
import { Plug, Plus, X, Save } from "lucide-react";
import api from "@/lib/api";
import type {
  MarketingIntegration as MarketingIntegrationType,
  IntegrationEventSettings,
  PaginatedResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ConnectForm = {
  provider: string;
  pixel_id: string;
  access_token: string;
  test_event_code: string;
};

const emptyForm: ConnectForm = {
  provider: "facebook",
  pixel_id: "",
  access_token: "",
  test_event_code: "",
};

const EVENT_LABELS: { key: keyof IntegrationEventSettings; label: string }[] = [
  { key: "track_purchase", label: "Purchase" },
  { key: "track_initiate_checkout", label: "Initiate Checkout" },
  { key: "track_view_content", label: "View Content" },
  { key: "track_page_view", label: "Page View" },
];

export default function MarketingIntegration() {
  const [integrations, setIntegrations] = useState<MarketingIntegrationType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [eventSavingId, setEventSavingId] = useState<string | null>(null);

  const fetchIntegrations = useCallback(() => {
    setLoading(true);
    api
      .get<
        PaginatedResponse<MarketingIntegrationType> | MarketingIntegrationType[]
      >("admin/marketing-integrations/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setIntegrations(list ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("admin/marketing-integrations/", form);
      setShowForm(false);
      setForm({ ...emptyForm });
      fetchIntegrations();
    } catch (err: unknown) {
      const data = (
        err as { response?: { data?: Record<string, unknown> } }
      )?.response?.data;
      const msg =
        (data?.detail as string) ??
        Object.values(data ?? {})
          .flat()
          .join(" ") ??
        "Failed to connect integration.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Disconnect this marketing integration?")) return;
    setDeletingId(publicId);
    try {
      await api.delete(`admin/marketing-integrations/${publicId}/`);
      fetchIntegrations();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(integration: MarketingIntegrationType) {
    setTogglingId(integration.public_id);
    try {
      await api.patch(
        `admin/marketing-integrations/${integration.public_id}/`,
        { is_active: !integration.is_active }
      );
      fetchIntegrations();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleEventToggle(
    integration: MarketingIntegrationType,
    key: keyof IntegrationEventSettings,
    value: boolean
  ) {
    setEventSavingId(integration.public_id);
    try {
      await api.patch(
        `admin/marketing-integrations/${integration.public_id}/events/`,
        { [key]: value }
      );
      fetchIntegrations();
    } catch (err) {
      console.error(err);
    } finally {
      setEventSavingId(null);
    }
  }

  const providerLabel = (provider: string) => {
    const map: Record<string, string> = {
      facebook: "Conversions API",
      google_analytics: "Google Analytics",
      tiktok: "TikTok",
    };
    return map[provider] ?? provider;
  };

  const hasFacebook = integrations.some((i) => i.provider === "facebook");

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Marketing Integrations
          </h3>
        </div>
        {!showForm && integrations.length > 0 && (
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
      <p className="mb-2 text-xs text-muted-foreground">
        Connect server-side marketing tools to measure campaigns and attribute
        conversions. Credentials are stored securely on your store.
      </p>
      <p className="mb-4 text-xs text-muted-foreground/80 italic">
        Google Analytics, TikTok, and other marketing integrations are coming
        soon.
      </p>

      {showForm && (
        <div className="mb-4 rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Connect Marketing Integration
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
            {!hasFacebook && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Pixel ID
                  </label>
                  <Input
                    required
                    value={form.pixel_id}
                    onChange={(e) =>
                      setForm({ ...form, pixel_id: e.target.value })
                    }
                    placeholder="e.g. 123456789012345"
                    className="max-w-md"
                  />
                </div>
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
                    placeholder="Enter your Conversions API access token"
                    className="max-w-md"
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Test Event Code{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <Input
                    value={form.test_event_code}
                    onChange={(e) =>
                      setForm({ ...form, test_event_code: e.target.value })
                    }
                    placeholder="e.g. TEST12345"
                    className="max-w-md"
                  />
                </div>
              </>
            )}
            {hasFacebook && (
              <p className="text-sm text-muted-foreground">
                This provider is already connected. Disconnect the existing
                integration first.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              {!hasFacebook && (
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="mr-1 size-3.5" />
                  {saving ? "Connecting..." : "Connect"}
                </Button>
              )}
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
      ) : integrations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No marketing integrations connected yet.
          </p>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="text-xs"
            >
              <Plus className="mr-1 size-3.5" />
              Connect Integration
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.public_id}
              className="rounded-lg border border-border bg-background p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {providerLabel(integration.provider)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        integration.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {integration.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      Pixel:{" "}
                      <code className="font-mono">
                        {integration.pixel_id || "---"}
                      </code>
                    </span>
                    <span>
                      Token:{" "}
                      <code className="font-mono">
                        {integration.access_token_masked || "---"}
                      </code>
                    </span>
                    {integration.test_event_code && (
                      <span>
                        Test Code:{" "}
                        <code className="font-mono">
                          {integration.test_event_code}
                        </code>
                      </span>
                    )}
                    <span>
                      Connected{" "}
                      {new Date(integration.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglingId === integration.public_id}
                    onClick={() => handleToggleActive(integration)}
                    className="text-xs"
                  >
                    {togglingId === integration.public_id
                      ? "..."
                      : integration.is_active
                        ? "Deactivate"
                        : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deletingId === integration.public_id}
                    onClick={() => handleDelete(integration.public_id)}
                    className="border-destructive text-destructive hover:bg-destructive/10 text-xs"
                  >
                    {deletingId === integration.public_id
                      ? "Removing..."
                      : "Disconnect"}
                  </Button>
                </div>
              </div>

              {/* Event toggles */}
              {integration.event_settings && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-foreground mb-2">
                    Event Tracking
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {EVENT_LABELS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={integration.event_settings![key]}
                          disabled={eventSavingId === integration.public_id}
                          onChange={(e) =>
                            handleEventToggle(
                              integration,
                              key,
                              e.target.checked
                            )
                          }
                          className="form-checkbox size-3.5"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
