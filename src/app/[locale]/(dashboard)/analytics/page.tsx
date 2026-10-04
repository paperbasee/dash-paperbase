"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FilterToggle } from "@/components/filters/FilterToggle";
import { PageHint } from "@/components/page/PageHint";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { planIncludesApp } from "@/config/apps";
import { useBranding } from "@/context/BrandingContext";
import { useFeatures } from "@/hooks/useFeatures";
import { useRouter } from "@/i18n/navigation";

import { CARD } from "./_components/kit";
import { DownloadMenu } from "./_components/DownloadMenu";
import { CompareMenu, PeriodFilters } from "./_components/PeriodControls";
import { SECTIONS, SectionTabs } from "./_components/SectionTabs";
import { AnalyticsProvider } from "./_lib/context";
import { makeFormat } from "./_lib/format";
import { DEFAULT_PRESET, type Period, periodDays, periodFromParams, periodParams } from "./_lib/period";
import { useLive, useSection } from "./_lib/queries";
import type {
  CustomersReport,
  DeliveryReport,
  DistrictsReport,
  OverviewReport,
  ProductsReport,
  Report,
  SalesReport,
  SectionKey,
  TrafficReport,
} from "./_lib/types";
import { Customers } from "./_sections/Customers";
import { Delivery } from "./_sections/Delivery";
import { Districts } from "./_sections/Districts";
import { Live } from "./_sections/Live";
import { Overview } from "./_sections/Overview";
import { Products } from "./_sections/Products";
import { Sales } from "./_sections/Sales";
import { Traffic } from "./_sections/Traffic";

/**
 * The analytics page (redesigned 2026-09-28, phone first; the chosen look:
 * story first, one chart that follows the number picked, lists with a bar
 * behind each row): eight sections, each one report from the API for the days
 * chosen, compared with the days before or a year before. The section and the
 * days live in the address bar; the days are chosen behind the filter button, as
 * every page's filters are (owner, 2026-10-04).
 *
 * The whole page is Premium (owner, 2026-10-04): a plan without analytics never
 * sees it -- the address sends them to the plans, which say why.
 */
export default function AnalyticsPage() {
  const t = useTranslations("analyticsPage");
  const tHints = useTranslations("pageHints");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currencySymbol } = useBranding();
  const { features, loading } = useFeatures();
  // Known not to be on the plan -- not merely unloaded or failed to load, which keeps the page.
  const notOnPlan = !planIncludesApp("analytics", features);

  const period = periodFromParams(new URLSearchParams(searchParams.toString()));
  const asked = searchParams.get("section") as SectionKey | null;
  const section: SectionKey = asked && SECTIONS.includes(asked) ? asked : "overview";
  const format = useMemo(() => makeFormat(locale, currencySymbol), [locale, currencySymbol]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const show = useCallback(
    (next: { section?: SectionKey; period?: Period }) => {
      const params = new URLSearchParams({
        section: next.section ?? section,
        ...periodParams(next.period ?? period),
      });
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    },
    [router, section, period],
  );

  const view = useMemo(
    () => ({ format, compare: period.compare, goTo: (to: SectionKey) => show({ section: to }) }),
    [format, period.compare, show],
  );

  useEffect(() => {
    // Replaced, so Back does not return to an address that only sends them on again.
    if (notOnPlan) router.replace("/plans?from=analytics");
  }, [notOnPlan, router]);

  if (loading || notOnPlan) return null;

  return (
    <AnalyticsProvider value={view}>
      <div className="flex w-full flex-col gap-4 pb-10 sm:gap-5">
        {/* One row, as on every page: the title, its ? and the live pill; then the filter button,
            the days compared and Download, as icons. On a phone the pill takes the next line, so
            the buttons stay beside the title. The days shown and how fresh they are, underneath. */}
        <header className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">{t("title")}</h1>
              <PageHint>{tHints("analytics")}</PageHint>
            </div>
            {section !== "live" ? (
              <div className="order-last w-full sm:order-none sm:w-auto">
                <LivePill onOpen={() => show({ section: "live" })} />
              </div>
            ) : null}
            {section === "live" ? null : (
              <div className="ml-auto flex gap-2">
                <FilterToggle
                  open={filtersOpen}
                  active={period.preset !== DEFAULT_PRESET}
                  onToggle={() => setFiltersOpen((v) => !v)}
                />
                <CompareMenu period={period} onChange={(next) => show({ period: next })} />
                <DownloadMenu period={period} section={section} />
              </div>
            )}
          </div>
          <p className="-mt-1 text-xs text-muted-foreground sm:text-[13px]">
            {section === "live" ? t("liveEvery") : <UpdatedLine period={period} at={updatedAt} />}
          </p>
        </header>

        {section !== "live" && filtersOpen ? (
          <PeriodFilters
            period={period}
            onChange={(next) => show({ period: next })}
            onClear={() => {
              show({ period: { preset: DEFAULT_PRESET, compare: period.compare } });
              setFiltersOpen(false);
            }}
          />
        ) : null}
        <SectionTabs current={section} onChange={(next) => show({ section: next })} />

        {section === "live" ? (
          <LiveReport />
        ) : (
          <SectionReport key={section} section={section} period={period} onLoaded={setUpdatedAt} />
        )}
      </div>
    </AnalyticsProvider>
  );
}

