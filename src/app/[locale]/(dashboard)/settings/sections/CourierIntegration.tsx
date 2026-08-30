"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Check, Truck, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { apiOrigin } from "@/lib/api-client";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import type { Courier } from "@/types";
import { useCouriersQuery } from "@/hooks/useCouriersQuery";
import { usePermissions } from "@/context/PermissionsContext";
import { couriersQueryKey } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";

// Callback the merchant pastes into Steadfast — must point at THIS instance's API, not paperbase.
const STEADFAST_WEBHOOK_CALLBACK_URL = `${apiOrigin()}/api/v1/webhooks/steadfast/`;

type ConnectForm = {
  api_key: string;
  secret_key: string;
};

const emptyForm: ConnectForm = {
  api_key: "",
  secret_key: "",
};

type CourierModal = null | "connect";

type SteadfastCourierRowProps = {
  c: Courier;
  locale: string;
  t: (key: string) => string;
  togglingId: string | null;
  savingWebhookTokenId: string | null;
  generatedTokenByCourierId: Record<string, string>;
  setGeneratedTokenByCourierId: Dispatch<SetStateAction<Record<string, string>>>;
  tokenRevealedByCourierId: Record<string, boolean>;
  setTokenRevealedByCourierId: Dispatch<SetStateAction<Record<string, boolean>>>;
  tokenFieldFocusedByCourierId: Record<string, boolean>;
  setTokenFieldFocusedByCourierId: Dispatch<SetStateAction<Record<string, boolean>>>;
  tokenCopiedByCourierId: Record<string, boolean>;
  setTokenCopiedByCourierId: Dispatch<SetStateAction<Record<string, boolean>>>;
  copyToClipboard: (text: string) => void | Promise<void>;
  onToggleActive: (courier: Courier) => void;
  onDisconnect: (publicId: string) => void;
  onGenerateToken: (courierPublicId: string) => void;
  onSaveWebhookToken: (courierPublicId: string) => void;
};

