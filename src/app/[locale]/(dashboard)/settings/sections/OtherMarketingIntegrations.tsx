"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Check } from "lucide-react";
import api from "@/lib/api";
import type { MarketingIntegration as MarketingIntegrationType } from "@/types";
import { useMarketingIntegrationsQuery } from "@/hooks/useMarketingIntegrationsQuery";
import { marketingIntegrationsQueryKey } from "@/lib/query-keys";
import { numberTextClass } from "@/lib/number-font";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { Button } from "@/components/ui/button";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import {
  MarketingIntegrationListRow,
  EventTogglesBlock,
  type EventSettingKey,
} from "./IntegrationListRow";

/**
 * Google Analytics and any other marketing providers not shown on the dedicated
 * Facebook / TikTok cards. Uses the same list row and configure flow as the legacy
 * all-in-one marketing list.
 */
export default function OtherMarketingIntegrations({
  panelHidden = false,
}: {
  panelHidden?: boolean;
}) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("settings");
  const tPages = useTranslations("pages");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const {
    data: allFetched = [],
    isLoading: loading,
    isError: integrationsIsError,
    error: integrationsError,
  } = useMarketingIntegrationsQuery({ enabled: !panelHidden });

  const list = useMemo(
    () =>
      allFetched.filter(
        (i) => i.provider !== "facebook" && i.provider !== "tiktok",
      ),
    [allFetched],
  );

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [eventSavingId, setEventSavingId] = useState<string | null>(null);
  const [configurePublicId, setConfigurePublicId] = useState<string | null>(null);
  const [pixelCopied, setPixelCopied] = useState(false);

  useEffect(() => {
    if (!integrationsIsError) return;
    notify.error(integrationsError, {
      title: tPages("toastTitleMarketingLinkFailed"),
      fallbackMessage: tPages("toastDescMarketingLinkFailed"),
    });
  }, [integrationsIsError, integrationsError, tPages]);

  useEffect(() => {
    if (configurePublicId) {
      const id = list.find((i) => i.public_id === configurePublicId);
      if (!id) setConfigurePublicId(null);
    }
  }, [list, configurePublicId]);

  useEffect(() => {
    if (!pixelCopied) return;
    const id = window.setTimeout(() => setPixelCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [pixelCopied]);

  const configureRow = configurePublicId
    ? list.find((i) => i.public_id === configurePublicId)
    : undefined;

  function requestDisconnect(publicId: string) {
    void confirm({
      title: t("marketing.modalDisconnectTitle"),
      message: t("marketing.modalDisconnectDescription"),
      variant: "danger",
      confirmText: t("marketing.disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(`admin/marketing-integrations/${publicId}/`);
          void queryClient.invalidateQueries({
            queryKey: marketingIntegrationsQueryKey,
          });
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

  async function handleToggleActive(integration: MarketingIntegrationType) {
    setTogglingId(integration.public_id);
    try {
      await api.patch(`admin/marketing-integrations/${integration.public_id}/`, {
        is_active: !integration.is_active,
      });
      void queryClient.invalidateQueries({ queryKey: marketingIntegrationsQueryKey });
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
    integration: MarketingIntegrationType,
    key: EventSettingKey,
    value: boolean
  ) {
    setEventSavingId(integration.public_id);
    try {
      await api.patch(`admin/marketing-integrations/${integration.public_id}/events/`, {
        [key]: value,
      });
      void queryClient.invalidateQueries({ queryKey: marketingIntegrationsQueryKey });
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

  const providerLabel = (provider: string) => {
    const map: Record<string, string> = {
      facebook: t("marketing.providerFacebook"),
      google_analytics: t("marketing.providerGoogle"),
      tiktok: t("marketing.providerTiktok"),
    };
    return map[provider] ?? provider;
  };

  if (loading) {
    return null;
  }

  if (list.length === 0) return null;

  return (
    <div className="min-w-0 w-full space-y-3">
      {list.map((integration) => (
        <MarketingIntegrationListRow
          key={integration.public_id}
          integration={integration}
          providerTitle={providerLabel(integration.provider)}
          pixelLineLabel={t("marketing.pixelLabel")}
          numClass={numClass}
          locale={locale}
          togglingId={togglingId}
          t={t as (key: string) => string}
          onConfigure={() => setConfigurePublicId(integration.public_id)}
          onToggleActive={() => void handleToggleActive(integration)}
          onDisconnect={() => requestDisconnect(integration.public_id)}
        />
      ))}

      <SettingsActionDialog
        open={!!configureRow && configureRow?.event_settings != null}
        onOpenChange={(next) => {
          if (!next) setConfigurePublicId(null);
        }}
        title={t("marketing.modalConfigureTitle")}
        description={t("marketing.modalConfigureDescription")}
      >
        {configureRow && configureRow.event_settings ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t("marketing.pixelLabel")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 break-all rounded-ui border border-border bg-muted/50 px-2 py-1 font-mono text-xs">
                  {configureRow.pixel_id || "—"}
                </code>
                {configureRow.pixel_id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => void copyPixelId(configureRow.pixel_id)}
                  >
                    {pixelCopied ? (
                      <>
                        <Check className="mr-1 size-3.5" />
                        {t("marketing.pixelCopied")}
                      </>
                    ) : (
                      <>
                        <ClipboardTextIcon className="mr-1 size-3.5" />
                        {t("marketing.copyPixel")}
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("marketing.tokenLabel")} </span>
              <code className="font-mono">{configureRow.access_token_masked || "—"}</code>
            </div>
            <EventTogglesBlock
              integration={
                configureRow as MarketingIntegrationType & {
                  event_settings: NonNullable<MarketingIntegrationType["event_settings"]>;
                }
              }
              eventSavingId={eventSavingId}
              onToggle={(key, value) => void handleEventToggle(configureRow, key, value)}
              t={t as (key: string) => string}
            />
          </div>
        ) : null}
      </SettingsActionDialog>
    </div>
  );
}
