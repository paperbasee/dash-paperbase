"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plug, Save, Copy, Check } from "lucide-react";
import api from "@/lib/api";
import type {
  MarketingIntegration as MarketingIntegrationType,
  IntegrationEventSettings,
  PaginatedResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDashboardDate } from "@/lib/datetime-display";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";

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

type EventSettingKey =
  | "track_purchase"
  | "track_initiate_checkout"
  | "track_add_to_cart"
  | "track_view_content";

const EVENT_LABEL_KEYS: { key: EventSettingKey; labelKey: string }[] = [
  { key: "track_purchase", labelKey: "eventPurchase" },
  { key: "track_initiate_checkout", labelKey: "eventInitiateCheckout" },
  { key: "track_add_to_cart", labelKey: "eventAddToCart" },
  { key: "track_view_content", labelKey: "eventViewContent" },
];

type MarketingModal =
  | null
  | "connect"
  | { type: "configure"; publicId: string };

export default function MarketingIntegration() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("settings");
  const confirm = useConfirm();
  const [integrations, setIntegrations] = useState<MarketingIntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MarketingModal>(null);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [eventSavingId, setEventSavingId] = useState<string | null>(null);
  const [pixelCopied, setPixelCopied] = useState(false);

  const fetchIntegrations = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<MarketingIntegrationType> | MarketingIntegrationType[]>(
        "admin/marketing-integrations/"
      )
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setIntegrations(list ?? []);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    if (modal === null || modal === "connect" || modal.type !== "configure") return;
    const found = integrations.find((i) => i.public_id === modal.publicId);
    if (!found) setModal(null);
  }, [modal, integrations]);

  useEffect(() => {
    if (modal === null || modal === "connect" || modal.type !== "configure") {
      setPixelCopied(false);
    }
  }, [modal]);

  useEffect(() => {
    if (!pixelCopied) return;
    const id = window.setTimeout(() => setPixelCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [pixelCopied]);

  const configureIntegration =
    modal !== null && modal !== "connect" && modal.type === "configure"
      ? integrations.find((i) => i.public_id === modal.publicId)
      : undefined;

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
    try {
      await api.post("admin/marketing-integrations/", form);
      closeConnectModal();
      fetchIntegrations();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg =
        (data?.detail as string) ??
        Object.values(data ?? {})
          .flat()
          .join(" ") ??
        t("marketing.connectFailed");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function requestDisconnect(publicId: string) {
    void confirm({
      title: t("marketing.modalDisconnectTitle"),
      message: t("marketing.modalDisconnectDescription"),
      variant: "danger",
      confirmText: t("marketing.disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(`admin/marketing-integrations/${publicId}/`);
          fetchIntegrations();
        } catch (err) {
          console.error(err);
          notify.error(err);
          throw err;
        }
      },
    });
  }

  async function handleToggleActive(integration: MarketingIntegrationType) {
    setTogglingId(integration.public_id);
    try {
      await api.patch(`admin/marketing-integrations/${integration.public_id}/`, {
        is_active: !integration.is_active,
      });
      fetchIntegrations();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleEventToggle(
    integration: MarketingIntegrationType,
    key: EventSettingKey,
    value: boolean
  ) {
    setEventSavingId(integration.public_id);
    try {
      await api.patch(`admin/marketing-integrations/${integration.public_id}/events/`, {
        [key]: value,
      });
      fetchIntegrations();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setEventSavingId(null);
    }
  }

  async function copyPixelId(pixelId: string) {
    try {
      await navigator.clipboard.writeText(pixelId);
      setPixelCopied(true);
    } catch {
      notify.error(t("marketing.copyFailed"));
    }
  }

  const providerLabel = (provider: string) => {
    const map: Record<string, string> = {
      facebook: t("marketing.providerFacebook"),
      google_analytics: t("marketing.providerGoogle"),
      tiktok: t("marketing.providerTiktok"),
    };
    return map[provider] ?? provider;
  };

  const hasFacebook = integrations.some((i) => i.provider === "facebook");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-medium text-foreground">{t("marketing.heading")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("marketing.intro")}</p>
      </div>

      {!loading && modal !== "connect" && integrations.length > 0 ? (
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
        title={t("marketing.modalConnectTitle")}
        description={t("marketing.modalConnectDescription")}
      >
        <form onSubmit={handleConnect} className="space-y-3">
          {error ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}
          {!hasFacebook ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">{t("marketing.pixelId")}</label>
                <Input
                  required
                  value={form.pixel_id}
                  onChange={(e) => setForm({ ...form, pixel_id: e.target.value })}
                  placeholder={t("marketing.pixelPlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">{t("marketing.accessToken")}</label>
                <Input
                  type="password"
                  required
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  placeholder={t("marketing.accessTokenPlaceholder")}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t("marketing.testEventCode")}{" "}
                  <span className="font-normal text-muted-foreground">{t("optionalTag")}</span>
                </label>
                <Input
                  value={form.test_event_code}
                  onChange={(e) => setForm({ ...form, test_event_code: e.target.value })}
                  placeholder={t("marketing.testEventPlaceholder")}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("marketing.alreadyConnected")}</p>
          )}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {!hasFacebook ? (
              <Button
                type="submit"
                variant="outline"
                className={settingsInvertedButtonClassName}
                disabled={saving}
              >
                <Save className="mr-1 size-3.5" />
                {saving ? t("marketing.connecting") : t("marketing.connect")}
              </Button>
            ) : null}
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

      <SettingsActionDialog
        open={
          modal !== null &&
          modal !== "connect" &&
          modal.type === "configure" &&
          !!configureIntegration
        }
        onOpenChange={(next) => {
          if (!next) setModal(null);
        }}
        title={t("marketing.modalConfigureTitle")}
        description={t("marketing.modalConfigureDescription")}
      >
        {configureIntegration ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("marketing.pixelLabel")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 break-all rounded-ui border border-border bg-muted/50 px-2 py-1 font-mono text-xs">
                  {configureIntegration.pixel_id || "—"}
                </code>
                {configureIntegration.pixel_id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => void copyPixelId(configureIntegration.pixel_id)}
                  >
                    {pixelCopied ? (
                      <>
                        <Check className="mr-1 size-3.5" />
                        {t("marketing.pixelCopied")}
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3.5" />
                        {t("marketing.copyPixel")}
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("marketing.tokenLabel")} </span>
              <code className="font-mono">{configureIntegration.access_token_masked || "—"}</code>
            </div>
            {configureIntegration.event_settings ? (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-foreground">{t("marketing.eventTracking")}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
                  {EVENT_LABEL_KEYS.map(({ key, labelKey }) => (
                    <label
                      key={key}
                      className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={configureIntegration.event_settings![key]}
                        disabled={eventSavingId === configureIntegration.public_id}
                        onChange={(e) =>
                          handleEventToggle(configureIntegration, key, e.target.checked)
                        }
                        className="form-checkbox size-3.5"
                      />
                      {t(`marketing.${labelKey}` as never)}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SettingsActionDialog>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : integrations.length === 0 ? (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-sm text-muted-foreground">{t("marketing.empty")}</p>
          {modal !== "connect" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => setModal("connect")}
              >
                {t("marketing.connectCta")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.public_id}
              className="rounded-card border border-border bg-background p-4"
            >
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
                      {integration.is_active ? t("active") : t("inactive")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {t("marketing.pixelLabel")}{" "}
                      <code className={numClass}>{integration.pixel_id || "---"}</code>
                    </span>
                    <span>
                      {t("marketing.tokenLabel")}{" "}
                      <code className="font-mono">{integration.access_token_masked || "---"}</code>
                    </span>
                    {integration.test_event_code ? (
                      <span>
                        {t("marketing.testCodeLabel")}{" "}
                        <code className={numClass}>{integration.test_event_code}</code>
                      </span>
                    ) : null}
                    <span>
                      {t("marketing.connectedOn")} {formatDashboardDate(integration.created_at, locale)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {integration.event_settings ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={settingsInvertedButtonClassName}
                      onClick={() => setModal({ type: "configure", publicId: integration.public_id })}
                    >
                      {t("marketing.configureEvents")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className={settingsInvertedButtonClassName}
                    disabled={togglingId === integration.public_id}
                    onClick={() => handleToggleActive(integration)}
                  >
                    {togglingId === integration.public_id
                      ? t("marketing.ellipsis")
                      : integration.is_active
                        ? t("marketing.deactivate")
                        : t("marketing.activate")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => requestDisconnect(integration.public_id)}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    {t("marketing.disconnect")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
