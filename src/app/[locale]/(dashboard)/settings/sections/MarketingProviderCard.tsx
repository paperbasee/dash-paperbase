"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ClipboardTextIcon,
  MetaLogoIcon,
  TiktokLogoIcon,
} from "@phosphor-icons/react";
import { Check } from "lucide-react";
import api from "@/lib/api";
import type {
  MarketingIntegration as MarketingIntegrationType,
  PaginatedResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { numberTextClass } from "@/lib/number-font";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";
import {
  MarketingIntegrationListRow,
  EventTogglesBlock,
  type EventSettingKey,
} from "./IntegrationListRow";

type MarketingProvider = "facebook" | "tiktok";

type ConnectForm = {
  provider: string;
  pixel_id: string;
  access_token: string;
  test_event_code: string;
};

const empty = (p: MarketingProvider): ConnectForm => ({
  provider: p,
  pixel_id: "",
  access_token: "",
  test_event_code: "",
});

type MarketingModal =
  | null
  | "connect"
  | { type: "configure"; publicId: string };

export default function MarketingProviderCard({
  provider,
  panelHidden = false,
}: {
  provider: MarketingProvider;
  panelHidden?: boolean;
}) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("settings");
  const tPages = useTranslations("pages");
  const confirm = useConfirm();

  const c = useCallback(
    (key: string) =>
      provider === "facebook"
        ? (t as (k: string) => string)(`marketing.${key}`)
        : (t as (k: string) => string)(`marketing.tiktok.${key}`),
    [provider, t]
  );

  const [allFetched, setAllFetched] = useState<MarketingIntegrationType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MarketingModal>(null);
  const [form, setForm] = useState<ConnectForm>(empty(provider));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [eventSavingId, setEventSavingId] = useState<string | null>(null);
  const [pixelCopied, setPixelCopied] = useState(false);
  const connectFormRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => connectFormRef.current?.requestSubmit());

  const providerIntegrations = (allFetched ?? []).filter((i) => i.provider === provider);
  const canAddPixel = providerIntegrations.length < 3;

  const fetchIntegrations = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<MarketingIntegrationType> | MarketingIntegrationType[]>(
        "admin/marketing-integrations/"
      )
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setAllFetched(list ?? []);
      })
      .catch((err) => {
        notify.error(err, {
          title: tPages("toastTitleMarketingLinkFailed"),
          fallbackMessage: tPages("toastDescMarketingLinkFailed"),
        });
        setAllFetched(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    if (modal === null || modal === "connect" || modal.type !== "configure") return;
    const found = allFetched?.find(
      (i) => i.public_id === modal.publicId && i.provider === provider
    );
    if (!found) setModal(null);
  }, [modal, allFetched, provider]);

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

  const configureIntegration: MarketingIntegrationType | undefined =
    modal !== null && modal !== "connect" && modal.type === "configure"
      ? allFetched?.find(
          (i) => i.public_id === modal.publicId && i.provider === provider
        )
      : undefined;

  function closeConnectModal() {
    setModal(null);
    setForm(empty(provider));
    setError("");
    setSaving(false);
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body: ConnectForm = { ...form, provider };
      await api.post("admin/marketing-integrations/", body);
      closeConnectModal();
      fetchIntegrations();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg =
        (data?.detail as string) ??
        Object.values(data ?? {})
          .flat()
          .join(" ") ??
        c("connectFailed");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function requestDisconnect(publicId: string) {
    void confirm({
      title: c("modalDisconnectTitle"),
      message: c("modalDisconnectDescription"),
      variant: "danger",
      confirmText: t("marketing.disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(`admin/marketing-integrations/${publicId}/`);
          fetchIntegrations();
          notify.success(tPages("toastDescIntegrationDisconnected"), {
            title: tPages("toastTitleIntegrationDisconnected"),
          });
        } catch (err) {
          notify.error(err, {
            title: tPages("toastTitleMarketingLinkFailed"),
            fallbackMessage: tPages("toastDescMarketingLinkFailed"),
          });
          throw err;
        }
      },
    });
  }

  async function handleToggleActive(row: MarketingIntegrationType) {
    if (row.provider !== provider) return;
    setTogglingId(row.public_id);
    try {
      await api.patch(`admin/marketing-integrations/${row.public_id}/`, {
        is_active: !row.is_active,
      });
      fetchIntegrations();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleMarketingLinkFailed"),
        fallbackMessage: tPages("toastDescMarketingLinkFailed"),
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleEventToggle(
    row: MarketingIntegrationType,
    key: EventSettingKey,
    value: boolean
  ) {
    if (row.provider !== provider) return;
    setEventSavingId(row.public_id);
    try {
      await api.patch(`admin/marketing-integrations/${row.public_id}/events/`, {
        [key]: value,
      });
      fetchIntegrations();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleMarketingLinkFailed"),
        fallbackMessage: tPages("toastDescMarketingLinkFailed"),
      });
    } finally {
      setEventSavingId(null);
    }
  }

  async function copyPixelId(pixelId: string) {
    try {
      await navigator.clipboard.writeText(pixelId);
      setPixelCopied(true);
    } catch {
      notify.error(new Error("clipboard_blocked"), {
        title: tPages("toastTitleClipboardBlocked"),
        fallbackMessage: tPages("toastDescClipboardBlocked"),
      });
    }
  }

  const showFullEmpty = !loading && providerIntegrations.length === 0;

  const providerTitle =
    provider === "facebook" ? t("marketing.providerFacebook") : c("heading");

  const providerIcon =
    provider === "facebook" ? (
      <MetaLogoIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
    ) : (
      <TiktokLogoIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
    );

  return (
    <div className="min-w-0 w-full">
      <SettingsActionDialog
        open={modal === "connect"}
        onOpenChange={(next) => {
          if (!next) closeConnectModal();
        }}
        title={provider === "facebook" ? t("marketing.modalConnectTitle") : c("modalConnectTitle")}
        description={
          provider === "facebook"
            ? t("marketing.modalConnectDescription")
            : c("modalConnectDescription")
        }
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
          {canAddPixel ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`marketing-pixel-id-${provider}`}
                  className="text-sm font-medium text-foreground"
                >
                  {c("pixelId")}
                </label>
                <Input
                  required
                  name={`marketing_pixel_id_${provider}`}
                  id={`marketing-pixel-id-${provider}`}
                  value={form.pixel_id}
                  onChange={(e) => setForm({ ...form, pixel_id: e.target.value, provider })}
                  placeholder={c("pixelPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`marketing-access-token-${provider}`}
                  className="text-sm font-medium text-foreground"
                >
                  {c("accessToken")}
                </label>
                <Input
                  type="text"
                  required
                  name={`marketing_access_token_${provider}`}
                  id={`marketing-access-token-${provider}`}
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value, provider })}
                  placeholder={c("accessTokenPlaceholder")}
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
                <label
                  htmlFor={`marketing-test-event-${provider}`}
                  className="text-sm font-medium text-foreground"
                >
                  {c("testEventCode")}{" "}
                  <span className="font-normal text-muted-foreground">{t("optionalTag")}</span>
                </label>
                <Input
                  name={`marketing_test_event_code_${provider}`}
                  id={`marketing-test-event-${provider}`}
                  value={form.test_event_code}
                  onChange={(e) => setForm({ ...form, test_event_code: e.target.value, provider })}
                  placeholder={c("testEventPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore
                  onKeyDown={handleKeyDown}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Maximum 3 integrations allowed per provider.
            </p>
          )}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {canAddPixel ? (
              <Button
                type="submit"
                variant="outline"
                className={settingsInvertedButtonClassName}
                disabled={saving}
                loading={saving}
              >
                Add Pixel
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
        title={provider === "facebook" ? t("marketing.modalConfigureTitle") : c("modalConfigureTitle")}
        description={
          provider === "facebook"
            ? t("marketing.modalConfigureDescription")
            : c("modalConfigureDescription")
        }
      >
        {configureIntegration ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {c("pixelLabel")}
              </p>
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
                        <ClipboardTextIcon className="mr-1 size-3.5" />
                        {provider === "facebook" ? t("marketing.copyPixel") : c("copyPixel")}
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {provider === "facebook" ? t("marketing.tokenLabel") : c("tokenLabel")}{" "}
              </span>
              <code className="font-mono">
                {configureIntegration.access_token_masked || "—"}
              </code>
            </div>
            {configureIntegration.event_settings ? (
              <EventTogglesBlock
                integration={
                  configureIntegration as MarketingIntegrationType & {
                    event_settings: NonNullable<MarketingIntegrationType["event_settings"]>;
                  }
                }
                eventSavingId={eventSavingId}
                onToggle={(key, value) => handleEventToggle(configureIntegration, key, value)}
                t={t as (key: string) => string}
              />
            ) : null}
          </div>
        ) : null}
      </SettingsActionDialog>

      <div className="flex min-w-0 w-full flex-col divide-y divide-border">
        {loading ? null : showFullEmpty ? (
          <div className="flex flex-wrap items-center gap-3 px-3.5 py-[11px]">
            {providerIcon}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">
                {provider === "facebook" ? t("marketing.heading") : c("heading")}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {provider === "facebook" ? t("marketing.intro") : c("intro")}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {provider === "facebook" ? t("marketing.empty") : c("empty")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                {t("integrations.statusNotConnected")}
              </span>
              {modal !== "connect" && canAddPixel ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[36px] text-[12px] sm:min-h-0"
                  onClick={() => {
                    setForm(empty(provider));
                    setModal("connect");
                  }}
                >
                  {provider === "facebook" ? t("marketing.connectCta") : c("connectCta")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : providerIntegrations.length > 0 ? (
          <>
            {!loading && providerIntegrations.length > 0 && canAddPixel ? (
              <div className="flex flex-wrap items-center gap-3 px-3.5 py-[11px]">
                {providerIcon}
                <p className="min-w-0 flex-1 text-[13px] font-medium text-foreground">
                  {provider === "facebook" ? t("marketing.addFacebookPixel") : c("addTiktokPixel")}
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] text-[12px] sm:min-h-0"
                    onClick={() => {
                      setForm(empty(provider));
                      setModal("connect");
                    }}
                  >
                    {provider === "facebook" ? t("marketing.addFacebookPixel") : c("addTiktokPixel")}
                  </Button>
                </div>
              </div>
            ) : null}
            {providerIntegrations.map((integration) => (
              <MarketingIntegrationListRow
                key={integration.public_id}
                integration={integration}
                providerTitle={providerTitle}
                pixelLineLabel={provider === "facebook" ? t("marketing.pixelLabel") : c("pixelLabel")}
                tokenLineLabel={provider === "tiktok" ? c("tokenLabel") : undefined}
                testCodeLineLabel={provider === "tiktok" ? c("testCodeLabel") : undefined}
                numClass={numClass}
                locale={locale}
                togglingId={togglingId}
                t={t as (key: string) => string}
                onConfigure={() => setModal({ type: "configure", publicId: integration.public_id })}
                onToggleActive={() => void handleToggleActive(integration)}
                onDisconnect={() => requestDisconnect(integration.public_id)}
              />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
