"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDashboardDate } from "@/lib/datetime-display";
import type { MarketingIntegration as MarketingIntegrationType, IntegrationEventSettings } from "@/types";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";

export type EventSettingKey =
  | "track_purchase"
  | "track_initiate_checkout"
  | "track_add_to_cart"
  | "track_view_content";

export const EVENT_LABEL_KEYS: { key: EventSettingKey; labelKey: string }[] = [
  { key: "track_purchase", labelKey: "eventPurchase" },
  { key: "track_initiate_checkout", labelKey: "eventInitiateCheckout" },
  { key: "track_add_to_cart", labelKey: "eventAddToCart" },
  { key: "track_view_content", labelKey: "eventViewContent" },
];

/**
 * List row: provider title, status badge, pixel/token lines, action buttons.
 * pixelLineLabel: full label prefix, e.g. "Dataset ID:" or "TikTok Pixel Code:"
 */
export function MarketingIntegrationListRow({
  integration,
  providerTitle,
  pixelLineLabel,
  tokenLineLabel,
  testCodeLineLabel,
  numClass,
  locale,
  onConfigure,
  onToggleActive,
  onDisconnect,
  togglingId,
  t,
}: {
  integration: MarketingIntegrationType;
  providerTitle: string;
  pixelLineLabel: string;
  /** Defaults to `marketing.tokenLabel` */
  tokenLineLabel?: string;
  /** Defaults to `marketing.testCodeLabel` */
  testCodeLineLabel?: string;
  numClass: string;
  locale: string;
  onConfigure: () => void;
  onToggleActive: () => void;
  onDisconnect: () => void;
  togglingId: string | null;
  t: (key: string) => string;
}) {
  const tok = tokenLineLabel ?? t("marketing.tokenLabel");
  const testL = testCodeLineLabel ?? t("marketing.testCodeLabel");
  return (
    <div className="rounded-card border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{providerTitle}</span>
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
              {pixelLineLabel} <code className={numClass}>{integration.pixel_id || "---"}</code>
            </span>
            <span>
              {tok} <code className="font-mono">{integration.access_token_masked || "---"}</code>
            </span>
            {integration.test_event_code ? (
              <span>
                {testL} <code className={numClass}>{integration.test_event_code}</code>
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
              onClick={onConfigure}
            >
              {t("marketing.configureEvents")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className={settingsInvertedButtonClassName}
            disabled={togglingId === integration.public_id}
            loading={togglingId === integration.public_id}
            onClick={onToggleActive}
          >
            {integration.is_active ? t("marketing.deactivate") : t("marketing.activate")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDisconnect}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            {t("marketing.disconnect")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EventTogglesBlock({
  integration,
  onToggle,
  eventSavingId,
  t,
}: {
  integration: MarketingIntegrationType & { event_settings: IntegrationEventSettings };
  onToggle: (key: EventSettingKey, value: boolean) => void;
  eventSavingId: string | null;
  t: (key: string) => string;
}) {
  return (
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
              checked={integration.event_settings![key]}
              disabled={eventSavingId === integration.public_id}
              onChange={(e) => onToggle(key, e.target.checked)}
              className="form-checkbox size-3.5"
            />
            {t(`marketing.${labelKey}` as never)}
          </label>
        ))}
      </div>
    </div>
  );
}
