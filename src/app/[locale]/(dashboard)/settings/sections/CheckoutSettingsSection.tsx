"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiHttpError } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
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
  type CustomerFormVariant,
} from "@/hooks/useCheckoutSettingsQuery";
import { checkoutSettingsQueryKey } from "@/lib/query-keys";
import AutopilotSettingsPanel from "./AutopilotSettingsPanel";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

/** "90" is hard to picture; "1 hour 30 minutes" is not. */
function describeMinutes(total: number): string {
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes || parts.length === 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(" ");
}

function errorMessage(err: unknown): string {
  if (isApiHttpError(err)) {
    const data = err.response?.data as { detail?: unknown } | undefined;
    const d = data?.detail;
    if (typeof d === "string" && d.trim()) return d;
    if (Array.isArray(d) && d.length && typeof d[0] === "string") return d[0];
  }
  return "Something went wrong. Please try again.";
}

export default function CheckoutSettingsSection({
  hidden,
}: {
  hidden: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading: loading, isError, error } = useCheckoutSettingsQuery();
  const [saving, setSaving] = useState(false);
  const [loadedVariant, setLoadedVariant] = useState<CustomerFormVariant | null>(
    null
  );
  const [selectedVariant, setSelectedVariant] =
    useState<CustomerFormVariant>("extended");
  const [message, setMessage] = useState<SettingsMessage>(null);
  // The cooldown is edited as text so a merchant can clear the box mid-edit
  // without the field snapping to 0; it is parsed once, on save.
  const [loadedCooldown, setLoadedCooldown] = useState<number | null>(null);
  const [cooldownInput, setCooldownInput] = useState("");

  useEffect(() => {
    if (!data) return;
    setLoadedVariant(data.customer_form_variant);
    setSelectedVariant(data.customer_form_variant);
    setLoadedCooldown(data.repeat_order_cooldown_minutes);
    setCooldownInput(String(data.repeat_order_cooldown_minutes));
    setMessage(null);
  }, [data]);

  useEffect(() => {
    if (!isError) return;
    setLoadedVariant(null);
    setMessage({ type: "error", text: errorMessage(error) });
  }, [isError, error]);

  /** null when the box does not hold a whole number of minutes inside the allowed range. */
  const parsedCooldown = (() => {
    const trimmed = cooldownInput.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = Number(trimmed);
    return n <= REPEAT_ORDER_COOLDOWN_MAX_MINUTES ? n : null;
  })();
  const variantDirty = loadedVariant !== null && selectedVariant !== loadedVariant;
  const cooldownDirty = loadedCooldown !== null && cooldownInput.trim() !== String(loadedCooldown);

  const handleSave = async () => {
    if (loadedVariant === null || loadedCooldown === null) return;
    if (!variantDirty && !cooldownDirty) return;
    if (cooldownDirty && parsedCooldown === null) {
      setMessage({
        type: "error",
        text: `Enter a whole number of minutes between 0 and ${REPEAT_ORDER_COOLDOWN_MAX_MINUTES}.`,
      });
      return;
    }
    // Send only what changed: the API rejects unknown keys and applies the rest.
    const patch: Partial<CheckoutSettings> = {};
    if (variantDirty) patch.customer_form_variant = selectedVariant;
    if (cooldownDirty && parsedCooldown !== null) patch.repeat_order_cooldown_minutes = parsedCooldown;

    setSaving(true);
    setMessage(null);
    try {
      const { data: patchData } = await api.patch<CheckoutSettings>("store/checkout-settings/", patch);
      const saved = parseCheckoutSettings(patchData);
      setLoadedVariant(saved.customer_form_variant);
      setSelectedVariant(saved.customer_form_variant);
      setLoadedCooldown(saved.repeat_order_cooldown_minutes);
      setCooldownInput(String(saved.repeat_order_cooldown_minutes));
      setMessage({ type: "success", text: "Saved." });
      void queryClient.invalidateQueries({ queryKey: checkoutSettingsQueryKey });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const unchanged = !variantDirty && !cooldownDirty;
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
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">
                Customer Information Form
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose how much information customers fill in at checkout.
              </p>
            </div>

            <div className="space-y-3">
              <div
                className={cn(
                  "space-y-3",
                  (loadedVariant === null || !canManage) &&
                    "pointer-events-none opacity-60"
                )}
                role="radiogroup"
                aria-label="Customer information form variant"
              >
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xs border border-border p-4 transition-colors",
                    selectedVariant === "extended" && "border-foreground/40 bg-muted/30"
                  )}
                >
                  <input
                    type="radio"
                    name="customer_form_variant"
                    value="extended"
                    checked={selectedVariant === "extended"}
                    onChange={() => setSelectedVariant("extended")}
                    className="mt-1 size-4 shrink-0 accent-foreground"
                    disabled={loadedVariant === null}
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      Extended (recommended)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Full details — name, phone, email, address, city, zone
                    </div>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xs border border-border p-4 transition-colors",
                    selectedVariant === "minimal" && "border-foreground/40 bg-muted/30"
                  )}
                >
                  <input
                    type="radio"
                    name="customer_form_variant"
                    value="minimal"
                    checked={selectedVariant === "minimal"}
                    onChange={() => setSelectedVariant("minimal")}
                    className="mt-1 size-4 shrink-0 accent-foreground"
                    disabled={loadedVariant === null}
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium text-foreground">Minimal</div>
                    <div className="text-sm text-muted-foreground">
                      Faster checkout — name, phone, city, zone only
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-6">
              <div className="space-y-1">
                <h3 className="text-base font-medium text-foreground">
                  Repeat orders from the same phone number
                </h3>
                <p className="text-sm text-muted-foreground">
                  After an order, make that phone number wait before it can order again.
                  Stops fake repeat orders on cash on delivery. Cancelled orders don&apos;t count.
                </p>
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
                  Wait time in minutes
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
                    {parsedCooldown === 0 ? "Off" : parsedCooldown === null ? "" : `= ${describeMinutes(parsedCooldown)}`}
                  </span>
                </div>
                <p id="repeat_order_cooldown_hint" className="text-xs text-muted-foreground">
                  0 turns this off. Longest allowed is 7 days (10080 minutes).
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
              disabled={saving || unchanged || loadedVariant === null || !canManage}
              onClick={() => void handleSave()}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>

            <AutopilotSettingsPanel />
          </div>
        </SettingsSectionBody>
      ) : null}
    </section>
  );
}
