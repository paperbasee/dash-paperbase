"use client";

import { ArrowRight, Check } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { HomeNumbers, WaitingStep } from "@/lib/dashboard/home";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

import { TONE } from "./HomeOrdersPanel";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The three steps an order waits at for the merchant, darkest first, as the bar splits them. */
const SWATCH = {
  pending: "bg-[hsl(var(--accent-blue))]",
  payment: "bg-[hsl(var(--accent-blue)/0.55)]",
  send: "bg-[hsl(var(--accent-blue)/0.25)]",
};

/**
 * "Right now" (owner's pick of 2026-11-26, like Google Analytics' realtime card): how many orders
 * wait for the merchant, split by step with how long each step's oldest has waited, then where
 * the rest are. These do not follow the period switch, and a new order moves them at once.
 */
export function HomeRightNow({ flow, now }: { flow: NonNullable<HomeNumbers["flow"]>; now: number }) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const format = useFormatter();
  const locale = useLocale();
  const digits = (n: number) => toLocaleDigits(String(n), locale);
  const waiting = flow.pending.count + flow.payment_pending.count + flow.to_send.count;
  const moving = flow.in_transit.count + flow.delivered_today.count + flow.returned_recently.count;

  const waited = (step: WaitingStep) => {
    if (!step.oldest_at) return { text: "", tone: "" };
    const since = new Date(step.oldest_at);
    return {
      text: t("oldest", { when: format.relativeTime(since, now) }),
      tone: now - since.getTime() >= DAY_MS ? TONE.late : "text-muted-foreground",
    };
  };

  const steps = [
    { key: "pending", href: "/orders?status=pending", name: tPages("orderStatusPending"), step: flow.pending, swatch: SWATCH.pending },
    {
      key: "payment",
      href: "/orders?status=payment_pending",
      name: tPages("orderStatusPaymentPending"),
      step: flow.payment_pending,
      swatch: SWATCH.payment,
    },
    {
      key: "send",
      href: "/orders?status=confirmed&delivery_status=not_dispatched",
      name: t("flowToSend"),
      step: flow.to_send,
      swatch: SWATCH.send,
    },
  ].filter((row) => row.step.count > 0);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-card border border-card-border bg-card">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{t("rightNow")}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--accent-green))]">
          <span className="pb-live-dot size-[7px] rounded-full bg-[hsl(var(--accent-green))]" aria-hidden />
          {t("live")}
        </span>
      </div>

      {waiting > 0 ? (
        <div className="flex flex-col gap-3 px-5 pb-4 pt-2">
          <p className="flex items-baseline gap-2">
            <span className={cn("text-[2rem] font-semibold leading-none tracking-tight text-foreground", numberTextClass(locale))}>
              {digits(waiting)}
            </span>
            <span className="text-sm text-muted-foreground">{t("waitForYou", { count: waiting })}</span>
          </p>
          <span className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {steps.map((row) => (
              <span key={row.key} className={row.swatch} style={{ flex: row.step.count }} />
            ))}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 pb-4 pt-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent-green)/0.12)] text-[hsl(var(--accent-green))]">
            <Check className="size-[18px]" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{t("nothingWaits")}</span>
            {moving === 0 ? <span className="text-xs text-muted-foreground">{t("nothingWaitsBody")}</span> : null}
          </span>
        </div>
      )}

      {steps.map((row) => {
        const note = waited(row.step);
        return (
          <Link
            key={row.key}
            href={row.href}
            className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border-subtle px-5 py-2.5 transition-colors hover:bg-muted/40"
          >
            <span className={cn("size-2 rounded-[2px]", row.swatch)} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{row.name}</span>
              {note.text ? <span className={cn("block truncate text-xs", note.tone)}>{note.text}</span> : null}
            </span>
            <span className={cn("text-sm font-semibold text-foreground", numberTextClass(locale))}>{digits(row.step.count)}</span>
          </Link>
        );
      })}

      {moving > 0 ? (
        <div className={cn("flex flex-col py-1.5", steps.length > 0 && "mt-1 border-t border-dashed border-border")}>
          <Link
            href={flow.in_transit.stuck ? "/orders?queue=stuck" : "/orders?delivery_status=in_transit"}
            className="flex items-center justify-between gap-3 px-5 py-1.5 text-sm transition-colors hover:bg-muted/40"
          >
            <span className="min-w-0 truncate text-foreground">
              {t("flowOnTheWay")}
              {flow.in_transit.stuck ? (
                <span className={cn("ml-1.5 text-xs", TONE.risk)}>{t("stuckShort", { count: digits(flow.in_transit.stuck) })}</span>
              ) : null}
            </span>
            <span className={cn("font-semibold text-foreground", numberTextClass(locale))}>{digits(flow.in_transit.count)}</span>
          </Link>
          <Link href="/orders?queue=delivered_today" className="flex items-center justify-between gap-3 px-5 py-1.5 text-sm transition-colors hover:bg-muted/40">
            <span className="text-foreground">{t("flowDeliveredToday")}</span>
            <span className={cn("font-semibold text-foreground", numberTextClass(locale))}>{digits(flow.delivered_today.count)}</span>
          </Link>
          <Link href="/orders?queue=returned_recently" className="flex items-center justify-between gap-3 px-5 py-1.5 text-sm transition-colors hover:bg-muted/40">
            <span className="text-foreground">
              {t("flowReturned")} <span className="text-xs text-muted-foreground">{t("lastSevenDaysShort")}</span>
            </span>
            <span className={cn("font-semibold text-foreground", numberTextClass(locale))}>{digits(flow.returned_recently.count)}</span>
          </Link>
        </div>
      ) : null}

      <Link
        href="/orders"
        className="mt-auto flex items-center gap-1 border-t border-border-subtle px-5 py-3 text-sm font-medium text-foreground hover:underline"
      >
        {t("openOrderList")}
        <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
      </Link>
    </section>
  );
}
