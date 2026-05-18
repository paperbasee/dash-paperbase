"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { toLocaleDigits } from "@/lib/locale-digits";
import type { DashboardStats } from "@/types";

interface DashboardOrderStatusProps {
  stats: DashboardStats | undefined;
  loading?: boolean;
  locale: string;
}

export default function DashboardOrderStatus({
  stats,
  loading,
  locale,
}: DashboardOrderStatusProps) {
  const t = useTranslations("dashboard");

  const rows = useMemo(() => {
    if (!stats) return [];
    const { confirmed, pending, cancelled, total } = stats.orders;
    const denom = total > 0 ? total : 1;
    return [
      {
        key: "confirmed",
        label: t("orderStatusCompleted"),
        pct: Math.round((confirmed / denom) * 100),
        barClass: "bg-[hsl(var(--chart-products))]",
      },
      {
        key: "pending",
        label: t("orderStatusPending"),
        pct: Math.round((pending / denom) * 100),
        barClass: "bg-[hsl(var(--chart-customers))]",
      },
      {
        key: "cancelled",
        label: t("orderStatusCancelled"),
        pct: Math.round((cancelled / denom) * 100),
        barClass: "bg-[hsl(var(--chart-support-tickets))]",
      },
    ];
  }, [stats, t]);

  return (
    <DashboardSection
      title={t("orderStatus")}
      accentClass="bg-[hsl(var(--chart-products))]"
      contentClassName="space-y-4 p-4 sm:p-5"
    >
      {loading || !stats ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded-ui bg-muted/50" />
          ))}
        </div>
      ) : (
        rows.map((row) => (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-numbers font-medium text-foreground">
                {toLocaleDigits(String(row.pct), locale)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${row.barClass}`}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))
      )}
    </DashboardSection>
  );
}
