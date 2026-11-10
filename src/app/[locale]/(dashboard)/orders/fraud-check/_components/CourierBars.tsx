import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { CourierLogo } from "../../_components/CourierItem";
import { toneOf, type CourierRow } from "../_lib/report";
import { LEVEL_TEXT } from "../_lib/tones";

/**
 * Each courier that carried a parcel to this number, busiest first: its logo, one bar split into
 * delivered and cancelled, the counts in words, and the delivered share in its colour. A bar, not a
 * table, so a phone reads it without scrolling sideways.
 */
export function CourierBars({ couriers, numberClass }: { couriers: CourierRow[]; numberClass: string }) {
  const t = useTranslations("fraudCheckPage");
  return (
    <section className="min-w-0 rounded-card border border-card-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("byCourier")}</h2>
      {couriers.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("noCouriers")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {couriers.map((c) => (
            <li
              key={c.name}
              className="grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-4"
            >
              <CourierLogo name={c.name} logoUrl={c.logo || null} sizeClassName="h-9 w-20 sm:w-24" />
              <div className="min-w-0">
                <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="bg-emerald-500" style={{ width: `${(c.delivered / c.total) * 100}%` }} />
                  <span className="bg-red-500" style={{ width: `${(c.cancelled / c.total) * 100}%` }} />
                </div>
                <p className={cn("mt-1.5 text-xs text-muted-foreground", numberClass)}>
                  {t("courierLine", { success: c.delivered, total: c.total, cancelled: c.cancelled })}
                </p>
              </div>
              <span className={cn("min-w-11 text-right text-sm font-semibold", numberClass, LEVEL_TEXT[toneOf(c.deliveredPct)])}>
                {c.deliveredPct}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