/** The days shown, in Bangladesh time, and how fresh the numbers are. */
function UpdatedLine({ period, at }: { period: Period; at: number | null }) {
  const t = useTranslations("analyticsPage");
  const format = makeFormat(useLocale(), "");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const { start, end } = periodDays(period);
  const days = format.days(start, end);
  if (at === null) return <>{t("shownDays", { days })}</>;
  const minutes = Math.max(0, Math.floor((now - at * 1000) / 60_000));
  return <>{t("updated", { days, when: minutes < 1 ? t("justNow") : t("minutesAgo", { n: format.count(minutes) }) })}</>;
}

/** Who is on the shop right now, and the orders in the last hour; opens Live. */
function LivePill({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("analyticsPage");
  const format = makeFormat(useLocale(), "");
  const live = useLive(true);
  if (!live.data) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
    >
      <span className="size-2 shrink-0 rounded-full bg-emerald-600 shadow-[0_0_0_3px_rgba(5,150,105,0.18)]" aria-hidden />
      {t("livePill", { visitors: format.count(live.data.right_now), orders: format.count(live.data.orders_last_hour) })}
    </button>
  );
}

const RENDER: Record<Exclude<SectionKey, "live">, (report: never) => ReactNode> = {
  overview: (report: OverviewReport) => <Overview report={report} />,
  sales: (report: SalesReport) => <Sales report={report} />,
  traffic: (report: TrafficReport) => <Traffic report={report} />,
  products: (report: ProductsReport) => <Products report={report} />,
  districts: (report: DistrictsReport) => <Districts report={report} />,
  delivery: (report: DeliveryReport) => <Delivery report={report} />,
  customers: (report: CustomersReport) => <Customers report={report} />,
};

function SectionReport({
  section,
  period,
  onLoaded,
}: {
  section: Exclude<SectionKey, "live">;
  period: Period;
  onLoaded: (cachedAt: number) => void;
}) {
  const query = useSection<Report>(section, period, true);
  const cachedAt = query.data?.cached_at;
  useEffect(() => {
    if (cachedAt) onLoaded(cachedAt);
  }, [cachedAt, onLoaded]);

  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <Failed onRetry={() => void query.refetch()} />;
  return <>{RENDER[section](query.data as never)}</>;
}

function LiveReport() {
  const query = useLive(true);
  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <Failed onRetry={() => void query.refetch()} />;
  return <Live report={query.data} />;
}

function Loading() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5" aria-busy>
      <Skeleton className="h-[26rem] rounded-card" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-36 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

function Failed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("analyticsPage");
  return (
    <div className={`${CARD} flex flex-col items-center gap-3 p-8 text-center`}>
      <p className="text-sm text-muted-foreground">{t("failed")}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="size-4" aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}
