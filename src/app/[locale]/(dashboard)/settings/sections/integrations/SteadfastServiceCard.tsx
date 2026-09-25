"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import type { Courier } from "@/types";
import { useCouriersQuery } from "@/hooks/useCouriersQuery";
import { couriersQueryKey } from "@/lib/query-keys";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import {
  courierPath,
  disconnectPath,
  serviceState,
  setServiceActive,
  switchTargets,
} from "@/lib/integrations/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { usePermissions } from "@/context/PermissionsContext";
import { notify } from "@/notifications";
import { cn } from "@/lib/utils";
import {
  ConnectionRow,
  ConnectionSwitch,
  DialogScreen,
  DisconnectedMark,
  ServiceCard,
  ServiceDialog,
  StatusLine,
  type ServiceTone,
} from "./ServiceCard";
import SteadfastWebhookSetup from "./SteadfastWebhookSetup";

type KeysForm = { api_key: string; secret_key: string };
const emptyForm: KeysForm = { api_key: "", secret_key: "" };

type Screen =
  | { kind: "list" }
  | { kind: "connect" }
  | { kind: "reconnect"; id: string }
  | { kind: "disconnect"; id: string }
  | { kind: "remove"; id: string };

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
 * Steadfast: one card, every Steadfast account in its pop-up (owner,
 * 2026-09-25). Orders go out through the shop's active accounts, so the card's
 * switch is whether the shop can send to Steadfast at all. Disconnect forgets
 * an account's keys but keeps it, with its delivery-updates setup.
 */
