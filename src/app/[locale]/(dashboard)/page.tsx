"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardHero from "@/components/dashboard/DashboardHero";
import { HomeLatestOrders } from "@/components/dashboard/HomeLatestOrders";
import { HomeOrdersPanel } from "@/components/dashboard/HomeOrdersPanel";
import { HomeSidePanel } from "@/components/dashboard/HomeSidePanel";
import { HomeSetupGuide } from "@/components/setup-guide/SetupGuideCard";
import type { DateRangeValue } from "@/components/DateRangeFilter";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { useDashboardAnalyticsQuery } from "@/hooks/useDashboardAnalyticsQuery";
import { useCourierBalance, useHomeNumbers } from "@/hooks/useHomeNumbers";
import { resolvePreset } from "@/lib/date-range-presets";
import { greetingName } from "@/lib/dashboard/greeting";
import { loadDashboardRange, saveDashboardRange } from "@/lib/dashboard/dashboard-range-storage";
import { getPreviousDateRange } from "@/lib/dashboard/previous-date-range";
import { normalizeDateRange } from "@/lib/validation";

/**
 * The home page (owner, 2026-11-12): the orders placed in the period the switch picks, where
 * every order is right now, the newest orders, what needs attention, and the courier's money.
 * Sales and their charts are the Analytics page's.
 */
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { meProfile, meProfileStatus } = useAuth();
  const { has, isUnknown } = usePermissions();
  const today = useMemo(() => new Date(), []);
  const [now, setNow] = useState(() => Date.now());

  const [range, setRange] = useState<DateRangeValue>(() => resolvePreset("last24h", today)!);

  // Restore the last-picked range after mount (client-only; avoids an SSR/
  // hydration mismatch from reading localStorage during the initial render).
  useEffect(() => {
    const stored = loadDashboardRange();
    if (!stored) return;
    if (stored.preset === "custom") {
      setRange(normalizeDateRange(stored, today));
      return;
    }
    const resolved = resolvePreset(stored.preset, today);
    if (resolved) setRange(normalizeDateRange(resolved, today));
    // Restore once on mount; `today` is a stable ref from useMemo(() => new Date(), []).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Oldest 2 hours ago" moves with the clock between fetches.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleRangeChange = (next: DateRangeValue) => {
    setRange(next);
    saveDashboardRange(next);
  };

  const previousRange = useMemo(() => getPreviousDateRange(range), [range]);

  // The person signed in, by their own first name -- never the shop owner's -- once it is known.
  const name = meProfileStatus === "ready" ? greetingName(meProfile) : "";

  const greeting = useMemo(() => {
    const hourLocal = new Date().getHours();
    if (hourLocal >= 5 && hourLocal < 12) return t("greetingMorning");
    if (hourLocal >= 12 && hourLocal < 17) return t("greetingAfternoon");
    if (hourLocal >= 17 && hourLocal < 23) return t("greetingEvening");
    return t("greetingLateNight");
  }, [t]);

  const period = useDashboardAnalyticsQuery({
    startDate: range.startDate,
    endDate: range.endDate,
    bucket: range.bucket,
  });
  const previous = useDashboardAnalyticsQuery({
    startDate: previousRange.startDate,
    endDate: previousRange.endDate,
    bucket: previousRange.bucket,
  });
  const numbers = useHomeNumbers();
  // The courier's money is the owner's and Admins' (settings.manage); nobody else asks, not
  // even while the member's permissions are still loading.
  const courier = useCourierBalance(!isUnknown && has("settings.manage"));

  return (
    <div className="flex flex-col gap-5 pb-2">
      <DashboardHero greeting={greeting} name={name} range={range} onRangeChange={handleRangeChange} />

      <HomeSetupGuide />

      {period.error || period.networkError ? (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {period.networkError ? t("serverUnreachable") : period.error}
        </div>
      ) : null}

      <HomeOrdersPanel
        summary={period.data?.summary ?? null}
        previousOrders={previous.data?.summary.orders ?? null}
        series={period.data?.series ?? []}
        bucket={range.bucket}
        flow={numbers.data?.flow}
        now={now}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <HomeLatestOrders startDate={range.startDate} endDate={range.endDate} summary={period.data?.summary ?? null} />
        <HomeSidePanel attention={numbers.data?.attention} flow={numbers.data?.flow} courier={courier.data} />
      </div>
    </div>
  );
}
