"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { maskCredentialPreview } from "@/lib/mask-credential-preview";
import { formatDashboardDate } from "@/lib/datetime-display";
import type { MarketingIntegration as MarketingIntegrationType, IntegrationEventSettings } from "@/types";

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

function fieldLabel(raw: string) {
  return raw.replace(/:\s*$/, "").trim();
}

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
  const [open, setOpen] = useState(false);
  const tok = tokenLineLabel ?? t("marketing.tokenLabel");
  const testL = testCodeLineLabel ?? t("marketing.testCodeLabel");
  const maskedPixel = maskCredentialPreview(integration.pixel_id);
  const titleLine = maskedPixel ? `${providerTitle} · ${maskedPixel}` : providerTitle;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-[11px] text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 text-[13px] font-medium text-foreground">{titleLine}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              integration.is_active ? "bg-green-500" : "bg-muted-foreground",
            )}
            aria-hidden
          />
          {integration.is_active ? t("integrations.statusConnected") : t("inactive")}
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
              <span className="mb-0.5 block text-[11px] text-muted-foreground">
                {fieldLabel(pixelLineLabel)}
              </span>
              <span className={cn("text-[12px] font-mono text-muted-foreground", numClass)}>
                {integration.pixel_id || "—"}
              </span>
            </div>
            <div>
              <span className="mb-0.5 block text-[11px] text-muted-foreground">{fieldLabel(tok)}</span>
              <span className="font-mono text-[12px] text-muted-foreground">
                {integration.access_token_masked || "—"}
              </span>
            </div>
            {integration.test_event_code ? (
              <div>
                <span className="mb-0.5 block text-[11px] text-muted-foreground">{fieldLabel(testL)}</span>
                <span className={cn("text-[12px] font-mono text-muted-foreground", numClass)}>
                  {integration.test_event_code}
                </span>
              </div>
            ) : null}
            <div>
              <span className="mb-0.5 block text-[11px] text-muted-foreground">
                {t("marketing.connectedOn")}
              </span>
              <span className="font-mono text-[12px] text-muted-foreground">
                {formatDashboardDate(integration.created_at, locale)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
            {integration.event_settings ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[36px] text-[12px] sm:min-h-0"
                onClick={onConfigure}
              >
                {t("marketing.configureEvents")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[36px] text-[12px] sm:min-h-0"
              disabled={togglingId === integration.public_id}
              loading={togglingId === integration.public_id}
              onClick={onToggleActive}
            >
              {integration.is_active ? t("marketing.deactivate") : t("marketing.activate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[36px] border-none text-[12px] text-destructive hover:bg-destructive/10 sm:min-h-0"
              onClick={onDisconnect}
            >
              {t("marketing.disconnect")}
            </Button>
          </div>
        </div>
      ) : null}
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