function SteadfastCourierRow({
  c,
  locale,
  t,
  togglingId,
  savingWebhookTokenId,
  generatedTokenByCourierId,
  setGeneratedTokenByCourierId,
  tokenRevealedByCourierId,
  setTokenRevealedByCourierId,
  tokenFieldFocusedByCourierId,
  setTokenFieldFocusedByCourierId,
  tokenCopiedByCourierId,
  setTokenCopiedByCourierId,
  copyToClipboard,
  onToggleActive,
  onDisconnect,
  onGenerateToken,
  onSaveWebhookToken,
}: SteadfastCourierRowProps) {
  const [open, setOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-[11px] text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 text-[13px] font-medium text-foreground">
          {t("courier.providerName")}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              c.is_active ? "bg-green-500" : "bg-muted-foreground",
            )}
            aria-hidden
          />
          {c.is_active ? t("integrations.statusConnected") : t("inactive")}
        </span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-8 border-b border-border px-3.5 py-2.5">
            <div>
              <span className="mb-0.5 block text-[11px] text-muted-foreground">{t("courier.apiKey")}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{c.api_key_masked || "—"}</span>
            </div>
            {c.secret_key_masked ? (
              <div>
                <span className="mb-0.5 block text-[11px] text-muted-foreground">{t("courier.secretKey")}</span>
                <span className="font-mono text-[12px] text-muted-foreground">{c.secret_key_masked}</span>
              </div>
            ) : null}
            <div>
              <span className="mb-0.5 block text-[11px] text-muted-foreground">{t("courier.connectedOn")}</span>
              <span className="font-mono text-[12px] text-muted-foreground">
                {formatDashboardDate(c.created_at, locale)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[36px] text-[12px] sm:min-h-0"
              disabled={togglingId === c.public_id}
              loading={togglingId === c.public_id}
              onClick={() => onToggleActive(c)}
            >
              {c.is_active ? t("courier.deactivate") : t("courier.activate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[36px] border-none text-[12px] text-destructive hover:bg-destructive/10 sm:min-h-0"
              onClick={() => onDisconnect(c.public_id)}
            >
              {t("courier.disconnect")}
            </Button>
          </div>
          {c.is_active ? (
            <>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-1.5 border-b border-border px-3.5 py-2.5 text-left text-[12px] text-muted-foreground transition-colors hover:bg-muted/40"
                onClick={() => setWebhookOpen((v) => !v)}
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform duration-150",
                    webhookOpen && "rotate-90",
                  )}
                  aria-hidden
                />
                <span>
                  Webhook setup
                  <span className="ml-1 text-[11px] text-muted-foreground/60">
                    — enable live delivery status updates
                  </span>
                </span>
              </button>
              {webhookOpen ? (
                <div className="flex flex-col gap-3.5 px-3.5 py-3.5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[11px] text-muted-foreground">1</span>
                      <span className="text-[12px] font-medium text-foreground">Go to your Steadfast portal</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Log in to portal.packzy.com and navigate to the Webhook settings page.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[11px] text-muted-foreground">2</span>
                      <span className="text-[12px] font-medium text-foreground">Set your Callback URL</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Copy the callback URL below into your Steadfast webhook settings.
                    </p>
                    <div className="mt-1 flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
                      <span className="flex-1 break-all font-mono text-[11px] text-muted-foreground">
                        {STEADFAST_WEBHOOK_CALLBACK_URL}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-[36px] shrink-0 sm:min-h-0"
                        onClick={() => void copyToClipboard(STEADFAST_WEBHOOK_CALLBACK_URL)}
                      >
                        <ClipboardTextIcon className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[11px] text-muted-foreground">3</span>
                      <span className="text-[12px] font-medium text-foreground">
                        Generate and set your Auth Token
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Generate a secure random token, save it in your Steadfast portal, and keep a copy — you will
                      need it later for your server configuration.
                    </p>
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
                        <div className="mt-1 flex flex-col gap-1">
                          <label
                            htmlFor={`steadfast_webhook_token_${c.public_id}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            Auth Token
                          </label>
                          <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
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
                                    "flex h-8 min-w-0 w-full cursor-pointer items-center rounded-md border border-border bg-background px-2.5 py-1 text-left font-mono text-[12px] text-foreground shadow-xs",
                                    "transition-[color,box-shadow] outline-none hover:bg-muted/40",
                                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                  )}
                                >
                                  <span
                                    className="truncate tracking-[0.2em] text-muted-foreground"
                                    aria-hidden
                                  >
                                    {"•".repeat(Math.min(hasLocalToken ? token.length : 32, 48))}
                                  </span>
                                </button>
                              ) : (
                                <Input
                                  id={`steadfast_webhook_token_${c.public_id}`}
                                  name={`steadfast_webhook_token_${c.public_id}`}
                                  type="text"
                                  autoComplete="off"
                                  spellCheck={false}
                                  autoCapitalize="off"
                                  autoCorrect="off"
                                  data-1p-ignore
                                  data-lpignore="true"
                                  data-bwignore
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
                                  className="h-8 min-w-0 flex-1 font-mono text-[12px]"
                                  placeholder={
                                    hasStoredToken && !hasLocalToken
                                      ? "Token is set (hidden). Paste a new token to rotate"
                                      : hasToken
                                        ? "Paste a new token to rotate"
                                        : "Generate a token"
                                  }
                                />
                              )}

                              {hasLocalToken && showPlain ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Copy token"
                                  aria-label={copied ? "Copied" : "Copy token"}
                                  className="size-9 min-h-[36px] shrink-0 sm:min-h-0"
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
                                    <ClipboardTextIcon className="size-4" aria-hidden />
                                  )}
                                </Button>
                              ) : null}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-[36px] shrink-0 text-[12px] sm:min-h-0"
                              onClick={() => onGenerateToken(c.public_id)}
                            >
                              {hasToken ? "Regenerate Token" : "Generate Token"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-[36px] shrink-0 text-[12px] sm:min-h-0"
                              disabled={!hasLocalToken || savingWebhookTokenId === c.public_id}
                              loading={savingWebhookTokenId === c.public_id}
                              onClick={() => void onSaveWebhookToken(c.public_id)}
                            >
                              Save
                            </Button>
                          </div>

                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Save this token somewhere safe. It will not be stored here.
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            This saves your token securely to Paperbase so incoming webhooks can be verified.
                          </p>
                          {hasStoredToken && !hasLocalToken ? (
                            <p className="text-[11px] text-muted-foreground">
                              A token is already saved for this courier, but it cannot be displayed here. Paste a new
                              one to replace it.
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[11px] text-muted-foreground">4</span>
                      <span className="text-[12px] font-medium text-foreground">Save in Steadfast portal</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Click Save in your Steadfast portal. Your dashboard will now receive live delivery status updates
                      automatically.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CourierIntegration({
  panelHidden = false,
}: {
  panelHidden?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tPages = useTranslations("pages");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const {
    data: couriers = [],
    isLoading: loading,
    isError: couriersIsError,
    error: couriersError,
  } = useCouriersQuery({ enabled: !panelHidden });

  useEffect(() => {
    if (!couriersIsError) return;
    notify.error(couriersError, {
      title: tPages("toastTitleCourierTestFailed"),
      fallbackMessage: tPages("toastDescCourierTestFailed"),
    });
  }, [couriersIsError, couriersError, tPages]);
  const [modal, setModal] = useState<CourierModal>(null);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [generatedTokenByCourierId, setGeneratedTokenByCourierId] = useState<Record<string, string>>(
    {},
  );
  const [tokenRevealedByCourierId, setTokenRevealedByCourierId] = useState<Record<string, boolean>>(
    {},
  );
  const [tokenFieldFocusedByCourierId, setTokenFieldFocusedByCourierId] = useState<
    Record<string, boolean>
  >({});
  const [tokenCopiedByCourierId, setTokenCopiedByCourierId] = useState<Record<string, boolean>>({});
  const [savingWebhookTokenId, setSavingWebhookTokenId] = useState<string | null>(null);
  const connectFormRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => connectFormRef.current?.requestSubmit());
  // Courier connect/edit/disconnect needs couriers.manage; view-only is read-only.
  const canManage = usePermissions().has("couriers.manage");

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
      notify.success(tPages("toastDescApiKeyCopied"), {
        title: tPages("toastTitleApiKeyCopied"),
      });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleClipboardBlocked"),
        fallbackMessage: tPages("toastDescClipboardBlocked"),
      });
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
      notify.success(tPages("toastDescWebhookSaved"), {
        title: tPages("toastTitleWebhookSaved"),
      });
      void queryClient.invalidateQueries({ queryKey: couriersQueryKey });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleCourierTestFailed"),
        fallbackMessage: tPages("toastDescCourierTestFailed"),
      });
    } finally {
      setSavingWebhookTokenId(null);
    }
  }

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
      void queryClient.invalidateQueries({ queryKey: couriersQueryKey });
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
          void queryClient.invalidateQueries({ queryKey: couriersQueryKey });
        } catch (err) {
          notify.error(err, {
            title: tPages("toastTitleCourierTestFailed"),
            fallbackMessage: tPages("toastDescCourierTestFailed"),
          });
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
      void queryClient.invalidateQueries({ queryKey: couriersQueryKey });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleCourierTestFailed"),
        fallbackMessage: tPages("toastDescCourierTestFailed"),
      });
    } finally {
      setTogglingId(null);
    }
  }

  const tStr = t as (key: string) => string;

  return (
    <fieldset disabled={!canManage} className="m-0 min-w-0 w-full border-0 p-0">
      <SettingsActionDialog
        open={modal === "connect"}
        onOpenChange={(next) => {
          if (!next) closeConnectModal();
        }}
        title={t("courier.modalConnectTitle")}
        description={t("courier.modalConnectDescription")}
      >
        <form
          ref={connectFormRef}
          onSubmit={handleConnect}
          className="space-y-3"
          autoComplete="off"
        >
          {error ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="courier_steadfast_api_key" className="text-sm font-medium text-foreground">
              {t("courier.apiKey")}
            </label>
            <Input
              id="courier_steadfast_api_key"
              name="courier_steadfast_api_key"
              type="text"
              required
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={t("courier.apiKeyPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="font-mono"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="courier_steadfast_secret_key" className="text-sm font-medium text-foreground">
              {t("courier.secretKey")}
            </label>
            <Input
              id="courier_steadfast_secret_key"
              name="courier_steadfast_secret_key"
              type="text"
              required
              value={form.secret_key}
              onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
              placeholder={t("courier.secretKeyPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="font-mono"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
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

      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {t("integrations.sectionDelivery")}
      </p>
      <div className="mb-6 flex min-w-0 w-full flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {loading ? null : couriers.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3 px-3.5 py-[11px]">
            <Truck className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">{t("courier.heading")}</p>
              <p className="text-[12px] text-muted-foreground">{t("courier.intro")}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{t("courier.empty")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                {t("integrations.statusNotConnected")}
              </span>
              {modal !== "connect" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[36px] text-[12px] sm:min-h-0"
                  onClick={() => setModal("connect")}
                >
                  {t("courier.connectCta")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {!loading && modal !== "connect" ? (
              <div className="flex flex-wrap items-center gap-3 px-3.5 py-[11px]">
                <Truck className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <p className="min-w-0 flex-1 text-[13px] font-medium text-foreground">{t("courier.addCourier")}</p>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] text-[12px] sm:min-h-0"
                    onClick={() => setModal("connect")}
                  >
                    {t("courier.addCourier")}
                  </Button>
                </div>
              </div>
            ) : null}
            {couriers.map((c) => (
              <SteadfastCourierRow
                key={c.public_id}
                c={c}
                locale={locale}
                t={tStr}
                togglingId={togglingId}
                savingWebhookTokenId={savingWebhookTokenId}
                generatedTokenByCourierId={generatedTokenByCourierId}
                setGeneratedTokenByCourierId={setGeneratedTokenByCourierId}
                tokenRevealedByCourierId={tokenRevealedByCourierId}
                setTokenRevealedByCourierId={setTokenRevealedByCourierId}
                tokenFieldFocusedByCourierId={tokenFieldFocusedByCourierId}
                setTokenFieldFocusedByCourierId={setTokenFieldFocusedByCourierId}
                tokenCopiedByCourierId={tokenCopiedByCourierId}
                setTokenCopiedByCourierId={setTokenCopiedByCourierId}
                copyToClipboard={copyToClipboard}
                onToggleActive={handleToggleActive}
                onDisconnect={requestDisconnect}
                onGenerateToken={handleGenerateToken}
                onSaveWebhookToken={handleSaveWebhookToken}
              />
            ))}
          </>
        )}
      </div>
    </fieldset>
  );
}
