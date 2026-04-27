"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Save, Copy, Check } from "lucide-react";
import api from "@/lib/api";
import type {
  MarketingIntegration as MarketingIntegrationType,
  PaginatedResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { numberTextClass } from "@/lib/number-font";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";
import { SettingsSectionSkeleton } from "@/components/skeletons/dashboard-skeletons";
import SocialLinkGlyph from "./SocialLinkGlyph";
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

export default function MarketingProviderCard({ provider }: { provider: MarketingProvider }) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("settings");
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

  const integration: MarketingIntegrationType | undefined = allFetched?.find(
    (i) => i.provider === provider
  );

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
        console.error(err);
        notify.error(err);
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
        } catch (err) {
          console.error(err);
          notify.error(err);
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
      console.error(err);
      notify.error(err);
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

  const hasThisProvider = !!integration;
  const showOrphanedAdd = !loading && !integration && (allFetched?.length ?? 0) > 0;
  const showFullEmpty = !loading && !integration && (allFetched?.length ?? 0) === 0;

  const providerTitle =
    provider === "facebook" ? t("marketing.providerFacebook") : c("heading");

  const showHelper = provider === "tiktok";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {provider === "facebook" ? (
            <SocialLinkGlyph platform="facebook" />
          ) : (
            <SocialLinkGlyph platform="tiktok" />
          )}
          <h3 className="text-lg font-medium text-foreground">
            {provider === "facebook" ? t("marketing.heading") : c("heading")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {provider === "facebook" ? t("marketing.intro") : c("intro")}
        </p>
      </div>

      {showOrphanedAdd ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className={settingsInvertedButtonClassName}
            onClick={() => {
              setForm(empty(provider));
              setModal("connect");
            }}
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
        title={provider === "facebook" ? t("marketing.modalConnectTitle") : c("modalConnectTitle")}
        description={
          provider === "facebook"
            ? t("marketing.modalConnectDescription")
            : c("modalConnectDescription")
        }
      >
        <form onSubmit={handleConnect} className="space-y-3">
          {error ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}
          {!hasThisProvider ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {c("pixelId")}
                </label>
                <Input
                  required
                  value={form.pixel_id}
                  onChange={(e) => setForm({ ...form, pixel_id: e.target.value, provider })}
                  placeholder={c("pixelPlaceholder")}
                />
                {showHelper ? (
                  <p className="text-xs text-muted-foreground">{c("pixelHelper")}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {c("accessToken")}
                </label>
                <Input
                  type="password"
                  required
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value, provider })}
                  placeholder={c("accessTokenPlaceholder")}
                  autoComplete="off"
                />
                {showHelper ? (
                  <p className="text-xs text-muted-foreground">{c("accessTokenHelper")}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  {c("testEventCode")}{" "}
                  <span className="font-normal text-muted-foreground">{t("optionalTag")}</span>
                </label>
                <Input
                  value={form.test_event_code}
                  onChange={(e) => setForm({ ...form, test_event_code: e.target.value, provider })}
                  placeholder={c("testEventPlaceholder")}
                />
                {showHelper ? (
                  <p className="text-xs text-muted-foreground">{c("testEventHelper")}</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{c("alreadyConnected")}</p>
          )}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {!hasThisProvider ? (
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
                        <Copy className="mr-1 size-3.5" />
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

      {loading ? (
        <SettingsSectionSkeleton />
      ) : showFullEmpty ? (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-sm text-muted-foreground">
            {provider === "facebook" ? t("marketing.empty") : c("empty")}
          </p>
          {modal !== "connect" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => {
                  setForm(empty(provider));
                  setModal("connect");
                }}
              >
                {provider === "facebook" ? t("marketing.connectCta") : c("connectCta")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : integration ? (
        <div className="space-y-4">
          <MarketingIntegrationListRow
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
        </div>
      ) : null}
    </div>
  );
}
