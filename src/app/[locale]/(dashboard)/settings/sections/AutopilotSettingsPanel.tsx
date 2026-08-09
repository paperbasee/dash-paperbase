"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isApiHttpError } from "@/lib/api-client";
import { useFeatures } from "@/hooks/useFeatures";
import { useStoreSettingsCurrentQuery } from "@/hooks/useStoreSettingsCurrentQuery";
import { storeSettingsCurrentQueryKey } from "@/lib/query-keys";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";

type Message = { type: "success" | "error"; text: string } | null;

function errorMessage(err: unknown): string {
  if (isApiHttpError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data) {
      for (const key of [
        "autopilot_enabled",
        "autopilot_min_success_ratio",
        "autopilot_min_total_parcels",
        "autopilot_max_order_value",
        "detail",
      ]) {
        const v = data[key];
        if (typeof v === "string" && v.trim()) return v;
        if (Array.isArray(v) && v.length && typeof v[0] === "string") return v[0];
      }
    }
  }
  return "Something went wrong. Please try again.";
}

function toNumberOrZero(v: string | number | undefined): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AutopilotSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreSettingsCurrentQuery();
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const featureUnlocked = hasFeature("fraud_check");

  const [enabled, setEnabled] = useState(false);
  const [ratio, setRatio] = useState<string>("90");
  const [minParcels, setMinParcels] = useState<string>("5");
  const [maxValue, setMaxValue] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(Boolean(data.autopilot_enabled));
    setRatio(String(data.autopilot_min_success_ratio ?? 90));
    setMinParcels(String(data.autopilot_min_total_parcels ?? 5));
    setMaxValue(String(toNumberOrZero(data.autopilot_max_order_value)));
    setMessage(null);
  }, [data]);

  const dirty = useMemo(() => {
    if (!data) return false;
    return (
      Boolean(data.autopilot_enabled) !== enabled ||
      String(data.autopilot_min_success_ratio ?? 90) !== ratio ||
      String(data.autopilot_min_total_parcels ?? 5) !== minParcels ||
      String(toNumberOrZero(data.autopilot_max_order_value)) !== maxValue
    );
  }, [data, enabled, ratio, minParcels, maxValue]);

  const locked = featuresLoading || !featureUnlocked;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch("store/settings/current/", {
        autopilot_enabled: enabled,
        autopilot_min_success_ratio: Number(ratio || 0),
        autopilot_min_total_parcels: Number(minParcels || 0),
        autopilot_max_order_value: Number(maxValue || 0),
      });
      setMessage({ type: "success", text: "Saved." });
      void queryClient.invalidateQueries({ queryKey: storeSettingsCurrentQueryKey });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="autopilot" className="w-full space-y-6 border-t border-border pt-8 scroll-mt-24">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-foreground">Order Autopilot</h2>
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-tooltip border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3 shrink-0" aria-hidden />
              Premium
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically fraud-check and dispatch confirmed orders when the customer&apos;s delivery
          success ratio meets your threshold. Skipped orders stay in your queue for manual review.
        </p>
      </div>

      {isLoading ? null : (
        <div
          className={cn(
            "space-y-5",
            locked && "pointer-events-none opacity-60"
          )}
        >
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Enable autopilot</span>
            <input
              type="checkbox"
              className="form-checkbox"
              checked={enabled}
              disabled={locked}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-foreground">Minimum success ratio (%)</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={ratio}
                disabled={locked}
                onChange={(e) => setRatio(e.target.value)}
              />
              <span className="block text-xs text-muted-foreground">
                Only auto-dispatch if the fraud check reports at least this success rate.
              </span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-foreground">Minimum prior parcels</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={minParcels}
                disabled={locked}
                onChange={(e) => setMinParcels(e.target.value)}
              />
              <span className="block text-xs text-muted-foreground">
                Skip customers with fewer than this many delivered parcels on record.
              </span>
            </label>

            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-foreground">Max order value (0 = no cap)</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={maxValue}
                disabled={locked}
                onChange={(e) => setMaxValue(e.target.value)}
              />
              <span className="block text-xs text-muted-foreground">
                Orders above this total are held for manual review.
              </span>
            </label>
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
            disabled={saving || !dirty || locked}
            onClick={() => void handleSave()}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save autopilot settings
          </Button>
        </div>
      )}
    </div>
  );
}
