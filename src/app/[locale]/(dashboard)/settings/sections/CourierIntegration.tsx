"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, Truck } from "lucide-react";
import api from "@/lib/api";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import type { Courier, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";
import { SettingsSectionSkeleton } from "@/components/skeletons/dashboard-skeletons";

type ConnectForm = {
  api_key: string;
  secret_key: string;
};

const emptyForm: ConnectForm = {
  api_key: "",
  secret_key: "",
};

type CourierModal = null | "connect";

export default function CourierIntegration() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const confirm = useConfirm();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<CourierModal>(null);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [generatedTokenByCourierId, setGeneratedTokenByCourierId] = useState<Record<string, string>>(
    {}
  );
  const [tokenRevealedByCourierId, setTokenRevealedByCourierId] = useState<Record<string, boolean>>(
    {}
  );
  const [tokenFieldFocusedByCourierId, setTokenFieldFocusedByCourierId] = useState<
    Record<string, boolean>
  >({});
  const [tokenCopiedByCourierId, setTokenCopiedByCourierId] = useState<Record<string, boolean>>({});
  const [savingWebhookTokenId, setSavingWebhookTokenId] = useState<string | null>(null);
  const connectFormRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => connectFormRef.current?.requestSubmit());

  async function copyToClipboard(text: string) {
    const value = (text || "").trim();
    if (!value) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        el.remove();
      }
      notify.success("Copied!");
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  function generateToken32(): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  function handleGenerateToken(courierPublicId: string) {
    const existing = generatedTokenByCourierId[courierPublicId];
    const doGenerate = () => {
      const token = generateToken32();
      setGeneratedTokenByCourierId((prev) => ({
        ...prev,
        [courierPublicId]: token,
      }));
      setTokenRevealedByCourierId((prev) => ({ ...prev, [courierPublicId]: true }));
      setTokenCopiedByCourierId((prev) => ({ ...prev, [courierPublicId]: false }));
    };

    if (!existing) {
      doGenerate();
      return;
    }

    void confirm({
      title: "Regenerate token?",
      message:
        "This will replace the currently generated token on this page. Make sure you have saved it somewhere safe.",
      variant: "default",
      confirmText: "Regenerate",
      onConfirm: async () => {
        doGenerate();
      },
    });
  }

  useEffect(() => {
    if (!Object.values(tokenCopiedByCourierId).some(Boolean)) return;
    const timer = window.setTimeout(() => setTokenCopiedByCourierId({}), 1500);
    return () => window.clearTimeout(timer);
  }, [tokenCopiedByCourierId]);

  async function handleSaveWebhookToken(courierPublicId: string) {
    const raw = (generatedTokenByCourierId[courierPublicId] || "").trim();
    if (!raw) return;
    setSavingWebhookTokenId(courierPublicId);
    try {
      await api.patch(`admin/couriers/${courierPublicId}/`, { webhook_token: raw });
      notify.success("Webhook token saved successfully");
      fetchCouriers();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setSavingWebhookTokenId(null);
    }
  }

  const fetchCouriers = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Courier> | Courier[]>("admin/couriers/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setCouriers(list ?? []);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  function closeConnectModal() {
    setModal(null);
    setForm({ ...emptyForm });
    setError("");
    setSaving(false);
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      provider: "steadfast" as const,
      api_key: form.api_key.trim(),
      secret_key: form.secret_key.trim(),
      is_active: true,
    };
    try {
      await api.post("admin/couriers/", payload);
      closeConnectModal();
      fetchCouriers();
    } catch (err: unknown) {
      setError(formatAdminApiErrorFromAxios(err, t("courier.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  function requestDisconnect(publicId: string) {
    void confirm({
      title: t("courier.modalDisconnectTitle"),
      message: t("courier.modalDisconnectDescription"),
      variant: "danger",
      confirmText: t("courier.disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(`admin/couriers/${publicId}/`);
          fetchCouriers();
        } catch (err) {
          console.error(err);
          notify.error(err);
          throw err;
        }
      },
    });
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
      notify.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-medium text-foreground">{t("courier.heading")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("courier.intro")}</p>
      </div>

      {!loading && modal !== "connect" && couriers.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className={settingsInvertedButtonClassName}
            onClick={() => setModal("connect")}
          >
            {t("add")}
          </Button>
        </div>
      ) : null}

      <SettingsActionDialog
        open={modal === "connect"}
        onOpenChange={(next) => {
          if (!next) closeConnectModal();
        }}
        title={t("courier.modalConnectTitle")}
        description={t("courier.modalConnectDescription")}
      >
        <form ref={connectFormRef} onSubmit={handleConnect} className="space-y-3">
          {error ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{t("courier.apiKey")}</label>
            <Input
              type="password"
              required
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={t("courier.apiKeyPlaceholder")}
              autoComplete="off"
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{t("courier.secretKey")}</label>
            <Input
              type="password"
              required
              value={form.secret_key}
              onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
              placeholder={t("courier.secretKeyPlaceholder")}
              autoComplete="off"
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              variant="outline"
              className={settingsInvertedButtonClassName}
              disabled={saving}
              loading={saving}
            >
              {t("courier.connect")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={settingsInvertedButtonClassName}
              onClick={closeConnectModal}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SettingsActionDialog>

      {loading ? (
        <SettingsSectionSkeleton />
      ) : couriers.length === 0 ? (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-sm text-muted-foreground">{t("courier.empty")}</p>
          {modal !== "connect" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => setModal("connect")}
              >
                {t("courier.connectCta")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((c) => (
            <div key={c.public_id} className="space-y-3">
              <div className="flex flex-col gap-3 rounded-card border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize text-foreground">
                      {t("courier.providerName")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-tooltip px-2 py-0.5 text-xs font-medium ${
                        c.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {c.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {t("courier.apiKeyLabel")}{" "}
                      <code className="font-mono">{c.api_key_masked || "---"}</code>
                    </span>
                    {c.secret_key_masked ? (
                      <span>
                        {t("courier.secretLabel")}{" "}
                        <code className="font-mono">{c.secret_key_masked}</code>
                      </span>
                    ) : null}
                    <span>
                      {t("courier.connectedOn")} {formatDashboardDate(c.created_at, locale)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    className={settingsInvertedButtonClassName}
                    disabled={togglingId === c.public_id}
                    loading={togglingId === c.public_id}
                    onClick={() => handleToggleActive(c)}
                  >
                    {c.is_active ? t("courier.deactivate") : t("courier.activate")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => requestDisconnect(c.public_id)}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    {t("courier.disconnect")}
                  </Button>
                </div>
              </div>

              {c.is_active ? (
                <div className="rounded-card border border-border bg-background p-3 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-foreground">Webhook Setup</h4>
                    <p className="text-xs text-muted-foreground">
                      Follow these steps to enable live delivery status updates.
                    </p>
                  </div>

                  <ol className="space-y-4 text-sm">
                    <li className="space-y-1">
                      <p className="font-medium text-foreground">1. Go to your Steadfast portal</p>
                      <p className="text-xs text-muted-foreground">
                        Log in to portal.packzy.com and navigate to the Webhook settings page.
                      </p>
                    </li>

                    <li className="space-y-2">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">2. Set your Callback URL</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          readOnly
                          value="https://api.paperbase.me/api/v1/webhooks/steadfast/"
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className={settingsInvertedButtonClassName}
                          onClick={() =>
                            copyToClipboard("https://api.paperbase.me/api/v1/webhooks/steadfast/")
                          }
                        >
                          Copy
                        </Button>
                      </div>
                    </li>

                    <li className="space-y-2">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">3. Generate and set your Auth Token</p>
                        <p className="text-xs text-muted-foreground">
                          Generate a secure random token, save it in your Steadfast portal, and keep a
                          copy — you will need it later for your server configuration.
                        </p>
                      </div>

                      {(() => {
                        const token = (generatedTokenByCourierId[c.public_id] || "").trim();
                        const hasLocalToken = token.length > 0;
                        const hasStoredToken = Boolean(c.has_webhook_token);
                        const hasToken = hasLocalToken || hasStoredToken;
                        const revealed = Boolean(tokenRevealedByCourierId[c.public_id]);
                        const focused = Boolean(tokenFieldFocusedByCourierId[c.public_id]);
                        const showPlain = !hasToken || revealed || focused;
                        const copied = Boolean(tokenCopiedByCourierId[c.public_id]);
                        return (
                          <div className="space-y-1">
                            <label
                              htmlFor={`steadfast_webhook_token_${c.public_id}`}
                              className="text-sm font-medium leading-normal text-foreground"
                            >
                              Auth Token
                            </label>
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                              <div className="flex min-w-0 flex-1 items-stretch gap-2">
                                {hasToken && !showPlain ? (
                                  <button
                                    type="button"
                                    id={`steadfast_webhook_token_${c.public_id}`}
                                    title="Click to reveal"
                                    aria-label="Click to reveal"
                                    onClick={() =>
                                      setTokenRevealedByCourierId((prev) => ({
                                        ...prev,
                                        [c.public_id]: true,
                                      }))
                                    }
                                    className={cn(
                                      "flex h-9 min-w-0 w-full cursor-pointer items-center rounded-ui border border-border bg-background px-3 py-1 text-left font-mono text-sm text-foreground shadow-xs",
                                      "transition-[color,box-shadow] outline-none hover:bg-muted/40",
                                      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                    )}
                                  >
                                    <span className="truncate tracking-[0.2em] text-muted-foreground" aria-hidden>
                                      {"•".repeat(Math.min((hasLocalToken ? token.length : 32), 48))}
                                    </span>
                                  </button>
                                ) : (
                                  <Input
                                    id={`steadfast_webhook_token_${c.public_id}`}
                                    type="text"
                                    autoComplete="new-password"
                                    value={token}
                                    onChange={(e) =>
                                      setGeneratedTokenByCourierId((prev) => ({
                                        ...prev,
                                        [c.public_id]: e.target.value,
                                      }))
                                    }
                                    onFocus={() =>
                                      setTokenFieldFocusedByCourierId((prev) => ({
                                        ...prev,
                                        [c.public_id]: true,
                                      }))
                                    }
                                    onBlur={() =>
                                      setTokenFieldFocusedByCourierId((prev) => ({
                                        ...prev,
                                        [c.public_id]: false,
                                      }))
                                    }
                                    className="min-w-0 flex-1 font-mono text-sm"
                                    placeholder={
                                      hasStoredToken && !hasLocalToken
                                        ? "Token is set (hidden). Paste a new token to rotate"
                                        : hasToken
                                          ? "Paste a new token to rotate"
                                          : "Generate a token"
                                    }
                                  />
                                )}

                                {hasLocalToken && showPlain && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Copy token"
                                    aria-label={copied ? "Copied" : "Copy token"}
                                    className="size-9 shrink-0"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={async () => {
                                      await copyToClipboard(token);
                                      setTokenCopiedByCourierId((prev) => ({
                                        ...prev,
                                        [c.public_id]: true,
                                      }));
                                    }}
                                  >
                                    {copied ? (
                                      <Check className="size-4 text-emerald-600" aria-hidden />
                                    ) : (
                                      <Copy className="size-4" aria-hidden />
                                    )}
                                  </Button>
                                )}
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`${settingsInvertedButtonClassName} shrink-0 sm:self-stretch`}
                                onClick={() => handleGenerateToken(c.public_id)}
                              >
                                {hasToken ? "Regenerate Token" : "Generate Token"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`${settingsInvertedButtonClassName} shrink-0 sm:self-stretch`}
                                disabled={!hasLocalToken || savingWebhookTokenId === c.public_id}
                                loading={savingWebhookTokenId === c.public_id}
                                onClick={() => void handleSaveWebhookToken(c.public_id)}
                              >
                                Save
                              </Button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Save this token somewhere safe. It will not be stored here.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This saves your token securely to Paperbase so incoming webhooks can be verified.
                            </p>
                            {hasStoredToken && !hasLocalToken ? (
                              <p className="text-xs text-muted-foreground">
                                A token is already saved for this courier, but it cannot be displayed here. Paste a
                                new one to replace it.
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </li>

                    <li className="space-y-1">
                      <p className="font-medium text-foreground">4. Save in Steadfast portal</p>
                      <p className="text-xs text-muted-foreground">
                        Click Save in your Steadfast portal. Your dashboard will now receive live
                        delivery status updates automatically.
                      </p>
                    </li>
                  </ol>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
