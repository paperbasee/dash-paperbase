"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Check, Plus } from "lucide-react";
import api from "@/lib/api";
import type { IntegrationEventSettings, MarketingIntegration } from "@/types";
import { useMarketingIntegrationsQuery } from "@/hooks/useMarketingIntegrationsQuery";
import { marketingIntegrationsQueryKey } from "@/lib/query-keys";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import { maskCredentialPreview } from "@/lib/mask-credential-preview";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import {
  MAX_PIXELS_PER_SERVICE,
  marketingIntegrationPath,
  pixelsLeft,
  serviceState,
  setServiceActive,
  type PixelService,
} from "@/lib/integrations/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { usePermissions } from "@/context/PermissionsContext";
import { notify } from "@/notifications";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../../SettingsSectionBody";
import { ConnectionRow, ServiceCard } from "./ServiceCard";

type EventKey = keyof IntegrationEventSettings;

/** The four per-pixel event switches, in the order the dashboard has always shown them. */
const EVENT_KEYS: { key: EventKey; label: string }[] = [
  { key: "track_purchase", label: "eventPurchase" },
  { key: "track_initiate_checkout", label: "eventInitiateCheckout" },
  { key: "track_add_to_cart", label: "eventAddToCart" },
  { key: "track_view_content", label: "eventViewContent" },
];

type PixelForm = { pixel_id: string; access_token: string; test_event_code: string };
const emptyForm: PixelForm = { pixel_id: "", access_token: "", test_event_code: "" };

type Dialog = null | { kind: "connect" } | { kind: "edit"; id: string } | { kind: "events"; id: string };

const inputGuards = {
  autoComplete: "off",
  spellCheck: false,
  autoCapitalize: "off",
  autoCorrect: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
} as const;

/**
 * Meta or TikTok: one card for the service, every pixel inside it
 * (owner, 2026-09-25). The card's switch is the whole service; each pixel keeps
 * its own switch, its event switches, its details and Disconnect.
 */
