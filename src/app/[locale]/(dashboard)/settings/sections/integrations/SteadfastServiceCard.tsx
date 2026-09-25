"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import type { Courier } from "@/types";
import { useCouriersQuery } from "@/hooks/useCouriersQuery";
import { couriersQueryKey } from "@/lib/query-keys";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import { courierPath, serviceState, setServiceActive } from "@/lib/integrations/services";
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
import SteadfastWebhookSetup from "./SteadfastWebhookSetup";

type ConnectForm = { api_key: string; secret_key: string };
const emptyForm: ConnectForm = { api_key: "", secret_key: "" };

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
 * Steadfast: one card, every Steadfast account inside it (owner, 2026-09-25).
 * Orders go out through the shop's active accounts, so the card's switch is
 * whether the shop can send to Steadfast at all.
 */
export default function SteadfastServiceCard({
  expanded,
  onToggleExpanded,
  panelHidden,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  panelHidden: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tI = useTranslations("settings.integrations");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const canManage = usePermissions().has("couriers.manage");
  const { data: accounts = [], isLoading } = useCouriersQuery({ enabled: !panelHidden });
  const state = serviceState(accounts);
  const service = tI("services.steadfast");

  const [connectOpen, setConnectOpen] = useState(false);
  const [form, setForm] = useState<ConnectForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [switchingAll, setSwitchingAll] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

  const refresh = () => queryClient.invalidateQueries({ queryKey: couriersQueryKey });
  const saveFailed = (error: unknown) =>
    notify.error(error, { title: tI("saveFailedTitle"), fallbackMessage: tI("saveFailedBody", { service }) });

  function closeConnect() {
    setConnectOpen(false);
    setForm(emptyForm);
    setFormError("");
    setSaving(false);
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await api.post("admin/couriers/", {
        provider: "steadfast",
        api_key: form.api_key.trim(),
        secret_key: form.secret_key.trim(),
        is_active: true,
      });
      closeConnect();
      void refresh();
    } catch (err) {
      setFormError(formatAdminApiErrorFromAxios(err, t("courier.saveFailed")));
    } finally {
      setSaving(false);
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
    if (!turnOn) {
      void confirm({
        title: tI("offTitle", { service }),
        message: tI("offAccounts", { count: state.count, service }),
        variant: "danger",
        confirmText: tI("offConfirm"),
        cancelText: tI("keepOn"),
        onConfirm: () => switchAll(false),
      });
    } else if (state.count > 1) {
      void confirm({
        title: tI("onAccountsTitle", { count: state.count, service }),
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

  function disconnect(account: Courier) {
    void confirm({
      title: t("courier.modalDisconnectTitle"),
      message: t("courier.modalDisconnectDescription"),
      variant: "danger",
      confirmText: tI("disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(courierPath(account.public_id));
          void refresh();
        } catch (err) {
          saveFailed(err);
          throw err;
        }
      },
    });
  }

  const status = isLoading
    ? tI("checking")
    : state.shape === "none"
      ? tI("statusNotConnected")
      : state.shape === "all_on"
        ? tI("accountsOn", { count: state.count })
        : state.shape === "all_off"
          ? tI("accountsOff", { count: state.count })
          : tI("accountsSome", { active: state.active, count: state.count });

  const control = isLoading ? null : state.count === 0 ? (
    canManage ? (
      <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => setConnectOpen(true)}>
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

  return (
    <>
      <ServiceCard
        service="steadfast"
        name={service}
        status={status}
        tone={state.on ? "on" : state.count ? "off" : "none"}
        control={control}
        expanded={expanded}
        onToggleExpanded={state.count ? onToggleExpanded : undefined}
      >
        {accounts.map((account) => (
          <ConnectionRow
            key={account.public_id}
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
            active={account.is_active}
            switchLabel={tI("connectionSwitchLabel", {
              name: `${t("courier.apiKey")} ${account.api_key_masked}`,
            })}
            canManage={canManage}
            switching={switchingId === account.public_id || switchingAll}
            onSwitch={(next) => void switchOne(account, next)}
            actions={
              canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[12px] text-destructive hover:bg-destructive/10"
                  onClick={() => disconnect(account)}
                >
                  {tI("disconnect")}
                </Button>
              ) : null
            }
          >
            {canManage && account.is_active ? <SteadfastWebhookSetup courier={account} /> : null}
          </ConnectionRow>
        ))}
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-3.5 py-2.5">
          {canManage ? (
            <Button type="button" variant="outline" size="sm" className="text-[12px]" onClick={() => setConnectOpen(true)}>
              <Plus className="size-3.5" aria-hidden />
              {tI("addAccount")}
            </Button>
          ) : (
            <p className="text-[12px] text-muted-foreground">{tI("viewOnly")}</p>
          )}
        </div>
      </ServiceCard>

      <SettingsActionDialog
        open={connectOpen}
        onOpenChange={(next) => {
          if (!next) closeConnect();
        }}
        title={t("courier.modalConnectTitle")}
        description={t("courier.modalConnectDescription")}
      >
        <form ref={formRef} onSubmit={connect} className="space-y-3" autoComplete="off">
          {formError ? (
            <div className="rounded-card border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          ) : null}
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
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              variant="outline"
              className={settingsInvertedButtonClassName}
              disabled={saving}
              loading={saving}
            >
              {tI("connect")}
            </Button>
            <Button type="button" variant="outline" className={settingsInvertedButtonClassName} onClick={closeConnect}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SettingsActionDialog>
    </>
  );
}
