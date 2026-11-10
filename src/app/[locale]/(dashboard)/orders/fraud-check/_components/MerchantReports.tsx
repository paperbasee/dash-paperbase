import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, Flag } from "lucide-react";

import { formatDashboardDate } from "@/lib/datetime-display";
import { cn } from "@/lib/utils";

import type { MerchantReport } from "../_lib/report";
import { DELIVERED_TEXT, LEVEL_TEXT } from "../_lib/tones";

/** What other merchants reported about this number, through the provider; or that nobody did. */
export function MerchantReports({ reports }: { reports: MerchantReport[] }) {
  const t = useTranslations("fraudCheckPage");
  const tCheck = useTranslations("fraudCheck");
  const locale = useLocale();
  // The dashboard's own way of writing a day; a report without one says nothing.
  const day = (iso: string) => {
    const shown = iso ? formatDashboardDate(iso, locale) : "—";
    return shown === "—" ? "" : shown;
  };

  if (reports.length === 0) {
    return (
      <section className="flex items-center gap-2.5 rounded-card border border-card-border bg-card p-4 text-sm text-foreground sm:p-5">
        <CircleCheck className={cn("size-[18px] shrink-0", DELIVERED_TEXT)} aria-hidden />
        {t("noReports")}
      </section>
    );
  }
  return (
    <section className="rounded-card border border-card-border bg-card p-4 sm:p-5">
      <h2 className={cn("text-sm font-semibold", LEVEL_TEXT.risky)}>{tCheck("reportsTitle", { count: reports.length })}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {reports.map((report, index) => {
          const meta = [report.courier, day(report.reportedAt)].filter(Boolean).join(", ");
          return (
            <li key={index} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5 text-sm leading-snug">
              <Flag className={cn("mt-0.5 size-4", LEVEL_TEXT.risky)} aria-hidden />
              <div className="min-w-0 break-words">
                <p className="text-foreground">{report.details}</p>
                {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
