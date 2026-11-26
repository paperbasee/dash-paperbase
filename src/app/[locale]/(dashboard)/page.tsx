"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardHero from "@/components/dashboard/DashboardHero";
import { HomeInsights } from "@/components/dashboard/HomeInsights";
import { HomeLatestOrders, type LatestFilter } from "@/components/dashboard/HomeLatestOrders";
import { HomeOrdersPanel } from "@/components/dashboard/HomeOrdersPanel";
import { HomeRightNow } from "@/components/dashboard/HomeRightNow";
import { HomeAttention, HomeCourier } from "@/components/dashboard/HomeSidePanel";
import { HomeSetupGuide } from "@/components/setup-guide/SetupGuideCard";
import type { DateRangeValue } from "@/components/DateRangeFilter";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { useDashboardAnalyticsQuery } from "@/hooks/useDashboardAnalyticsQuery";
import { useCourierBalance, useHomeNumbers } from "@/hooks/useHomeNumbers";
import { useStorefrontUrl } from "@/hooks/useStorefrontUrl";
import { resolvePreset } from "@/lib/date-range-presets";
import { greetingName } from "@/lib/dashboard/greeting";
import { loadDashboardRange, saveDashboardRange } from "@/lib/dashboard/dashboard-range-storage";
import { homeInsights } from "@/lib/dashboard/home";
import { getPreviousDateRange } from "@/lib/dashboard/previous-date-range";
import { normalizeDateRange } from "@/lib/validation";

/**
 * The home page (owner's pick of 2026-11-26, direction 1 -- light, like Google Analytics' home):
 * the period's orders as tabs over one chart, against the period before; "right now" beside it;
 * the latest orders; what needs attention; the courier's money; and what to look at, in words.
 * Only the home's own numbers: sales and the rest are the Analytics page's.
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
  const shopUrl = useStorefrontUrl();
  const shopName = meProfileStatus === "ready" ? (meProfile?.store?.name ?? "") : "";
  const [latestFilter, setLatestFilter] = useState<LatestFilter>("");

  const summary = period.data?.summary ?? null;
  const flow = numbers.data?.flow;
  const insights = homeInsights(flow, summary, previous.data?.summary ?? null);

  // The cancellations insight counts this period's: the latest orders below show exactly those.
  const showCancelled = () => {
    setLatestFilter("cancelled");
    document.getElementById("latest-orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-5 pb-2">
      <DashboardHero greeting={greeting} name={name} shopName={shopName} range={range} onRangeChange={handleRangeChange} />

      <HomeSetupGuide />

      {period.error || period.networkError ? (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {period.networkError ? t("serverUnreachable") : period.error}
        </div>
      ) : null}

      <div className={flow ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" : "grid"}>
        <HomeOrdersPanel
          summary={summary}
          previous={previous.data?.summary ?? null}
          series={period.data?.series ?? []}
          previousSeries={previous.data?.series ?? []}
          bucket={range.bucket}
          shopUrl={shopUrl}
        />
        {flow ? <HomeRightNow flow={flow} now={now} /> : null}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <HomeLatestOrders
          startDate={range.startDate}
          endDate={range.endDate}
          summary={summary}
          filter={latestFilter}
          onFilterChange={setLatestFilter}
          shopUrl={shopUrl}
        />
        <div className="flex min-w-0 flex-col gap-5">
          <HomeAttention attention={numbers.data?.attention} />
          <HomeCourier courier={courier.data} flow={flow} />
        </div>
      </div>

      <HomeInsights insights={insights} onShowCancelled={showCancelled} />
    </div>
  );
}
