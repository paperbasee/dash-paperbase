"use client";

/**
 * Settings > Billing's parts (owner, 2026-10-09: design B): the band that says where the plan
 * stands, with the days left as a ring; three tiles (products, price, paid so far); the payments as
 * a timeline; and beside them what the plan gives and what paying yearly would save. Each is drawn
 * from what it is given (lib/billing, lib/plans-compare), so the tests draw every state.
 */
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Check, Clock, CreditCard, Loader2, XCircle, type LucideIcon } from "lucide-react";

import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Button } from "@/components/ui/button";
import {
  formatBillingAmount,
  formatBillingDay,
  formatBillingMonth,
  type Band,
  type BandLane,
  type BillingOverview,
  type BillingPayment,
} from "@/lib/billing";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { chargeOf, planLines, type Plan } from "@/lib/plans-compare";
import { cn } from "@/lib/utils";

const CARD = "rounded-card border border-border bg-card p-5";

/** Each lane's colour: the ring, the pill, and the mark when no days are counted. */
const TONE: Record<BandLane, { ring: string; pill: string }> = {
  active: { ring: "stroke-emerald-400", pill: "bg-emerald-400/15 text-emerald-300" },
  trial: { ring: "stroke-sky-400", pill: "bg-sky-400/15 text-sky-300" },
  endingSoon: { ring: "stroke-amber-400", pill: "bg-amber-400/15 text-amber-300" },
  grace: { ring: "stroke-amber-400", pill: "bg-amber-400/15 text-amber-300" },
  checking: { ring: "stroke-sky-400", pill: "bg-sky-400/15 text-sky-300" },
  notFound: { ring: "stroke-red-400", pill: "bg-red-400/15 text-red-300" },
  expired: { ring: "stroke-red-400", pill: "bg-red-400/15 text-red-300" },
  none: { ring: "stroke-white/30", pill: "" },
};

const MARK: Partial<Record<BandLane, LucideIcon>> = {
  checking: Clock,
  notFound: AlertTriangle,
  expired: XCircle,
  none: CreditCard,
};

function useDigits() {
  const locale = useLocale();
  return { locale, digits: (n: number) => toLocaleDigits(new Intl.NumberFormat("en-US").format(n), locale), numClass: numberTextClass(locale) };
}