export default function PixelServiceCard({
  provider,
  expanded,
  onToggleExpanded,
  panelHidden,
}: {
  provider: PixelService;
  expanded: boolean;
  onToggleExpanded: () => void;
  panelHidden: boolean;
}) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("settings");
  const tI = useTranslations("settings.integrations");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canManage = usePermissions().has("integrations.manage");
  const { data: all = [], isLoading } = useMarketingIntegrationsQuery({ enabled: !panelHidden });
  const pixels = all.filter((one) => one.provider === provider);
  const state = serviceState(pixels);
  const service = tI(`services.${provider}`);
  // The forms' own words differ by platform (Dataset ID vs Pixel Code).
  const words = (key: string) =>
    (t as (k: string) => string)(provider === "facebook" ? `marketing.${key}` : `marketing.tiktok.${key}`);
  const idLabel = words("pixelLabel").replace(/:\s*$/, "");

  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<PixelForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [switchingAll, setSwitchingAll] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [eventSavingId, setEventSavingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

  const dialogPixel =
    dialog && dialog.kind !== "connect" ? pixels.find((one) => one.public_id === dialog.id) : undefined;

  // A pixel disconnected elsewhere closes its dialog rather than leaving it empty.
  useEffect(() => {
    if (dialog && dialog.kind !== "connect" && !dialogPixel) setDialog(null);
  }, [dialog, dialogPixel]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: marketingIntegrationsQueryKey });
  const saveFailed = (error: unknown) =>
    notify.error(error, {
      title: tI("saveFailedTitle"),
      fallbackMessage: tI("saveFailedBody", { service }),
    });

  function closeDialog() {
    setDialog(null);
    setForm(emptyForm);
    setFormError("");
    setSaving(false);
  }

  function openConnect() {
    setForm(emptyForm);
    setFormError("");
    setDialog({ kind: "connect" });
  }

  function openEdit(pixel: MarketingIntegration) {
    setForm({ pixel_id: pixel.pixel_id, access_token: "", test_event_code: pixel.test_event_code });
    setFormError("");
    setDialog({ kind: "edit", id: pixel.public_id });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fallback = dialog?.kind === "edit" ? tI("saveFailedBody", { service }) : words("connectFailed");
    setFormError("");
    setSaving(true);
    try {
      if (dialog?.kind === "edit" && dialogPixel) {
        // Only what changed; an empty token keeps the saved one.
        const body: Partial<PixelForm> = {};
        if (form.pixel_id.trim() !== dialogPixel.pixel_id) body.pixel_id = form.pixel_id.trim();
        if (form.access_token.trim()) body.access_token = form.access_token.trim();
        if (form.test_event_code.trim() !== dialogPixel.test_event_code) {
          body.test_event_code = form.test_event_code.trim();
        }
        if (Object.keys(body).length) await api.patch(marketingIntegrationPath(dialogPixel.public_id), body);
      } else {
        await api.post("admin/marketing-integrations/", {
          provider,
          pixel_id: form.pixel_id.trim(),
          access_token: form.access_token.trim(),
          test_event_code: form.test_event_code.trim(),
        });
      }
      closeDialog();
      void refresh();
    } catch (err) {
      setFormError(formatAdminApiErrorFromAxios(err, fallback));
    } finally {
      setSaving(false);
    }
  }

  async function switchAll(turnOn: boolean) {
    setSwitchingAll(true);
    try {
      const { failed, errors } = await setServiceActive(api, marketingIntegrationPath, pixels, turnOn);
      if (failed.length) {
        notify.error(errors[0], {
          title: tI("saveFailedTitle"),
          fallbackMessage: tI("someNotChanged", { failed: failed.length, service }),
        });
      }
    } finally {
      await refresh();
      setSwitchingAll(false);
    }
  }

  function onCardSwitch(turnOn: boolean) {
    if (!turnOn) {
      void confirm({
        title: tI("offTitle", { service }),
        message: tI("offPixels", { count: state.count, service }),
        variant: "danger",
        confirmText: tI("offConfirm"),
        cancelText: tI("keepOn"),
        onConfirm: () => switchAll(false),
      });
    } else if (state.count > 1) {
      void confirm({
        title: tI("onPixelsTitle", { count: state.count, service }),
        message: tI("onPixelsBody", { service }),
        confirmText: tI("onConfirm"),
        onConfirm: () => switchAll(true),
      });
    } else {
      void switchAll(true);
    }
  }

  async function switchOne(pixel: MarketingIntegration, turnOn: boolean) {
    setSwitchingId(pixel.public_id);
    try {
      await api.patch(marketingIntegrationPath(pixel.public_id), { is_active: turnOn });
      await refresh();
    } catch (err) {
      saveFailed(err);
    } finally {
      setSwitchingId(null);
    }
  }

  async function switchEvent(pixel: MarketingIntegration, key: EventKey, value: boolean) {
    setEventSavingId(pixel.public_id);
    try {
      await api.patch(`${marketingIntegrationPath(pixel.public_id)}events/`, { [key]: value });
      await refresh();
    } catch (err) {
      saveFailed(err);
    } finally {
      setEventSavingId(null);
    }
  }

  function disconnect(pixel: MarketingIntegration) {
    void confirm({
      title: words("modalDisconnectTitle"),
      message: words("modalDisconnectDescription"),
      variant: "danger",
      confirmText: tI("disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(marketingIntegrationPath(pixel.public_id));
          void refresh();
          notify.success(tI("disconnectedBody", { service }), { title: tI("disconnectedTitle") });
        } catch (err) {
          saveFailed(err);
          throw err;
        }
      },
    });
  }

  async function copyId(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (err) {
      notify.error(err, { title: tI("copyBlockedTitle"), fallbackMessage: tI("copyBlockedBody") });
    }
  }

  const status = isLoading
    ? tI("checking")
    : state.shape === "none"
      ? tI("statusNotConnected")
      : state.shape === "all_on"
        ? tI("pixelsOn", { count: state.count })
        : state.shape === "all_off"
          ? tI("pixelsOff", { count: state.count })
          : tI("pixelsSome", { active: state.active, count: state.count });

  const control = isLoading ? null : state.count === 0 ? (
    canManage ? (
      <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={openConnect}>
        {tI("connect")}
      </Button>
    ) : null
  ) : (
    <Switch
      checked={state.on}
      onCheckedChange={onCardSwitch}
      disabled={!canManage || switchingAll}
      aria-label={tI("serviceSwitchLabel", { service })}
    />
  );

  const left = pixelsLeft(pixels);
  const formOpen = dialog?.kind === "connect" || (dialog?.kind === "edit" && !!dialogPixel);
  const editing = dialog?.kind === "edit";

  return (
    <>
      <ServiceCard
        service={provider}
        name={service}
        status={status}
        tone={state.on ? "on" : state.count ? "off" : "none"}
        control={control}
        expanded={expanded}
        onToggleExpanded={state.count ? onToggleExpanded : undefined}
      >
        {pixels.map((pixel) => (
          <ConnectionRow
            key={pixel.public_id}
            title={
              <>
                {idLabel} <span className={cn("font-mono", numClass)}>{maskCredentialPreview(pixel.pixel_id)}</span>
              </>
            }
            detail={[
              tI("connectedOn", { date: formatDashboardDate(pixel.created_at, locale) }),
              pixel.test_event_code ? tI("testCodeSet") : null,
              pixel.is_active ? null : tI("connectionOff"),
            ]
              .filter(Boolean)
              .join(" · ")}
            active={pixel.is_active}
            switchLabel={tI("connectionSwitchLabel", { name: `${idLabel} ${maskCredentialPreview(pixel.pixel_id)}` })}
            canManage={canManage}
            switching={switchingId === pixel.public_id || switchingAll}
            onSwitch={(next) => void switchOne(pixel, next)}
            actions={
              <>
                {pixel.event_settings ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[12px]"
                    onClick={() => setDialog({ kind: "events", id: pixel.public_id })}
                  >
                    {tI("events")}
                  </Button>
                ) : null}
                {canManage ? (
                  <>
                    <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => openEdit(pixel)}>
                      {tI("edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[12px] text-destructive hover:bg-destructive/10"
                      onClick={() => disconnect(pixel)}
                    >
                      {tI("disconnect")}
                    </Button>
                  </>
                ) : null}
              </>
            }
          />
        ))}
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-3.5 py-2.5">
          {canManage && left > 0 ? (
            <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={openConnect}>
              <Plus className="size-3.5" aria-hidden />
              {tI("addPixel")}
            </Button>
          ) : null}
          <p className="text-[12px] text-muted-foreground">
            {!canManage
              ? tI("viewOnly")
              : left > 0
                ? tI("pixelsLeft", { left })
                : tI("pixelsFull", { max: MAX_PIXELS_PER_SERVICE })}
          </p>
        </div>
      </ServiceCard>

      <SettingsActionDialog
        open={formOpen}
        onOpenChange={(next) => {
          if (!next) closeDialog();
        }}
        title={editing ? tI("editTitle", { service }) : words("modalConnectTitle")}
        description={editing ? tI("editDescription") : words("modalConnectDescription")}
      >
        <form ref={formRef} onSubmit={submit} className="space-y-3" autoComplete="off">
          {formError ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pixel-id-${provider}`} className="text-sm font-medium text-foreground">
              {words("pixelId")}
            </label>
            <Input
              required
              id={`pixel-id-${provider}`}
              name={`pixel_id_${provider}`}
              value={form.pixel_id}
              onChange={(e) => setForm({ ...form, pixel_id: e.target.value })}
              placeholder={words("pixelPlaceholder")}
              onKeyDown={handleKeyDown}
              {...inputGuards}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pixel-token-${provider}`} className="text-sm font-medium text-foreground">
              {words("accessToken")}{" "}
              {editing ? <span className="font-normal text-muted-foreground">{t("optionalTag")}</span> : null}
            </label>
            <Input
              required={!editing}
              id={`pixel-token-${provider}`}
              name={`pixel_token_${provider}`}
              value={form.access_token}
              onChange={(e) => setForm({ ...form, access_token: e.target.value })}
              placeholder={editing ? tI("tokenKeep") : words("accessTokenPlaceholder")}
              className="font-mono"
              onKeyDown={handleKeyDown}
              {...inputGuards}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pixel-test-${provider}`} className="text-sm font-medium text-foreground">
              {words("testEventCode")} <span className="font-normal text-muted-foreground">{t("optionalTag")}</span>
            </label>
            <Input
              id={`pixel-test-${provider}`}
              name={`pixel_test_${provider}`}
              value={form.test_event_code}
              onChange={(e) => setForm({ ...form, test_event_code: e.target.value })}
              placeholder={words("testEventPlaceholder")}
              onKeyDown={handleKeyDown}
              {...inputGuards}
            />
            <p className="text-[12px] text-muted-foreground">{tI("testCodeHint")}</p>
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              variant="outline"
              className={settingsInvertedButtonClassName}
              disabled={saving}
              loading={saving}
            >
              {editing ? tI("saveChanges") : tI("connect")}
            </Button>
            <Button type="button" variant="outline" className={settingsInvertedButtonClassName} onClick={closeDialog}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SettingsActionDialog>

      <SettingsActionDialog
        open={dialog?.kind === "events" && !!dialogPixel}
        onOpenChange={(next) => {
          if (!next) closeDialog();
        }}
        title={words("modalConfigureTitle")}
        description={words("modalConfigureDescription")}
      >
        {dialog?.kind === "events" && dialogPixel ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{idLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 break-all rounded-ui border border-border bg-muted/50 px-2 py-1 font-mono text-xs">
                  {dialogPixel.pixel_id || "—"}
                </code>
                {dialogPixel.pixel_id ? (
                  <Button type="button" variant="ghost" className="shrink-0" onClick={() => void copyId(dialogPixel.pixel_id)}>
                    {copied ? (
                      <>
                        <Check className="mr-1 size-3.5" aria-hidden />
                        {tI("copied")}
                      </>
                    ) : (
                      <>
                        <ClipboardTextIcon className="mr-1 size-3.5" aria-hidden />
                        {words("copyPixel")}
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
            {dialogPixel.event_settings ? (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-foreground">{t("marketing.eventTracking")}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
                  {EVENT_KEYS.map(({ key, label }) => (
                    <label key={key} className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={dialogPixel.event_settings![key]}
                        disabled={!canManage || eventSavingId === dialogPixel.public_id}
                        onChange={(e) => void switchEvent(dialogPixel, key, e.target.checked)}
                        className="form-checkbox size-3.5"
                      />
                      {(t as (k: string) => string)(`marketing.${label}`)}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SettingsActionDialog>
    </>
  );
}
