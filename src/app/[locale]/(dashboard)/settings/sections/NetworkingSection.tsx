"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

type APIKeyRow = {
  public_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at: string | null;
};

type APIKeyCreateResponse = {
  public_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  api_key: string;
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function extractRows(data: unknown): APIKeyRow[] {
  if (Array.isArray(data)) return (data as APIKeyRow[]).filter((row) => !row.revoked_at);
  if (data && typeof data === "object" && "results" in data) {
    const r = (data as { results?: APIKeyRow[] }).results;
    return Array.isArray(r) ? r.filter((row) => !row.revoked_at) : [];
  }
  return [];
}

export default function NetworkingSection({ hidden }: { hidden: boolean }) {
  const [keys, setKeys] = useState<APIKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const API_BASE_URL = "https://api.akkho.com/api/v1/";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("settings/network/api-keys/");
      setKeys(extractRows(data));
      setError(null);
    } catch {
      setError("Could not load API keys.");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setBusy(true);
    setMessage(null);
    setRevealedKey(null);
    try {
      const payload = { name: newKeyName.trim() || "Default key" };
      const { data } = await api.post<APIKeyCreateResponse>("settings/network/api-keys/", payload);
      setNewKeyName("");
      setRevealedKey(data.api_key);
      setMessage("API key created. Save it now; it will not be shown again.");
      await load();
    } catch {
      setMessage("Failed to create API key.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateKey(publicId: string, currentName: string) {
    if (!globalThis.confirm("Regenerate this API key? The old key will be revoked.")) return;
    setBusy(true);
    setMessage(null);
    setRevealedKey(null);
    try {
      const { data } = await api.post<APIKeyCreateResponse>(
        `settings/network/api-keys/${publicId}/regenerate/`,
        { name: currentName }
      );
      setRevealedKey(data.api_key);
      setMessage("API key regenerated. Save the new key now; it will not be shown again.");
      await load();
    } catch {
      setMessage("Could not regenerate API key.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(publicId: string) {
    if (!globalThis.confirm("Delete (revoke) this API key?")) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.delete(`settings/network/api-keys/${publicId}/`);
      // Remove immediately so deleted keys disappear from the screen.
      setKeys((prev) => prev.filter((row) => row.public_id !== publicId));
      setMessage("API key revoked.");
    } catch {
      setMessage("Could not revoke API key.");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
  }

  return (
    <section
      id="panel-networking"
      role="tabpanel"
      aria-labelledby="tab-networking"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Networking</h2>
          <p className="text-sm text-muted-foreground">
            Use API keys to authenticate tenant API and WebSocket requests.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Storefront (publishable key)</p>
          <p className="mt-2 leading-relaxed">
            Headless sites should call <code className="rounded bg-muted px-1">GET/POST …/api/v1/…</code> with{" "}
            <code className="rounded bg-muted px-1">Authorization: Bearer &lt;ak_pk_…&gt;</code>. Response
            field names differ from this dashboard&apos;s admin API — for example products use{" "}
            <code className="rounded bg-muted px-1">image_url</code>,{" "}
            <code className="rounded bg-muted px-1">category_public_id</code> /{" "}
            <code className="rounded bg-muted px-1">category_slug</code> /{" "}
            <code className="rounded bg-muted px-1">category_name</code> (not a single{" "}
            <code className="rounded bg-muted px-1">category</code> slug); banners and CTAs use{" "}
            <code className="rounded bg-muted px-1">cta_url</code> and{" "}
            <code className="rounded bg-muted px-1">cta_label</code> on public list endpoints. TypeScript
            types for those payloads live in{" "}
            <code className="rounded bg-muted px-1">src/types/storefront-api.ts</code> (re-exported from{" "}
            <code className="rounded bg-muted px-1">@/types</code>). See the backend{" "}
            <code className="rounded bg-muted px-1">README.md</code> section &quot;Storefront JSON contract&quot;
            for the full list.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">API Base URL</p>
          <div className="mt-2 flex items-start justify-between gap-2">
            <code className="min-w-0 break-all rounded bg-background px-2 py-1 text-sm">{API_BASE_URL}</code>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => copy(API_BASE_URL)}>
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}

        {revealedKey && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-foreground">New API key (shown once)</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <code className="rounded bg-background px-2 py-1 break-all">{revealedKey}</code>
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => copy(revealedKey)}>
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading API keys…
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.public_id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{k.name}</p>
                  <p className="break-words text-xs leading-relaxed text-muted-foreground">
                    Prefix: <code className="break-all rounded bg-muted px-1">{k.key_prefix}</code> · Created:{" "}
                    {formatCreatedAt(k.created_at)} · {k.revoked_at ? "Revoked" : "Active"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || !!k.revoked_at}
                    onClick={() => void regenerateKey(k.public_id, k.name)}
                  >
                    <RefreshCcw className="mr-1 size-4" />
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    disabled={busy || !!k.revoked_at}
                    aria-label="Delete API key"
                    onClick={() => void revokeKey(k.public_id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {keys.length === 0 && (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Create API key</p>
          <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="e.g. Frontend"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={busy}
              className="sm:flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-primary text-primary hover:bg-primary/10"
              disabled={busy}
              onClick={() => void createKey()}
            >
              <KeyRound className="mr-2 size-4" />
              Create Key
            </Button>
          </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}
