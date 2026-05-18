"use client";

import { useMemo } from "react";
import {
  Box,
  ShoppingCart,
  Ticket,
  User,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { useActivities } from "@/hooks/useActivities";
import { formatDashboardTime } from "@/lib/datetime-display";
import { cn } from "@/lib/utils";
import type { ActivityLog } from "@/types";

const ENTITY_ICONS: Record<string, LucideIcon> = {
  order: ShoppingCart,
  product: Box,
  customer: User,
  support_ticket: Ticket,
};

const ACTION_BADGE: Record<string, string> = {
  create: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  update: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  delete: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  custom: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

function formatActivityText(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface DashboardRecentEventsProps {
  startDate: string;
  endDate: string;
}

export default function DashboardRecentEvents({
  startDate,
  endDate,
}: DashboardRecentEventsProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const filters = useMemo(
    () => ({
      page: 1,
      start_date: startDate,
      end_date: endDate,
    }),
    [startDate, endDate]
  );

  const { data, loading } = useActivities(filters);
  const results = (data?.results ?? []).slice(0, 6);

  return (
    <DashboardSection
      title={t("recentEvents")}
      accentClass="bg-amber-500"
      badge={t("recentEventsBadge")}
      contentClassName="divide-y divide-border/60"
      className="h-full"
    >
      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          {t("loading")}
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          {t("noRecentActivity")}
        </p>
      ) : (
        <ul className="max-h-[320px] overflow-y-auto">
          {results.map((item) => (
            <EventRow key={item.public_id} item={item} locale={locale} />
          ))}
        </ul>
      )}
      <div className="border-t border-border/60 px-4 py-2 sm:px-5">
        <DeferredNavLink
          href="/activities"
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("viewAllActivities")}
        </DeferredNavLink>
      </div>
    </DashboardSection>
  );
}

function EventRow({ item, locale }: { item: ActivityLog; locale: string }) {
  const Icon = ENTITY_ICONS[item.entity_type] ?? Box;
  const badgeClass =
    ACTION_BADGE[item.action] ??
    "border-border bg-muted/50 text-muted-foreground";

  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <span className="mt-0.5 w-14 shrink-0 font-numbers text-xs text-muted-foreground">
        {formatDashboardTime(item.created_at, locale)}
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-ui border border-border bg-muted/40">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{item.summary}</p>
        <span
          className={cn(
            "mt-1.5 inline-flex rounded-ui border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badgeClass
          )}
        >
          {formatActivityText(item.action)}
        </span>
      </div>
    </li>
  );
}
