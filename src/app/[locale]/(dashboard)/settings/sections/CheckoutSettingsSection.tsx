"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { isApiHttpError } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/context/PermissionsContext";
import {
  parseCheckoutSettings,
  REPEAT_ORDER_COOLDOWN_MAX_MINUTES,
  useCheckoutSettingsQuery,
  type CheckoutSettings,
} from "@/hooks/useCheckoutSettingsQuery";
import { checkoutSettingsQueryKey } from "@/lib/query-keys";
import AutopilotSettingsPanel from "./AutopilotSettingsPanel";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "90" is hard to picture; "1 hour 30 minutes" is not. */
function describeMinutes(total: number, t: Translate): string {
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const parts: string[] = [];
  if (days) parts.push(t("days", { count: days }));
  if (hours) parts.push(t("hours", { count: hours }));
  if (minutes || parts.length === 0) parts.push(t("minutes", { count: minutes }));
  return parts.join(" ");
}

/** The API's own reason when it gave one, else the page's words. */
function errorMessage(err: unknown, t: Translate): string {
  if (isApiHttpError(err)) {
    const data = err.response?.data as { detail?: unknown } | undefined;
    const d = data?.detail;
    if (typeof d === "string" && d.trim()) return d;
    if (Array.isArray(d) && d.length && typeof d[0] === "string") return d[0];
  }
  return t("somethingWrong");
}

export default function CheckoutSettingsSection({
  hidden,
}: {
  hidden: boolean;
}) {
  const t = useTranslations("settings.checkout");
  const queryClient = useQueryClient();
  const { data, isLoading: loading, isError, error } = useCheckoutSettingsQuery(!hidden);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);
  // The cooldown is edited as text so a merchant can clear the box mid-edit
  // without the field snapping to 0; it is parsed once, on save.
  const [loadedCooldown, setLoadedCooldown] = useState<number | null>(null);
  const [cooldownInput, setCooldownInput] = useState("");

  useEffect(() => {
    if (!data) return;
    setLoadedCooldown(data.repeat_order_cooldown_minutes);
    setCooldownInput(String(data.repeat_order_cooldown_minutes));
    setMessage(null);
  }, [data]);

  useEffect(() => {
    if (!isError) return;
    setMessage({ type: "error", text: errorMessage(error, t) });
  }, [isError, error, t]);

  /** null when the box does not hold a whole number of minutes inside the allowed range. */
  const parsedCooldown = (() => {
    const trimmed = cooldownInput.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = Number(trimmed);
    return n <= REPEAT_ORDER_COOLDOWN_MAX_MINUTES ? n : null;
  })();
  const cooldownDirty = loadedCooldown !== null && cooldownInput.trim() !== String(loadedCooldown);

  const handleSave = async () => {
    if (loadedCooldown === null || !cooldownDirty) return;
    if (cooldownDirty && parsedCooldown === null) {
      setMessage({
        type: "error",
        text: t("cooldownInvalid", { max: REPEAT_ORDER_COOLDOWN_MAX_MINUTES }),
      });
      return;
    }
    // Send only what changed: the API rejects unknown keys and applies the rest.
    // The form variant is NOT one of them any more -- the theme editor writes
    // that, and a screen that also wrote it would be two screens racing over
    // one row.
    const patch: Partial<CheckoutSettings> = {};
    if (parsedCooldown !== null) patch.repeat_order_cooldown_minutes = parsedCooldown;

    setSaving(true);
    setMessage(null);
    try {
      const { data: patchData } = await api.patch<CheckoutSettings>("store/checkout-settings/", patch);
      const saved = parseCheckoutSettings(patchData);
      setLoadedCooldown(saved.repeat_order_cooldown_minutes);
      setCooldownInput(String(saved.repeat_order_cooldown_minutes));
      setMessage({ type: "success", text: t("saved") });
      void queryClient.invalidateQueries({ queryKey: checkoutSettingsQueryKey });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, t) });
    } finally {
      setSaving(false);
    }
  };

  const unchanged = !cooldownDirty;
  // Checkout settings persist via settings.manage; view-only roles can't change them.
  const { has } = usePermissions();
  const canManage = has("settings.manage");


  return (
    <section
      id="panel-checkout"
      role="tabpanel"
      aria-labelledby="tab-checkout"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      {!loading ? (
        <SettingsSectionBody>
          <div className="w-full space-y-6">
            {/*
              The customer form moved into the theme editor on 2026-09-24
              (owner). It is the same shop setting it always was -- the editor's
              tile writes this very row -- but a merchant designing their
              checkout should not have to leave the page they are designing it
              on to decide how many boxes it has.

              A line is left here rather than nothing at all: this is where it
              lived, and a setting that simply vanishes reads as a setting that
              was taken away.
            */}
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">{t("formTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t.rich("formMoved", {
                  link: (chunks) => (
                    <Link
                      href="/settings?tab=customization"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>

            <div className="space-y-3 border-t border-border pt-6">
              <div className="space-y-1">
                <h3 className="text-base font-medium text-foreground">{t("cooldownTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("cooldownBody")}</p>
              </div>
              <div
                className={cn(
                  "space-y-2",
                  (loadedCooldown === null || !canManage) && "pointer-events-none opacity-60"
                )}
              >
                <label
                  htmlFor="repeat_order_cooldown_minutes"
                  className="text-sm font-medium text-foreground"
                >
                  {t("cooldownLabel")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="repeat_order_cooldown_minutes"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={cooldownInput}
                    onChange={(e) => setCooldownInput(e.target.value)}
                    disabled={loadedCooldown === null || !canManage}
                    aria-describedby="repeat_order_cooldown_hint"
                    className="h-9 w-32 rounded-xs border border-input-border bg-input-surface px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
                  />
                  <span className="text-sm text-muted-foreground">
                    {parsedCooldown === 0 ? t("cooldownOff") : parsedCooldown === null ? "" : `= ${describeMinutes(parsedCooldown, t)}`}
                  </span>
                </div>
                <p id="repeat_order_cooldown_hint" className="text-xs text-muted-foreground">
                  {t("cooldownHint", { max: REPEAT_ORDER_COOLDOWN_MAX_MINUTES })}
                </p>
              </div>
            </div>

            {message && (
              <p
                className={
                  message.type === "success"
                    ? "text-sm text-green-600"
                    : "text-sm text-destructive"
                }
              >
                {message.text}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className={`${settingsInvertedButtonClassName} gap-2`}
              disabled={saving || unchanged || loadedCooldown === null || !canManage}
              onClick={() => void handleSave()}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("save")}
            </Button>

            <AutopilotSettingsPanel />
          </div>
        </SettingsSectionBody>
      ) : null}
    </section>
  );
}
