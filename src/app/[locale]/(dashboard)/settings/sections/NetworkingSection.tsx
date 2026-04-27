"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, KeyRound, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { formatDashboardDateTimeWithSeconds } from "@/lib/datetime-display";
import { subscriptionIsPaidPeriod } from "@/lib/subscription-access";
import { cn } from "@/lib/utils";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { useAuth } from "@/context/AuthContext";
import { isNetworkingStoreUnderReview } from "@/lib/subscription-ui-state";
import { SettingsSectionSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";

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

/** Hide legacy auto-created keys from store onboarding (no longer created server-side). */
const LEGACY_AUTO_KEY_NAME = "Bootstrap Public";

function extractRows(data: unknown): APIKeyRow[] {
  const active = (row: APIKeyRow) =>
    !row.revoked_at && row.name !== LEGACY_AUTO_KEY_NAME;
  const rows = Array.isArray(data)
    ? (data as APIKeyRow[])
    : data && typeof data === "object" && "results" in data
      ? (((data as { results?: APIKeyRow[] }).results ?? []) as APIKeyRow[])
      : [];

  // Backend can return multiple active keys; dashboard UX expects a single "current" key.
  // Keep the newest active key only.
  const filtered = rows.filter(active).sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
    return String(b.created_at).localeCompare(String(a.created_at));
  });
  return filtered.length ? [filtered[0]] : [];
}

