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
  disconnectPath,
  marketingIntegrationPath,
  pixelsLeft,
  serviceState,
  setServiceActive,
  switchTargets,
  type PixelService,
} from "@/lib/integrations/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { usePermissions } from "@/context/PermissionsContext";
import { notify } from "@/notifications";
import {
  ConnectionList,
  ConnectionMenu,
  ConnectionRow,
  ConnectionSwitch,
  DialogScreen,
  DisconnectedMark,
  ServiceCard,
  ServiceDialog,
  StatusLine,
  type ServiceTone,
} from "./ServiceCard";

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

/** One screen of the pop-up at a time. */
type Screen =
  | { kind: "list" }
  | { kind: "connect" }
  | { kind: "edit"; id: string }
  | { kind: "events"; id: string }
  | { kind: "reconnect"; id: string }
  | { kind: "disconnect"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "switchAll"; turnOn: boolean };

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
 * Meta or TikTok: one card for the service, every pixel in its pop-up
 * (owner, 2026-09-25). The pop-up's top switch is the whole service; each pixel
 * keeps its own switch, its event switches, Edit and Disconnect. Disconnect
 * is not delete: the pixel stays with its settings, without its token, until
 * it is reconnected -- or removed.
 */
export default function PixelServiceCard({
  provider,
  panelHidden,
  filteredOut,
}: {
  provider: PixelService;
  panelHidden: boolean;
  filteredOut: boolean;
}) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("settings");
  const tI = useTranslations("settings.integrations");
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
  const pixelName = (pixel: MarketingIntegration) => `${idLabel} ${maskCredentialPreview(pixel.pixel_id)}`;

  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const [form, setForm] = useState<PixelForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [switchingAll, setSwitchingAll] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [eventSavingId, setEventSavingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());
  const formId = `pixel-form-${provider}`;

  const screenPixel = "id" in screen ? pixels.find((one) => one.public_id === screen.id) : undefined;

  // A pixel removed elsewhere returns its screen to the list rather than leaving it empty.
  useEffect(() => {
    if ("id" in screen && !screenPixel) setScreen({ kind: "list" });
  }, [screen, screenPixel]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: marketingIntegrationsQueryKey });
  const saveFailed = (error: unknown) =>
    notify.error(error, { title: tI("saveFailedTitle"), fallbackMessage: tI("saveFailedBody", { service }) });

  function go(next: Screen) {
    setFormError("");
    setBusy(false);
    setScreen(next);
  }

  function openAt(next: Screen) {
    if (next.kind === "connect") setForm(emptyForm);
    go(next);
    setOpen(true);
  }

  function back() {
    // With nothing connected there is no list to go back to.
    if (pixels.length === 0) setOpen(false);
    else go({ kind: "list" });
  }

  function startEdit(pixel: MarketingIntegration) {
    setForm({ pixel_id: pixel.pixel_id, access_token: "", test_event_code: pixel.test_event_code });
    go({ kind: "edit", id: pixel.public_id });
  }

  function startReconnect(pixel: MarketingIntegration) {
    setForm({ ...emptyForm, pixel_id: pixel.pixel_id });
    go({ kind: "reconnect", id: pixel.public_id });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fallback = screen.kind === "connect" ? words("connectFailed") : tI("saveFailedBody", { service });
    setFormError("");
    setBusy(true);
    try {
      if (screen.kind === "edit" && screenPixel) {
        // Only what changed; an empty token keeps the saved one.
        const body: Partial<PixelForm> = {};
        if (form.pixel_id.trim() !== screenPixel.pixel_id) body.pixel_id = form.pixel_id.trim();
        if (form.access_token.trim()) body.access_token = form.access_token.trim();
        if (form.test_event_code.trim() !== screenPixel.test_event_code) {
          body.test_event_code = form.test_event_code.trim();
        }
        if (Object.keys(body).length) await api.patch(marketingIntegrationPath(screenPixel.public_id), body);
      } else if (screen.kind === "reconnect" && screenPixel) {
        await api.patch(marketingIntegrationPath(screenPixel.public_id), {
          access_token: form.access_token.trim(),
          is_active: true,
        });
      } else {
        await api.post("admin/marketing-integrations/", {
          provider,
          pixel_id: form.pixel_id.trim(),
          access_token: form.access_token.trim(),
          test_event_code: form.test_event_code.trim(),
        });
      }
      await refresh();
      setForm(emptyForm);
      go({ kind: "list" });
    } catch (err) {
      setFormError(formatAdminApiErrorFromAxios(err, fallback));
      setBusy(false);
    }
  }

  async function disconnect(pixel: MarketingIntegration) {
    setBusy(true);
    try {
      await api.post(disconnectPath(marketingIntegrationPath(pixel.public_id)));
      await refresh();
      notify.success(tI("disconnectedBody", { service }), { title: tI("disconnectedTitle") });
      go({ kind: "list" });
    } catch (err) {
      saveFailed(err);
      setBusy(false);
    }
  }

  async function remove(pixel: MarketingIntegration) {
    setBusy(true);
    try {
      await api.delete(marketingIntegrationPath(pixel.public_id));
      await refresh();
      notify.success(tI("removedBody"), { title: tI("removedTitle") });
      if (pixels.length <= 1) setOpen(false);
      go({ kind: "list" });
    } catch (err) {
      saveFailed(err);
      setBusy(false);
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

  /** Stopping a service, or starting several pixels, asks first: on its own screen, never a second pop-up. */
  function onServiceSwitch(turnOn: boolean) {
    if (!turnOn || switchTargets(pixels, turnOn).length > 1) go({ kind: "switchAll", turnOn });
    else void switchAll(true);
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

  async function copyId(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (err) {
      notify.error(err, { title: tI("copyBlockedTitle"), fallbackMessage: tI("copyBlockedBody") });
    }
  }

  const baseStatus =
    state.shape === "none"
      ? tI("statusNotConnected")
      : state.shape === "disconnected"
        ? tI("pixelsDisconnected", { count: state.count })
        : state.shape === "all_on"
          ? tI("pixelsOn", { count: state.connected })
          : state.shape === "all_off"
            ? tI("pixelsOff", { count: state.connected })
            : tI("pixelsSome", { active: state.active, count: state.connected });
  const status = isLoading
    ? tI("checking")
    : state.disconnected && state.connected
      ? `${baseStatus} · ${tI("disconnectedCount", { count: state.disconnected })}`
      : baseStatus;
  const tone: ServiceTone = state.on ? "on" : state.count ? "off" : "none";

  const serviceSwitch = screen.kind === "list" && state.connected ? (
    <Switch
      checked={state.on}
      onCheckedChange={onServiceSwitch}
      disabled={!canManage || switchingAll}
      aria-label={tI("serviceSwitchLabel", { service })}
    />
  ) : null;

  const left = pixelsLeft(pixels);
  const small = "text-[12px]";

  function listScreen() {
    return (
      <>
        <ConnectionList kind="pixels">
          {pixels.map((pixel) =>
            pixel.is_connected ? (
              <ConnectionRow
                key={pixel.public_id}
                lead={
                  <ConnectionSwitch
                    active={pixel.is_active}
                    label={tI("connectionSwitchLabel", { name: pixelName(pixel) })}
                    disabled={!canManage || switchingAll || switchingId === pixel.public_id}
                    onSwitch={(next) => void switchOne(pixel, next)}
                  />
                }
                title={<PixelTitle label={idLabel} id={pixel.pixel_id} numClass={numClass} />}
                detail={[
                  tI("connectedOn", { date: formatDashboardDate(pixel.created_at, locale) }),
                  pixel.test_event_code ? tI("testCodeSet") : null,
                  pixel.is_active ? null : tI("connectionOff"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                actions={
                  <ConnectionMenu
                    items={[
                      ...(pixel.event_settings
                        ? [{ label: tI("events"), onSelect: () => go({ kind: "events", id: pixel.public_id }) }]
                        : []),
                      ...(canManage
                        ? [
                            { label: tI("edit"), onSelect: () => startEdit(pixel) },
                            { label: tI("disconnect"), onSelect: () => go({ kind: "disconnect", id: pixel.public_id }) },
                          ]
                        : []),
                    ]}
                  />
                }
              />
            ) : (
              <ConnectionRow
                key={pixel.public_id}
                lead={<DisconnectedMark />}
                title={<PixelTitle label={idLabel} id={pixel.pixel_id} numClass={numClass} />}
                detail={tI("disconnectedKept")}
                detailTone="warning"
                actions={
                  canManage ? (
                    <>
                      <Button type="button" variant="outline" size="sm" className={small} onClick={() => startReconnect(pixel)}>
                        {tI("reconnect")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(small, "text-destructive hover:bg-destructive/10")}
                        onClick={() => go({ kind: "remove", id: pixel.public_id })}
                      >
                        {tI("remove")}
                      </Button>
                    </>
                  ) : null
                }
              />
            ),
          )}
        </ConnectionList>
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5">
          {canManage && left > 0 ? (
            <Button type="button" variant="outline" size="sm" className={small} onClick={() => openAt({ kind: "connect" })}>
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
      </>
    );
  }

  function formScreen() {
    const reconnecting = screen.kind === "reconnect";
    const editing = screen.kind === "edit";
    return (
      <DialogScreen
        formId={formId}
        confirmLabel={editing ? tI("saveChanges") : reconnecting ? tI("reconnect") : tI("connect")}
        busy={busy}
        onCancel={back}
      >
        <form id={formId} ref={formRef} onSubmit={submit} className="space-y-3" autoComplete="off">
          {formError ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          ) : null}
          {reconnecting ? (
            <>
              <p className="text-[13px] text-muted-foreground">{tI("reconnectPixelNote")}</p>
              <div className="rounded-ui border border-border bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{idLabel}</p>
                <p className={cn("break-all font-mono text-[13px]", numClass)}>{form.pixel_id}</p>
              </div>
            </>
          ) : (
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
          )}
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
          {reconnecting ? null : (
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
          )}
        </form>
      </DialogScreen>
    );
  }

  function eventsScreen(pixel: MarketingIntegration) {
    return (
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{idLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 break-all rounded-ui border border-border bg-muted/50 px-2 py-1 font-mono text-xs">
              {pixel.pixel_id || "—"}
            </code>
            {pixel.pixel_id ? (
              <Button type="button" variant="ghost" className="shrink-0" onClick={() => void copyId(pixel.pixel_id)}>
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
        {pixel.event_settings ? (
          <div className="border-t border-border pt-3">
            <p className="mb-1 text-xs font-medium text-foreground">{t("marketing.eventTracking")}</p>
            <div className="divide-y divide-border">
              {EVENT_KEYS.map(({ key, label }) => {
                const words = (t as (k: string) => string)(`marketing.${label}`);
                return (
                  <div key={key} className="flex min-h-12 items-center justify-between gap-3 text-[13px] text-foreground">
                    {words}
                    <Switch
                      checked={pixel.event_settings![key]}
                      onCheckedChange={(next) => void switchEvent(pixel, key, next)}
                      disabled={!canManage || eventSavingId === pixel.public_id}
                      aria-label={words}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const heading =
    screen.kind === "switchAll"
      ? {
          title: screen.turnOn
            ? tI("onPixelsTitle", { count: switchTargets(pixels, true).length, service })
            : tI("offTitle", { service }),
          subtitle: service,
        }
      : screen.kind === "connect"
      ? { title: words("modalConnectTitle"), subtitle: words("modalConnectDescription") }
      : screen.kind === "edit"
        ? { title: tI("editTitle", { service }), subtitle: tI("editDescription") }
        : screen.kind === "reconnect"
          ? { title: tI("reconnectPixelTitle", { service }), subtitle: screenPixel ? pixelName(screenPixel) : "" }
          : screen.kind === "events"
            ? { title: words("modalConfigureTitle"), subtitle: words("modalConfigureDescription") }
            : screen.kind === "disconnect"
              ? { title: tI("disconnectPixelTitle"), subtitle: screenPixel ? pixelName(screenPixel) : "" }
              : screen.kind === "remove"
                ? { title: tI("removePixelTitle"), subtitle: screenPixel ? pixelName(screenPixel) : "" }
                : { title: service, subtitle: <StatusLine tone={tone}>{status}</StatusLine> };

  return (
    <>
      <ServiceCard
        service={provider}
        name={service}
        blurb={tI("blurbs.ads", { service })}
        status={status}
        tone={tone}
        sealed={state.connected > 0}
        onOpen={state.count ? () => openAt({ kind: "list" }) : undefined}
        onConnect={!isLoading && !state.count && canManage ? () => openAt({ kind: "connect" }) : undefined}
        filteredOut={filteredOut}
      />

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        service={provider}
        title={heading.title}
        subtitle={heading.subtitle}
        onBack={screen.kind === "list" ? undefined : back}
        control={serviceSwitch}
      >
        {screen.kind === "list"
          ? listScreen()
          : screen.kind === "switchAll"
            ? (
              <DialogScreen
                confirmLabel={screen.turnOn ? tI("onConfirm") : tI("offConfirm")}
                cancelLabel={screen.turnOn ? undefined : tI("keepOn")}
                confirmDanger={!screen.turnOn}
                busy={switchingAll}
                onCancel={back}
                onConfirm={() => void switchAll(screen.turnOn).then(back)}
              >
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {screen.turnOn
                    ? tI("onPixelsBody", { service })
                    : tI("offPixels", { count: switchTargets(pixels, false).length, service })}
                </p>
              </DialogScreen>
            )
          : screen.kind === "connect" || screen.kind === "edit" || screen.kind === "reconnect"
            ? formScreen()
            : screen.kind === "events" && screenPixel
              ? eventsScreen(screenPixel)
              : screen.kind === "disconnect" && screenPixel
                ? (
                  <DialogScreen
                    confirmLabel={tI("disconnect")}
                    busy={busy}
                    onCancel={back}
                    onConfirm={() => void disconnect(screenPixel)}
                  >
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{tI("disconnectPixelBody")}</p>
                  </DialogScreen>
                )
                : screen.kind === "remove" && screenPixel
                  ? (
                    <DialogScreen
                      confirmLabel={tI("remove")}
                      confirmDanger
                      busy={busy}
                      onCancel={back}
                      onConfirm={() => void remove(screenPixel)}
                    >
                      <p className="text-[13px] leading-relaxed text-muted-foreground">{tI("removePixelBody")}</p>
                    </DialogScreen>
                  )
                  : null}
      </ServiceDialog>
    </>
  );
}

function PixelTitle({ label, id, numClass }: { label: string; id: string; numClass: string }) {
  return (
    <>
      {label} <span className={cn("font-mono", numClass)}>{maskCredentialPreview(id)}</span>
    </>
  );
}
