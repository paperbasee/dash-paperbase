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
  useCheckoutSettingsQuery,
  type CustomerFormVariant,
} from "@/hooks/useCheckoutSettingsQuery";
import { checkoutSettingsQueryKey } from "@/lib/query-keys";
import AutopilotSettingsPanel from "./AutopilotSettingsPanel";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

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

  useEffect(() => {
    if (!data?.customer_form_variant) return;
    setLoadedVariant(data.customer_form_variant);
    setSelectedVariant(data.customer_form_variant);
    setMessage(null);
  }, [data?.customer_form_variant]);

  useEffect(() => {
    if (!isError) return;
    setLoadedVariant(null);
    setMessage({ type: "error", text: errorMessage(error) });
  }, [isError, error]);

  const handleSave = async () => {
    if (loadedVariant === null || selectedVariant === loadedVariant) return;
    setSaving(true);
    setMessage(null);
    try {
      const { data: patchData } = await api.patch<{ customer_form_variant: CustomerFormVariant }>(
        "store/checkout-settings/",
        { customer_form_variant: selectedVariant }
      );
      const v = patchData.customer_form_variant;
      if (v !== "minimal" && v !== "extended") {
        throw new Error("Invalid response");
      }
      setLoadedVariant(v);
      setSelectedVariant(v);
      setMessage({ type: "success", text: "Saved." });
      void queryClient.invalidateQueries({ queryKey: checkoutSettingsQueryKey });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const unchanged =
    loadedVariant !== null && selectedVariant === loadedVariant;
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