export default function NetworkingSection({ hidden }: { hidden: boolean }) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tPages = useTranslations("pages");
  const confirm = useConfirm();
  const { meProfile, meProfileStatus } = useAuth();
  const subscriptionStatus =
    meProfileStatus === "ready" && meProfile
      ? meProfile.subscription?.subscription_status ?? null
      : null;
  const subscriptionIsActive =
    meProfileStatus === "ready" && meProfile
      ? subscriptionIsPaidPeriod(meProfile)
      : false;
  const subscriptionIsInactive =
    subscriptionStatus === "NONE" && !subscriptionIsActive;
  const subscriptionLocked = subscriptionStatus !== null && !subscriptionIsActive;
  const planExpired =
    meProfileStatus === "ready" &&
    meProfile?.subscription?.subscription_status === "EXPIRED";
  const storeUnderReview =
    meProfileStatus === "ready" && meProfile
      ? isNetworkingStoreUnderReview(meProfile)
      : false;
  const showOnboardingInactiveHintEligible =
    subscriptionIsInactive && !planExpired && !storeUnderReview;

  const showHintKey = "paperbase_show_networking_lock_hint_v1";
  const [showOnboardingInactiveHint, setShowOnboardingInactiveHint] =
    useState(false);

  useEffect(() => {
    if (hidden) return;
    if (!showOnboardingInactiveHintEligible) {
      setShowOnboardingInactiveHint(false);
      return;
    }
    try {
      const raw = window.localStorage.getItem(showHintKey);
      if (raw === "1") {
        setShowOnboardingInactiveHint(true);
        window.localStorage.removeItem(showHintKey);
      } else {
        setShowOnboardingInactiveHint(false);
      }
    } catch {
      setShowOnboardingInactiveHint(false);
    }
  }, [hidden, showOnboardingInactiveHintEligible]);

  const networkingActionsLocked =
    subscriptionLocked || planExpired || storeUnderReview;
  const [keys, setKeys] = useState<APIKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiUrlCopied, setApiUrlCopied] = useState(false);
  const [revealedKeyCopied, setRevealedKeyCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const API_BASE_URL = "https://api.paperbase.me";
  const { handleKeyDown } = useEnterNavigation(() => {
    if (!busy && !networkingActionsLocked) {
      void createKey();
    }
  });

  const load = useCallback(async () => {
    if (networkingActionsLocked) {
      setKeys([]);
      setError(null);
      setLoading(false);
      return;
    }
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
  }, [networkingActionsLocked, t]);

  useEffect(() => {
    if (hidden) return;
    void load();
  }, [hidden, load]);

  useEffect(() => {
    if (!apiUrlCopied) return;
    const timer = window.setTimeout(() => setApiUrlCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [apiUrlCopied]);

  useEffect(() => {
    if (!promptCopied) return;
    const timer = window.setTimeout(() => setPromptCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [promptCopied]);

  useEffect(() => {
    if (!revealedKeyCopied) return;
    const timer = window.setTimeout(() => setRevealedKeyCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [revealedKeyCopied]);

  useEffect(() => {
    setRevealedKeyCopied(false);
  }, [revealedKey]);

  async function createKey() {
    if (networkingActionsLocked) return;
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
    if (networkingActionsLocked) return;
    const ok = await confirm({
      title: tPages("confirmDialogTitleRegenerateApiKey"),
      message: t("networking.confirmRegenerate"),
      variant: "default",
    });
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
    if (networkingActionsLocked) return;
    const ok = await confirm({
      title: tPages("confirmDialogTitleRevokeApiKey"),
      message: t("networking.confirmRevoke"),
      variant: "danger",
    });
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
    if (networkingActionsLocked) return;
    const didCopy = await copy(API_BASE_URL);
    if (didCopy) setApiUrlCopied(true);
  }

  async function copyRevealedKey() {
    if (networkingActionsLocked) return;
    if (!revealedKey) return;
    const didCopy = await copy(revealedKey);
    if (didCopy) {
      setRevealedKeyCopied(true);
      notify.success(t("networking.apiKeyCopiedDescription"), {
        title: t("networking.apiKeyCopiedTitle"),
      });
    } else {
      notify.warning(t("networking.apiKeyCopyFailed"));
    }
  }

  async function copyStorefrontPrompt() {
    if (networkingActionsLocked) return;
    setPromptLoading(true);
    try {
      const res = await fetch("/api/storefront-prompt", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const text = await res.text();
      const didCopy = await copy(text);
      if (didCopy) {
        setPromptCopied(true);
        notify.success(t("networking.promptCopiedDescription"), {
          title: t("networking.promptCopiedTitle"),
        });
      } else {
        notify.warning(t("networking.promptCopyFailed"));
      }
    } catch {
      notify.warning(t("networking.promptCopyFailed"));
    } finally {
      setPromptLoading(false);
    }
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

        {showOnboardingInactiveHint ? (
          <div
            role="status"
            className="rounded-card border border-destructive/35 bg-destructive/5 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {t("networking.lockedBody")}
              </p>
            </div>
          </div>
        ) : null}

        {planExpired ? (
          <p
            className="rounded-card border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            role="status"
          >
            {t("networking.subscriptionExpiredNotice")}
          </p>
        ) : null}
        {storeUnderReview ? (
          <p
            className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
            role="status"
          >
            {t("networking.storeUnderReviewNotice")}
          </p>
        ) : null}

        <div className="rounded-card border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("networking.apiBaseUrl")}</p>
          <div className="mt-2 flex items-start justify-between gap-2">
            <code className="min-w-0 break-all rounded-ui bg-background px-2 py-1 text-sm">{API_BASE_URL}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={networkingActionsLocked}
              onClick={() => void copyApiBaseUrl()}
            >
              {apiUrlCopied ? <Check className="size-4 text-emerald-600 animate-pulse" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="rounded-card border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("networking.storefrontPromptLabel")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("networking.storefrontPromptHint")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={promptLoading || networkingActionsLocked}
              onClick={() => void copyStorefrontPrompt()}
            >
              {promptLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : promptCopied ? (
                <Check className="mr-2 size-4 text-emerald-600" />
              ) : (
                <Copy className="mr-2 size-4" />
              )}
              {t("networking.copyStorefrontPrompt")}
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
          <div className="rounded-card border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-foreground">{t("networking.newKeyTitle")}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <code className="rounded-ui bg-background px-2 py-1 break-all">{revealedKey}</code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={revealedKeyCopied ? t("networking.apiKeyCopiedTitle") : t("networking.copyApiKey")}
                disabled={networkingActionsLocked}
                onClick={() => void copyRevealedKey()}
              >
                {revealedKeyCopied ? (
                  <Check className="size-4 text-emerald-600 animate-pulse" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <SettingsSectionSkeleton />
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.public_id}
                className="flex flex-col gap-3 rounded-card border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{k.name}</p>
                  <p className="break-words text-xs leading-relaxed text-muted-foreground">
                    {t("networking.prefix")}{" "}
                    <code className="break-all rounded-ui bg-muted px-1">{k.key_prefix}</code> · {t("networking.created")}{" "}
                    {formatDashboardDateTimeWithSeconds(k.created_at, locale)} · {k.revoked_at ? t("networking.statusRevoked") : t("networking.statusActive")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={settingsInvertedButtonClassName}
                    disabled={busy || !!k.revoked_at || networkingActionsLocked}
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
                    disabled={busy || !!k.revoked_at || networkingActionsLocked}
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
              onKeyDown={handleKeyDown}
              disabled={busy || networkingActionsLocked}
              className="sm:flex-1"
            />
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className={cn("shrink-0", settingsInvertedButtonClassName)}
              isLoading={busy}
              loadingText={t("networking.creatingKey")}
              disabled={networkingActionsLocked}
              onClick={() => void createKey()}
            >
              <KeyRound className="mr-2 size-4" />
              {t("networking.createButton")}
            </LoadingButton>
          </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}
