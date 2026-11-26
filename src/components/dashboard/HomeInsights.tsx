"use client";

import { ArrowRight, Clock, TrendingUp, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { HomeInsight } from "@/lib/dashboard/home";
import { toLocaleDigits } from "@/lib/locale-digits";
import { cn } from "@/lib/utils";

const ICON = {
  late: { Icon: Clock, tile: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  stuck: { Icon: Truck, tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  cancelled: { Icon: TrendingUp, tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

/**
 * What to look at, in words (owner's pick of 2026-11-26, like Google Analytics' insights): each
 * only while it is true (lib/dashboard/home `homeInsights`), and each opening the orders it is
 * about -- the cancelled ones are the period's, so that one turns the latest orders below to
 * them rather than opening every cancelled order there is.
 */
export function HomeInsights({ insights, onShowCancelled }: { insights: HomeInsight[]; onShowCancelled: () => void }) {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  const digits = (n: number) => toLocaleDigits(String(n), locale);
  if (insights.length === 0) return null;

  return (
    <section aria-label={t("insightsAria")} className="grid gap-4 md:grid-cols-3">
      {insights.map((insight) => {
        const { Icon, tile } = ICON[insight.kind];
        const action = "mt-1 inline-flex items-center gap-1 self-start text-xs font-medium text-foreground hover:underline";
        return (
          <div key={insight.kind} className="flex gap-3 rounded-card border border-card-border bg-card px-4 py-4">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-ui", tile)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              {insight.kind === "late" ? (
                <>
                  <strong className="text-sm font-semibold text-foreground">{t("insightLate", { count: insight.count })}</strong>
                  <span className="text-xs text-muted-foreground">{t("insightLateBody")}</span>
                  <Link href="/orders?queue=pending_over_day" className={action}>
                    {t("insightLateAction")}
                    <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                  </Link>
                </>
              ) : insight.kind === "stuck" ? (
                <>
                  <strong className="text-sm font-semibold text-foreground">{t("insightStuck", { count: insight.count })}</strong>
                  <span className="text-xs text-muted-foreground">{t("insightStuckBody")}</span>
                  <Link href="/orders?queue=stuck" className={action}>
                    {t("insightStuckAction")}
                    <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                  </Link>
                </>
              ) : (
                <>
                  <strong className="text-sm font-semibold text-foreground">
                    {t("insightCancelled", { percent: digits(insight.percent) })}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {t("insightCancelledBody", { now: digits(insight.now), before: digits(insight.before) })}
                  </span>
                  <button type="button" onClick={onShowCancelled} className={action}>
                    {t("insightCancelledAction")}
                    <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                  </button>
                </>
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}
