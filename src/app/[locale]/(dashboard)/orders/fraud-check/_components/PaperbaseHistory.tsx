import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { PhoneHistory } from "../../_components/types";
import { CANCELLED_TEXT, DELIVERED_TEXT } from "../_lib/tones";

/**
 * Paperbase's own record of the number: counts from every shop, never which shop
 * (engine/apps/fraud_check/phone_history.py).
 */
export function PaperbaseHistory({ history, numberClass }: { history: PhoneHistory; numberClass: string }) {
  const tCheck = useTranslations("fraudCheck");
  const empty = history.delivered === 0 && history.returned === 0 && history.wrong_number_shops === 0;
  return (
    <section className="rounded-card border border-card-border bg-card p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{tCheck("historyTitle")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{tCheck("historyHint")}</p>
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">{tCheck("historyEmpty")}</p>
      ) : (
        <dl className="mt-3.5 grid grid-cols-3 gap-3">
          <Figure label={tCheck("historyDelivered")} value={String(history.delivered)} tone={DELIVERED_TEXT} numberClass={numberClass} />
          <Figure label={tCheck("historyReturned")} value={String(history.returned)} tone={CANCELLED_TEXT} numberClass={numberClass} />
          <Figure
            label={tCheck("historyWrongNumber")}
            value={tCheck("historyShops", { count: history.wrong_number_shops })}
            tone="text-foreground"
            numberClass={numberClass}
          />
        </dl>
      )}
    </section>
  );
}

function Figure({ label, value, tone, numberClass }: { label: string; value: string; tone: string; numberClass: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-0.5 text-xs leading-snug text-muted-foreground">{label}</dt>
      <dd className={cn("text-xl font-semibold leading-tight", numberClass, tone)}>{value}</dd>
    </div>
  );
}
