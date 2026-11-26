"use client";

import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { Link } from "@/i18n/navigation";
import { formatBillingMoment } from "@/lib/billing";
import { toLocaleDigits } from "@/lib/locale-digits";
import type { RunningTrial } from "@/lib/trial";

/** Gold on the card's navy: the launch's own gold (FinishScreens' confetti). */
const GOLD = "#f5c451";

/**
 * The trial's days, rolling up from 0 as the card arrives (`.pb-roll`); a device that asks for less
 * motion sees the number still. The column is for the eye: a screen reader reads the number once.
 */
function DaysRoll({ days }: { days: number }) {
  const locale = useLocale();
  return (
    <>
      <span aria-hidden className="inline-block h-[1lh] overflow-hidden align-bottom">
        <span
          className="pb-roll flex flex-col"
          style={{ transform: `translateY(-${days}lh)` } as CSSProperties}
        >
          {Array.from({ length: days + 1 }, (_, i) => (
            <span key={i} className="h-[1lh]">
              {toLocaleDigits(String(i), locale)}
            </span>
          ))}
        </span>
      </span>
      <span className="sr-only">{toLocaleDigits(String(days), locale)}</span>
    </>
  );
}

/**
 * The free trial setup's shop came with (owner's pick of three, 2026-11-26: "show that they got a 7
 * days premium"): a navy card under the shop's link, its mark popping, the days rolling up from 0 and
 * a light passing over it once. Its days and its end are the trial's own (auth/me), never a fixed 7;
 * no card for an owner who got no trial. Navy in both themes, like the shop's panel beside it.
 */
export function PremiumTrialCard({ trial }: { trial: RunningTrial }) {
  const t = useTranslations("auth.onboarding");
  const locale = useLocale();
  return (
    <div className="relative overflow-hidden rounded-ui bg-[hsl(222_47%_11%)] px-5 py-[18px] text-white ring-1 ring-white/10">
      <span aria-hidden className="pb-shine pointer-events-none absolute inset-0" />
      <div className="relative flex items-center gap-4">
        <span
          className="pb-pop flex size-[46px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `${GOLD}29`, color: GOLD }}
        >
          <Sparkles className="size-[22px]" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: GOLD }}>
            {t("trialLabel")}
          </p>
          <p className="text-lg font-semibold leading-snug">
            {t.rich("trialTitle", { count: trial.days, days: () => <DaysRoll days={trial.days} /> })}
          </p>
          <p className="text-[12.5px] leading-relaxed text-white/70">
            {t("trialBody", { end: formatBillingMoment(trial.endsAt, locale) })}
          </p>
          <Link
            href="/plans"
            className="self-start text-[12.5px] underline decoration-current/40 underline-offset-4 transition-colors hover:decoration-current"
            style={{ color: GOLD }}
          >
            {t("trialIncluded")}
          </Link>
        </div>
      </div>
    </div>
  );
}