/** The days left of the period, out of its length; a mark instead when none are counted. */
export function DaysRing({ band }: { band: Band }) {
  const t = useTranslations("settings.billing.ring");
  const { digits, numClass } = useDigits();
  const radius = 56;
  const around = 2 * Math.PI * radius;
  const counted = band.daysLeft !== null && band.periodDays !== null;
  const share = counted ? Math.min(1, Math.max(0, band.daysLeft! / band.periodDays!)) : 0;
  const Mark = MARK[band.lane] ?? Check;
  return (
    <div
      role="img"
      aria-label={counted ? t("aria", { left: digits(band.daysLeft!), total: digits(band.periodDays!) }) : undefined}
      aria-hidden={counted ? undefined : true}
      className="relative size-[132px] shrink-0"
    >
      <svg viewBox="0 0 132 132" className="size-full" aria-hidden>
        <circle cx="66" cy="66" r={radius} fill="none" strokeWidth="10" className="stroke-white/15" />
        {share > 0 ? (
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${share * around} ${around}`}
            transform="rotate(-90 66 66)"
            className={TONE[band.lane].ring}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {counted ? (
          <>
            <span className={cn("text-[34px] font-semibold leading-none", numClass)}>{digits(band.daysLeft!)}</span>
            <span className="mt-1 text-xs text-white/70">{t("daysLeft", { count: band.daysLeft! })}</span>
          </>
        ) : (
          <Mark className="size-9 text-white/80" strokeWidth={1.5} aria-hidden />
        )}
      </div>
    </div>
  );
}

/** The band: the plan, where it stands, and the one thing to do now, if any. */
export function BillingBand({
  band,
  plan,
  planName,
  endDate,
  canAct,
  paying,
  payError,
  onPay,
}: {
  band: Band;
  /** The shop's plan in Paperbase's list; null when the list does not hold it. */
  plan: Plan | null;
  planName: string | null;
  endDate: string | null;
  /** False for Paperbase support signed in as the owner: they read, the owner pays. */
  canAct: boolean;
  paying: boolean;
  payError: string | null;
  onPay: () => void;
}) {
  const t = useTranslations("settings.billing");
  const { locale } = useDigits();
  const lane = band.lane;
  const amount = band.payment && lane === "checking"
    ? formatBillingAmount(band.payment.amount, locale)
    : plan
      ? formatBillingAmount(chargeOf(plan), locale)
      : "";
  const values = {
    plan: planName ?? "",
    end: endDate ? formatBillingDay(endDate, locale) : "",
    next: band.nextDue ? formatBillingDay(band.nextDue, locale) : "",
    amount,
    trx: band.payment?.transaction_id ?? "",
    count: band.daysLeft ?? 0,
  };
  const cycle = plan ? t(`cycle.${plan.billing_cycle}`) : null;
  const title = planName ? [planName, cycle].filter(Boolean).join(" · ") : t("band.noPlan");

  return (
    <section
      aria-label={title}
      className="flex flex-wrap items-center gap-7 rounded-card bg-zinc-950 p-6 text-white sm:p-7 dark:bg-zinc-900 dark:ring-1 dark:ring-white/10"
    >
      <DaysRing band={band} />
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-xl font-semibold">{title}</h3>
          {lane !== "none" ? (
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", TONE[lane].pill)}>
              {t(`band.${lane}.pill`, values)}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-zinc-300">{t(`band.${lane}.line`, values)}</p>
        {lane !== "none" ? <p className="text-[13px] text-zinc-400">{t(`band.${lane}.next`, values)}</p> : null}
      </div>
      {canAct ? <BandAction band={band} plan={plan} amount={amount} paying={paying} payError={payError} onPay={onPay} /> : null}
    </section>
  );
}

function BandAction({
  band,
  plan,
  amount,
  paying,
  payError,
  onPay,
}: {
  band: Band;
  plan: Plan | null;
  amount: string;
  paying: boolean;
  payError: string | null;
  onPay: () => void;
}) {
  const t = useTranslations("settings.billing.action");
  const light = "inline-flex min-h-11 items-center justify-center rounded-xs px-5 text-sm font-medium";
  if (band.action === "pay" && plan) {
    return (
      <div className="flex flex-[0_1_220px] flex-col gap-2">
        <Button type="button" onClick={onPay} disabled={paying} className={cn(light, "bg-white text-zinc-950 hover:bg-zinc-200")}>
          {paying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {band.lane === "notFound" ? t("payAgain") : t("pay", { amount })}
        </Button>
        <span className="text-center text-xs text-zinc-400">{t("payNote")}</span>
        {payError ? <span role="alert" className="text-center text-xs text-red-300">{payError}</span> : null}
      </div>
    );
  }
  if (band.action) {
    // Choosing a plan, or a payment without the plan to pay for: the Plans page.
    return (
      <DeferredNavLink href="/plans" className={cn(light, "bg-white text-zinc-950 hover:bg-zinc-200")}>
        {t("choose")}
      </DeferredNavLink>
    );
  }
  if (band.lane === "active" || band.lane === "endingSoon") {
    return (
      <DeferredNavLink href="/plans" className={cn(light, "border border-white/25 text-white hover:bg-white/10")}>
        {t("change")}
      </DeferredNavLink>
    );
  }
  return null;
}

/** Products against the cap, the price, and what has been paid so far. */
export function BillingTiles({
  overview,
  plan,
  yearly,
}: {
  overview: BillingOverview;
  plan: Plan | null;
  /** The yearly row of a monthly plan, when paying yearly saves. */
  yearly: Plan | null;
}) {
  const t = useTranslations("settings.billing.tiles");
  const { locale, digits, numClass } = useDigits();
  const { count, limit } = overview.products;
  const used = limit ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const paid = overview.paid;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <section aria-label={t("products")} className={cn(CARD, "flex flex-col gap-2.5")}>
        <p className="text-[13px] text-muted-foreground">{t("products")}</p>
        <p className={cn("text-[22px] font-semibold", numClass)}>
          {digits(count)}
          {limit !== null ? <span className="text-sm font-normal text-muted-foreground"> {t("productsOf", { limit: digits(limit) })}</span> : null}
        </p>
        {limit !== null ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className={cn("h-full rounded-full", used >= 90 ? "bg-amber-500" : "bg-blue-600")} style={{ width: `${used}%` }} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("noLimit")}</p>
        )}
      </section>
      {plan ? (
        <section aria-label={t("price")} className={cn(CARD, "flex flex-col gap-2.5")}>
          <p className="text-[13px] text-muted-foreground">{t("price")}</p>
          <p className={cn("text-[22px] font-semibold", numClass)}>
            {formatBillingAmount(plan.price, locale)}
            <span className="text-sm font-normal text-muted-foreground"> {t("perMonth")}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {plan.billing_cycle === "yearly"
              ? t("billedYearly", { charge: formatBillingAmount(chargeOf(plan), locale) })
              : yearly
                ? t("ifYearly", { price: formatBillingAmount(yearly.price, locale) })
                : null}
          </p>
        </section>
      ) : null}
      <section aria-label={t("paid")} className={cn(CARD, "flex flex-col gap-2.5")}>
        <p className="text-[13px] text-muted-foreground">{t("paid")}</p>
        <p className={cn("text-[22px] font-semibold", numClass)}>{formatBillingAmount(paid.total, locale)}</p>
        <p className="text-xs text-muted-foreground">
          {paid.count && paid.since
            ? t("paidSince", { count: paid.count, month: formatBillingMonth(paid.since, locale) })
            : t("noPayments")}
        </p>
      </section>
    </div>
  );
}

const DOT: Record<string, string> = {
  success: "border-emerald-600",
  pending: "border-sky-500",
  failed: "border-red-600",
  refunded: "border-zinc-400",
  trial: "border-zinc-400",
};

const STATUS_TEXT: Record<string, string> = {
  success: "text-emerald-700 dark:text-emerald-400",
  pending: "text-sky-700 dark:text-sky-400",
  failed: "text-red-700 dark:text-red-400",
  refunded: "text-muted-foreground",
  trial: "text-muted-foreground",
};

/** The payments to Paperbase, newest first, as a timeline. */
export function PaymentTimeline({ payments, className }: { payments: BillingPayment[]; className?: string }) {
  const t = useTranslations("settings.billing");
  const { locale, numClass } = useDigits();
  return (
    <section aria-label={t("payments.heading")} className={cn(CARD, "p-6", className)}>
      <h3 className="mb-4 text-[15px] font-semibold">{t("payments.heading")}</h3>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("payments.empty")}</p>
      ) : (
        <ol className="flex flex-col">
          {payments.map((payment, index) => {
            const state = payment.kind === "trial" ? "trial" : payment.status;
            const title =
              payment.kind === "trial"
                ? t("payments.trial")
                : [payment.plan, payment.billing_cycle ? t(`cycle.${payment.billing_cycle}`) : null].filter(Boolean).join(" · ");
            const detail = [
              formatBillingDay(payment.created_at, locale),
              // A name only where one was recorded: the checkout's own payments do not say which.
              payment.provider === "bkash" || payment.provider === "nagad" ? t(`payments.provider.${payment.provider}`) : null,
              payment.transaction_id ? t("payments.trx", { trx: payment.transaction_id }) : null,
              payment.kind === "manual" ? t("payments.recorded") : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={payment.public_id} className="flex gap-3.5">
                <div className="flex w-3 shrink-0 flex-col items-center" aria-hidden>
                  <span className={cn("size-3 shrink-0 rounded-full border-[3px] bg-background", DOT[state])} />
                  {index < payments.length - 1 ? <span className="w-0.5 flex-1 bg-border" /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-4 gap-y-1.5 pb-5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{title}</span>
                    <span className={cn("text-xs text-muted-foreground", numClass)}>{detail}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn("text-sm font-semibold", numClass)}>{formatBillingAmount(payment.amount, locale)}</span>
                    <span className={cn("text-xs font-medium", STATUS_TEXT[state])}>{t(`payments.status.${state}`)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** What the shop's plan gives, in the Plans page's words. */
export function PlanIncludes({ plan }: { plan: Plan }) {
  const t = useTranslations("settings.billing.includes");
  const tLines = useTranslations("plansPage.lines");
  const { digits } = useDigits();
  return (
    <section aria-label={t("heading")} className={cn(CARD, "flex flex-col gap-3 p-6")}>
      <h3 className="text-[15px] font-semibold">{t("heading")}</h3>
      <ul className="flex flex-col gap-2.5">
        {planLines(plan).map((line) => (
          <li key={line.id} className="flex items-start gap-2 text-[13px] text-foreground/80">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.2} aria-hidden />
            {line.count === undefined ? tLines(line.id) : tLines(line.id, { count: digits(line.count) })}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What paying yearly would save, said for next time: switching now ends the plan in force that day. */
export function YearlyCard({ planName, charge, saving }: { planName: string; charge: number; saving: number }) {
  const t = useTranslations("settings.billing.yearly");
  const { locale } = useDigits();
  return (
    <section aria-label={t("heading", { saving: formatBillingAmount(saving, locale) })} className="flex flex-col gap-2 rounded-card border border-dashed border-foreground/30 bg-card p-5">
      <p className="text-sm font-semibold">{t("heading", { saving: formatBillingAmount(saving, locale) })}</p>
      <p className="text-[13px] text-muted-foreground">
        {t("body", { charge: formatBillingAmount(charge, locale), plan: planName })}
      </p>
      <DeferredNavLink
        href="/plans?cycle=yearly"
        className="mt-1 inline-flex min-h-11 w-fit items-center rounded-xs border border-border px-4 text-sm font-medium hover:bg-muted"
      >
        {t("link")}
      </DeferredNavLink>
    </section>
  );
}
