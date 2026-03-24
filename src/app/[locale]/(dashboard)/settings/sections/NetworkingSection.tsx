"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, Copy, Loader2, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

type DomainRow = {
  public_id: string;
  domain: string;
  is_custom: boolean;
  is_verified: boolean;
  is_primary: boolean;
  verification_token?: string | null;
  verification_hostname?: string | null;
};

function extractRows(data: unknown): DomainRow[] {
  if (Array.isArray(data)) return data as DomainRow[];
  if (data && typeof data === "object" && "results" in data) {
    const r = (data as { results?: DomainRow[] }).results;
    return Array.isArray(r) ? r : [];
  }
  return [];
}

export default function NetworkingSection({ hidden }: { hidden: boolean }) {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [customHost, setCustomHost] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("stores/domains/");
      setDomains(extractRows(data));
      setError(null);
    } catch {
      setError("Could not load domains.");
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCustom() {
    const host = customHost.trim().toLowerCase();
    if (!host) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post("stores/domains/", { domain: host });
      setCustomHost("");
      setMessage("Custom domain added. Add the DNS TXT record, then verify.");
      await load();
    } catch {
      setMessage("Failed to add domain (already in use or invalid).");
    } finally {
      setBusy(false);
    }
  }

  async function verifyDomain(publicId: string) {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`stores/domains/${publicId}/verify/`);
      setMessage("Domain verified.");
      await load();
    } catch {
      setMessage("Verification failed. Check your TXT record at _mybaas.<your-domain>.");
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(publicId: string) {
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`stores/domains/${publicId}/set-primary/`);
      setMessage("Primary domain updated.");
      await load();
    } catch {
      setMessage("Could not set primary domain.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCustom(publicId: string) {
    if (!globalThis.confirm("Remove this custom domain?")) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.delete(`stores/domains/${publicId}/`);
      setMessage("Custom domain removed.");
      await load();
    } catch {
      setMessage("Could not remove domain.");
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
      className="rounded-xl border border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-semibold text-foreground">Networking</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Your storefront and WebSockets resolve from verified domains. Each store has one generated
        subdomain and up to one custom domain.
      </p>

      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-3 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading domains…
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => (
            <div
              key={d.public_id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Cloud className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{d.domain}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.is_custom ? "Custom domain" : "Generated subdomain"}
                    {d.is_verified ? " · Verified" : " · Pending verification"}
                    {d.is_primary ? " · Primary" : ""}
                  </p>
                  {d.is_custom && !d.is_verified && d.verification_hostname && d.verification_token && (
                    <div className="mt-2 rounded-md border border-dashed border-border bg-background/80 p-2 text-xs">
                      <p className="font-medium text-foreground">DNS TXT</p>
                      <p className="mt-1 break-all text-muted-foreground">
                        Name:{" "}
                        <code className="rounded bg-muted px-1">{d.verification_hostname}</code>
                      </p>
                      <p className="mt-1 break-all text-muted-foreground">
                        Value: <code className="rounded bg-muted px-1">{d.verification_token}</code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Copy hostname"
                  onClick={() => copy(d.domain)}
                >
                  <Copy className="size-4" />
                </Button>
                {d.is_custom && !d.is_verified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void verifyDomain(d.public_id)}
                  >
                    <ShieldCheck className="mr-1 size-4" />
                    Verify
                  </Button>
                )}
                {d.is_verified && !d.is_primary && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void setPrimary(d.public_id)}
                  >
                    <Star className="mr-1 size-4" />
                    Set primary
                  </Button>
                )}
                {d.is_custom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    disabled={busy}
                    aria-label="Remove custom domain"
                    onClick={() => void removeCustom(d.public_id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Real-time (authenticated): connect WebSocket to{" "}
        <code className="rounded bg-muted px-1">/ws/v1/store/events/?token=&lt;access_jwt&gt;</code> on
        your store hostname; JWT <code className="rounded bg-muted px-1">active_store_public_id</code> must
        match the store resolved from the Host header.
      </p>

      <div className="mt-6 space-y-2">
        <p className="text-sm font-medium text-foreground">Add custom domain</p>
        <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="shop.example.com"
            value={customHost}
            onChange={(e) => setCustomHost(e.target.value)}
            disabled={busy || domains.some((d) => d.is_custom)}
            className="sm:flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-primary text-primary hover:bg-primary/10"
            disabled={busy || domains.some((d) => d.is_custom)}
            onClick={() => void addCustom()}
          >
            <Plus className="mr-2 size-4" />
            Add domain
          </Button>
        </div>
      </div>
    </section>
  );
}
