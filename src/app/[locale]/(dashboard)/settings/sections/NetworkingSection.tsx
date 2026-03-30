"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, KeyRound, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { formatDashboardDateTimeWithSeconds } from "@/lib/datetime-display";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";
import { notify } from "@/notifications";

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

function extractRows(data: unknown): APIKeyRow[] {
  if (Array.isArray(data)) return (data as APIKeyRow[]).filter((row) => !row.revoked_at);
  if (data && typeof data === "object" && "results" in data) {
    const r = (data as { results?: APIKeyRow[] }).results;
    return Array.isArray(r) ? r.filter((row) => !row.revoked_at) : [];
  }
  return [];
}

export default function NetworkingSection({ hidden }: { hidden: boolean }) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const [keys, setKeys] = useState<APIKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiUrlCopied, setApiUrlCopied] = useState(false);
  const API_BASE_URL = "https://api.paperbase.me";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("settings/network/api-keys/");
      setKeys(extractRows(data));
      setError(null);
    } catch {
      setError(t("networking.loadError"));
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!apiUrlCopied) return;
    const timer = window.setTimeout(() => setApiUrlCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [apiUrlCopied]);

  async function createKey() {
    setBusy(true);
    setMessage(null);
    setRevealedKey(null);
    try {
      const payload = { name: newKeyName.trim() || t("networking.defaultKeyName") };
      const { data } = await api.post<APIKeyCreateResponse>("settings/network/api-keys/", payload);
      setNewKeyName("");
      setRevealedKey(data.api_key);
      setMessage(t("networking.msgCreated"));
      await load();
    } catch {
      setMessage(t("networking.msgCreateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function regenerateKey(publicId: string, currentName: string) {
    const ok = await notify.confirm({ title: t("networking.confirmRegenerate"), level: "warning" });
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    setRevealedKey(null);
    try {
      const { data } = await api.post<APIKeyCreateResponse>(
        `settings/network/api-keys/${publicId}/regenerate/`,
        { name: currentName }
      );
      setRevealedKey(data.api_key);
      setMessage(t("networking.msgRegenerated"));
      await load();
    } catch {
      setMessage(t("networking.msgRegenerateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(publicId: string) {
    const ok = await notify.confirm({ title: t("networking.confirmRevoke"), level: "destructive" });
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.delete(`settings/network/api-keys/${publicId}/`);
      // Remove immediately so deleted keys disappear from the screen.
      setKeys((prev) => prev.filter((row) => row.public_id !== publicId));
      setMessage(t("networking.msgRevoked"));
    } catch {
      setMessage(t("networking.msgRevokeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function copyApiBaseUrl() {
    const didCopy = await copy(API_BASE_URL);
    if (didCopy) setApiUrlCopied(true);
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
          <h2 className="text-lg font-semibold text-foreground">{t("networking.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("networking.subtitle")}</p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("networking.apiBaseUrl")}</p>
          <div className="mt-2 flex items-start justify-between gap-2">
            <code className="min-w-0 break-all rounded bg-background px-2 py-1 text-sm">{API_BASE_URL}</code>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => void copyApiBaseUrl()}>
              {apiUrlCopied ? <Check className="size-4 text-emerald-600 animate-pulse" /> : <Copy className="size-4" />}
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
            <p className="font-medium text-foreground">{t("networking.newKeyTitle")}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <code className="rounded bg-background px-2 py-1 break-all">{revealedKey}</code>
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => void copy(revealedKey)}>
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("networking.loadingKeys")}
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
                    {t("networking.prefix")}{" "}
                    <code className="break-all rounded bg-muted px-1">{k.key_prefix}</code> · {t("networking.created")}{" "}
                    {formatDashboardDateTimeWithSeconds(k.created_at, locale)} · {k.revoked_at ? t("networking.statusRevoked") : t("networking.statusActive")}
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
                    {t("networking.regenerate")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    disabled={busy || !!k.revoked_at}
                    aria-label={t("networking.deleteKeyAria")}
                    onClick={() => void revokeKey(k.public_id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {keys.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("networking.noKeys")}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("networking.createHeading")}</p>
          <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder={t("networking.namePlaceholder")}
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
              {t("networking.createButton")}
            </Button>
          </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}
