"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { formatDashboardDateTime, formatDashboardTime } from "@/lib/datetime-display";
import { toLocaleDigits } from "@/lib/locale-digits";
import { dhakaDay, noticeTitle, statusUrl, type StatusNotice } from "@/lib/status-notice";
import { cn } from "@/lib/utils";

/** Its height on a wide screen, where it is one line: the dashboard's fixed parts sit below it. */
export const STATUS_NOTICE_HEIGHT = 32;

/** Coloured as the status page colours it: how bad an incident is, or maintenance. */
export const NOTICE_TONE = {
  degraded: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  partial_outage: "bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  major_outage: "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
  maintenance: "bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
} as const;
export const NOTICE_DOT = {
  degraded: "bg-amber-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-sky-500",
} as const;

const STATUSES = ["investigating", "identified", "monitoring"] as const;

/**
 * Across the top of the dashboard: what the status page says now (useStatusNotice). The merchant
 * reads it in a line, opens the status page for the rest, or puts it away.
 */
export function StatusNoticeBar({
  notice,
  onDismiss,
}: {
  notice: StatusNotice;
  onDismiss: (key: string) => void;
}) {
  const t = useTranslations("statusNotice");
  const locale = useLocale();
  const tone = notice.kind === "incident" ? notice.impact : "maintenance";
  const title = noticeTitle(notice, locale);

  /** "today at 2:00 AM", "tomorrow at …", or the full date and time further off. */
  const when = (seconds: number) => {
    const iso = new Date(seconds * 1000).toISOString();
    const time = formatDashboardTime(iso, locale);
    const today = dhakaDay(Date.now() / 1000);
    const tomorrow = dhakaDay(Date.now() / 1000 + 24 * 60 * 60);
    if (dhakaDay(seconds) === today) return t("today", { time });
    if (dhakaDay(seconds) === tomorrow) return t("tomorrow", { time });
    return formatDashboardDateTime(iso, locale);
  };

  let message: ReactNode;
  if (notice.kind === "incident") {
    const status = STATUSES.find((s) => s === notice.status);
    message = (
      <>
        <strong className="font-semibold">{title}</strong>
        {status ? <> · {t(status)}</> : null}
      </>
    );
  } else if (notice.kind === "maintenance_now") {
    message = t("maintenanceNow", { title, until: when(notice.ends_at) });
  } else {
    message = t("maintenanceSoon", { title, when: when(notice.starts_at) });
  }

  return (
    <div role="status" className={cn("relative border-b border-border md:h-8", NOTICE_TONE[tone])}>
      <div className="mx-auto flex min-h-8 w-full max-w-[88rem] items-center justify-center gap-x-2 gap-y-0.5 px-9 py-1.5 text-center text-[11px] leading-snug max-md:flex-wrap sm:text-xs md:h-full md:min-h-0 md:py-0">
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", NOTICE_DOT[tone])} />
        <p className="min-w-0 md:truncate">{message}</p>
        {notice.more > 0 ? (
          <span className="shrink-0 opacity-75">
            {t("more", { count: toLocaleDigits(String(notice.more), locale) })}
          </span>
        ) : null}
        <a
          href={statusUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-medium underline underline-offset-2"
        >
          {t("details")} ↗
        </a>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(notice.key)}
        aria-label={t("hide")}
        title={t("hide")}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xs p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
