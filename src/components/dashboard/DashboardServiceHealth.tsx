"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { toLocaleDigits } from "@/lib/locale-digits";
import { cn } from "@/lib/utils";

interface DashboardServiceHealthProps {
  isLive: boolean;
  apiHealthy: boolean;
  locale: string;
}

const BAR_COUNT = 40;

export default function DashboardServiceHealth({
  isLive,
  apiHealthy,
  locale,
}: DashboardServiceHealthProps) {
  const t = useTranslations("dashboard");

  const healthPercent = apiHealthy ? (isLive ? 99.8 : 98.5) : 92.0;
  const displayPercent = toLocaleDigits(healthPercent.toFixed(1), locale);

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      if (!apiHealthy && i === BAR_COUNT - 1) return "bad";
      if (!apiHealthy && i === BAR_COUNT - 2) return "warn";
      if (i % 17 === 0 && apiHealthy) return "warn";
      if (i % 29 === 0 && apiHealthy) return "bad";
      return "good";
    });
  }, [apiHealthy]);

  return (
    <DashboardSection
      title={t("serviceHealth")}
      accentClass="bg-[hsl(var(--chart-products))]"
      contentClassName="p-4 sm:p-5"
    >
      <p className="font-numbers text-3xl font-bold text-[hsl(var(--chart-products))]">
        {displayPercent}%
      </p>
      <div
        className="mt-4 flex items-end gap-0.5"
        role="img"
        aria-label={t("serviceHealthAria", { percent: displayPercent })}
      >
        {bars.map((state, i) => (
          <span
            key={i}
            className={cn(
              "w-1 flex-1 rounded-sm",
              state === "good" && "h-6 bg-[hsl(var(--chart-products))]/80",
              state === "warn" && "h-4 bg-[hsl(var(--chart-customers))]/80",
              state === "bad" && "h-3 bg-[hsl(var(--chart-support-tickets))]/80"
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{t("serviceHealthRangeStart")}</span>
        <span>{t("serviceHealthRangeEnd")}</span>
      </div>
    </DashboardSection>
  );
}