export default function SteadfastServiceCard({ panelHidden }: { panelHidden: boolean }) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tI = useTranslations("settings.integrations");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canManage = usePermissions().has("couriers.manage");
  const { data: accounts = [], isLoading } = useCouriersQuery({ enabled: !panelHidden });
  const state = serviceState(accounts);
  const service = tI("services.steadfast");
  const accountName = (account: Courier) => `${t("courier.apiKey")} ${account.api_key_masked || "—"}`;

  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const [form, setForm] = useState<KeysForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [switchingAll, setSwitchingAll] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());
  const formId = "steadfast-keys-form";

  const screenAccount =
    screen.kind === "list" || screen.kind === "connect"
      ? undefined
      : accounts.find((one) => one.public_id === screen.id);

  // An account removed elsewhere returns its screen to the list rather than leaving it empty.
  useEffect(() => {
    if (screen.kind !== "list" && screen.kind !== "connect" && !screenAccount) setScreen({ kind: "list" });
  }, [screen, screenAccount]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: couriersQueryKey });
  const saveFailed = (error: unknown) =>
    notify.error(error, { title: tI("saveFailedTitle"), fallbackMessage: tI("saveFailedBody", { service }) });

  function go(next: Screen) {
    setFormError("");
    setBusy(false);
    if (next.kind === "connect" || next.kind === "reconnect") setForm(emptyForm);
    setScreen(next);
  }

  function openAt(next: Screen) {
    go(next);
    setOpen(true);
  }

  function back() {
    if (accounts.length === 0) setOpen(false);
    else go({ kind: "list" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const keys = { api_key: form.api_key.trim(), secret_key: form.secret_key.trim() };
    try {
      if (screen.kind === "reconnect" && screenAccount) {
        await api.patch(courierPath(screenAccount.public_id), { ...keys, is_active: true });
      } else {
        await api.post("admin/couriers/", { provider: "steadfast", ...keys, is_active: true });
      }
      await refresh();
      go({ kind: "list" });
    } catch (err) {
      setFormError(formatAdminApiErrorFromAxios(err, t("courier.saveFailed")));
      setBusy(false);
    }
  }

  async function disconnect(account: Courier) {
    setBusy(true);
    try {
      await api.post(disconnectPath(courierPath(account.public_id)));
      await refresh();
      notify.success(tI("disconnectedBody", { service }), { title: tI("disconnectedTitle") });
      go({ kind: "list" });
    } catch (err) {
      saveFailed(err);
      setBusy(false);
    }
  }

  async function remove(account: Courier) {
    setBusy(true);
    try {
      await api.delete(courierPath(account.public_id));
      await refresh();
      notify.success(tI("removedBody"), { title: tI("removedTitle") });
      if (accounts.length <= 1) setOpen(false);
      go({ kind: "list" });
    } catch (err) {
      saveFailed(err);
      setBusy(false);
    }
  }

  async function switchAll(turnOn: boolean) {
    setSwitchingAll(true);
    try {
      const { failed, errors } = await setServiceActive(api, courierPath, accounts, turnOn);
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
    const count = switchTargets(accounts, turnOn).length;
    if (!turnOn) {
      void confirm({
        title: tI("offTitle", { service }),
        message: tI("offAccounts", { count, service }),
        variant: "danger",
        confirmText: tI("offConfirm"),
        cancelText: tI("keepOn"),
        onConfirm: () => switchAll(false),
      });
    } else if (count > 1) {
      void confirm({
        title: tI("onAccountsTitle", { count, service }),
        message: tI("onAccountsBody", { service }),
        confirmText: tI("onConfirm"),
        onConfirm: () => switchAll(true),
      });
    } else {
      void switchAll(true);
    }
  }

  async function switchOne(account: Courier, turnOn: boolean) {
    setSwitchingId(account.public_id);
    try {
      await api.patch(courierPath(account.public_id), { is_active: turnOn });
      await refresh();
    } catch (err) {
      saveFailed(err);
    } finally {
      setSwitchingId(null);
    }
  }

  const baseStatus =
    state.shape === "none"
      ? tI("statusNotConnected")
      : state.shape === "disconnected"
        ? tI("accountsDisconnected", { count: state.count })
        : state.shape === "all_on"
          ? tI("accountsOn", { count: state.connected })
          : state.shape === "all_off"
            ? tI("accountsOff", { count: state.connected })
            : tI("accountsSome", { active: state.active, count: state.connected });
  const status = isLoading
    ? tI("checking")
    : state.disconnected && state.connected
      ? `${baseStatus} · ${tI("disconnectedCount", { count: state.disconnected })}`
      : baseStatus;
  const tone: ServiceTone = state.on ? "on" : state.count ? "off" : "none";

  const cardControl = isLoading ? null : state.count === 0 ? (
    canManage ? (
      <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => openAt({ kind: "connect" })}>
        {tI("connect")}
      </Button>
    ) : null
  ) : state.connected ? (
    <Switch
      checked={state.on}
      onCheckedChange={onCardSwitch}
      disabled={!canManage || switchingAll}
      aria-label={tI("serviceSwitchLabel", { service })}
    />
  ) : null;

  const small = "text-[12px]";

  function listScreen() {
    return (
      <>
        {accounts.map((account) =>
          account.is_connected ? (
            <ConnectionRow
              key={account.public_id}
              lead={
                <ConnectionSwitch
                  active={account.is_active}
                  label={tI("connectionSwitchLabel", { name: accountName(account) })}
                  disabled={!canManage || switchingAll || switchingId === account.public_id}
                  onSwitch={(next) => void switchOne(account, next)}
                />
              }
              title={
                <>
                  {t("courier.apiKey")} <span className="font-mono">{account.api_key_masked || "—"}</span>
                </>
              }
              detail={[
                tI("connectedOn", { date: formatDashboardDate(account.created_at, locale) }),
                account.has_webhook_token ? tI("webhookSet") : null,
                account.is_active ? null : tI("connectionOff"),
              ]
                .filter(Boolean)
                .join(" · ")}
              actions={
                canManage ? (
                  <Button type="button" variant="ghost" size="sm" className={small} onClick={() => go({ kind: "disconnect", id: account.public_id })}>
                    {tI("disconnect")}
                  </Button>
                ) : null
              }
            >
              {canManage && account.is_active ? <SteadfastWebhookSetup courier={account} /> : null}
            </ConnectionRow>
          ) : (
            <ConnectionRow
              key={account.public_id}
              lead={<DisconnectedMark />}
              title={t("courier.apiKey")}
              detail={tI("disconnectedKept")}
              detailTone="warning"
              actions={
                canManage ? (
                  <>
                    <Button type="button" variant="outline" size="sm" className={small} onClick={() => go({ kind: "reconnect", id: account.public_id })}>
                      {tI("reconnect")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(small, "text-destructive hover:bg-destructive/10")}
                      onClick={() => go({ kind: "remove", id: account.public_id })}
                    >
                      {tI("remove")}
                    </Button>
                  </>
                ) : null
              }
            />
          ),
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5">
          {canManage ? (
            <Button type="button" variant="outline" size="sm" className={small} onClick={() => go({ kind: "connect" })}>
              <Plus className="size-3.5" aria-hidden />
              {tI("addAccount")}
            </Button>
          ) : (
            <p className="text-[12px] text-muted-foreground">{tI("viewOnly")}</p>
          )}
        </div>
      </>
    );
  }

  function keysScreen() {
    const reconnecting = screen.kind === "reconnect";
    return (
      <DialogScreen
        formId={formId}
        confirmLabel={reconnecting ? tI("reconnect") : tI("connect")}
        busy={busy}
        onCancel={back}
      >
        <form id={formId} ref={formRef} onSubmit={submit} className="space-y-3" autoComplete="off">
          {formError ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          ) : null}
          {reconnecting ? <p className="text-[13px] text-muted-foreground">{tI("reconnectAccountNote")}</p> : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="steadfast-api-key" className="text-sm font-medium text-foreground">
              {t("courier.apiKey")}
            </label>
            <Input
              id="steadfast-api-key"
              name="steadfast_api_key"
              required
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={t("courier.apiKeyPlaceholder")}
              onKeyDown={handleKeyDown}
              {...inputGuards}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="steadfast-secret-key" className="text-sm font-medium text-foreground">
              {t("courier.secretKey")}
            </label>
            <Input
              id="steadfast-secret-key"
              name="steadfast_secret_key"
              required
              value={form.secret_key}
              onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
              placeholder={t("courier.secretKeyPlaceholder")}
              className="font-mono"
              onKeyDown={handleKeyDown}
              {...inputGuards}
            />
          </div>
        </form>
      </DialogScreen>
    );
  }

  const heading =
    screen.kind === "connect"
      ? { title: t("courier.modalConnectTitle"), subtitle: t("courier.modalConnectDescription") }
      : screen.kind === "reconnect"
        ? { title: tI("reconnectAccountTitle", { service }), subtitle: service }
        : screen.kind === "disconnect"
          ? { title: tI("disconnectAccountTitle"), subtitle: screenAccount ? accountName(screenAccount) : "" }
          : screen.kind === "remove"
            ? { title: tI("removeAccountTitle"), subtitle: service }
            : { title: service, subtitle: <StatusLine tone={tone}>{status}</StatusLine> };

  return (
    <>
      <ServiceCard
        service="steadfast"
        name={service}
        status={status}
        tone={tone}
        control={cardControl}
        onOpen={state.count ? () => openAt({ kind: "list" }) : undefined}
      />

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        service="steadfast"
        title={heading.title}
        subtitle={heading.subtitle}
        onBack={screen.kind === "list" ? undefined : back}
      >
        {screen.kind === "list"
          ? listScreen()
          : screen.kind === "connect" || screen.kind === "reconnect"
            ? keysScreen()
            : screen.kind === "disconnect" && screenAccount
              ? (
                <DialogScreen
                  confirmLabel={tI("disconnect")}
                  busy={busy}
                  onCancel={back}
                  onConfirm={() => void disconnect(screenAccount)}
                >
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{tI("disconnectAccountBody")}</p>
                </DialogScreen>
              )
              : screen.kind === "remove" && screenAccount
                ? (
                  <DialogScreen
                    confirmLabel={tI("remove")}
                    confirmDanger
                    busy={busy}
                    onCancel={back}
                    onConfirm={() => void remove(screenAccount)}
                  >
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{tI("removeAccountBody")}</p>
                  </DialogScreen>
                )
                : null}
      </ServiceDialog>
    </>
  );
}
