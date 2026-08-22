"use client";

import { Sparkles } from "lucide-react";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { cn } from "@/lib/utils";
import { useFeatures } from "@/hooks/useFeatures";
import { useStoreSettingsCurrentQuery } from "@/hooks/useStoreSettingsCurrentQuery";
import { usePermissions } from "@/context/PermissionsContext";

const SETTINGS_HREF = "/settings?tab=checkout#autopilot";

export function AutopilotStatusPill() {
  const { hasFeature, loading: featuresLoading } = useFeatures();
  const { data, isLoading } = useStoreSettingsCurrentQuery();
  const { isOwner } = usePermissions();

  // Autopilot is owner-only (its settings panel is hidden from non-owners), and
  // both states of this pill link there — so don't surface it to anyone else.
  if (!isOwner) return null;
  if (featuresLoading || isLoading) return null;
  if (!hasFeature("fraud_check")) return null;

  const enabled = Boolean(data?.autopilot_enabled);
  const ratio = data?.autopilot_min_success_ratio ?? 90;

  if (enabled) {
    return (
      <DeferredNavLink
        href={SETTINGS_HREF}
        title={`Autopilot on — auto-dispatch when success ratio ≥ ${ratio}%`}
        className={cn(
          "inline-flex items-center gap-2 rounded-card border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-muted-foreground">Autopilot</span>
        <span className="tabular-nums">{ratio}%</span>
      </DeferredNavLink>
    );
  }

  return (
    <DeferredNavLink
      href={SETTINGS_HREF}
      title="Auto-dispatch trusted orders straight to your courier"
      className={cn(
        "group inline-flex items-center gap-2 rounded-card px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
        "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:brightness-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <Sparkles className="size-4 transition-transform group-hover:rotate-12" aria-hidden />
      <span>Enable Autopilot</span>
    </DeferredNavLink>
  );
}
