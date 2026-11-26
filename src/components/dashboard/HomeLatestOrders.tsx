"use client";

import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import { useBranding } from "@/context/BrandingContext";
import { useOrdersQuery } from "@/hooks/useOrdersQuery";
import { Link } from "@/i18n/navigation";
import type { DashboardAnalyticsSummary } from "@/lib/basicAnalyticsService";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { formatOrderStatusLabel } from "@/lib/orders/order-statuses";
import { formatPaymentProviderLabel } from "@/lib/orders/payment-statuses";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";
import { todayYmdInBD } from "@/utils/time";

import { TONE } from "./HomeOrdersPanel";

const SHOWN = 6;
const DHAKA = "Asia/Dhaka";

/** The list's status filters; "unconfirmed" is pending and payment pending, as the overview counts them. */
export const LATEST_FILTERS = ["", "unconfirmed", "confirmed", "cancelled"] as const;
export type LatestFilter = (typeof LATEST_FILTERS)[number];

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  payment_pending: "bg-transparent ring-[1.5px] ring-inset ring-amber-500",
  confirmed: "bg-emerald-600 dark:bg-emerald-500",
  cancelled: "bg-foreground/30",
};

/** Soft tints for a buyer's initials, chosen by the name so a buyer keeps theirs. */
const FACE_TINTS = [
  "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
];

/** A buyer's initials: the first letter of their first two words. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

function tintFor(name: string): string {
  let sum = 0;
  for (const ch of name) sum = (sum + ch.codePointAt(0)!) % 997;
  return FACE_TINTS[sum % FACE_TINTS.length];
}

interface HomeLatestOrdersProps {
  /** The period the home page's switch picks, as the API takes it. */
  startDate: string;
  endDate: string;
  summary: DashboardAnalyticsSummary | null;
  filter: LatestFilter;
  onFilterChange: (filter: LatestFilter) => void;
  /** The shop's address, for a period with no orders; "" while unknown. */
  shopUrl: string;
}

/** The newest orders placed in the period, filtered by where they stand. */
export function HomeLatestOrders({ startDate, endDate, summary, filter, onFilterChange, shopUrl }: HomeLatestOrdersProps) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const locale = useLocale();

  const params: Record<string, string> = { created_from: startDate, created_to: endDate };
  if (filter) params.status = filter;
  const { data, isLoading } = useOrdersQuery(params);
  const rows = (data?.results ?? []).slice(0, SHOWN);
  const total = data?.count ?? 0;

  const filterCount: Record<LatestFilter, number | undefined> = {
    "": summary?.orders,
    unconfirmed: summary?.pending,
    confirmed: summary?.confirmed,
    cancelled: summary?.cancelled,
  };
  const filterLabel: Record<LatestFilter, string> = {
    "": t("all"),
    unconfirmed: tPages("orderStatusPending"),
    confirmed: tPages("orderStatusConfirmed"),
    cancelled: tPages("orderStatusCancelled"),
  };
  const digits = (n: number) => toLocaleDigits(String(n), locale);

  return (
    <section id="latest-orders" className="min-w-0 scroll-mt-6 overflow-hidden rounded-card border border-card-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">{t("latest")}</h2>
        <div className="flex max-w-full gap-1 overflow-x-auto" role="tablist" aria-label={t("latest")}>
          {LATEST_FILTERS.map((value) => {
            const on = value === filter;
            const count = filterCount[value];
            return (
              <button
                key={value || "all"}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onFilterChange(value)}
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-colors",
                  on ? "bg-foreground text-background" : "border border-border-subtle text-muted-foreground hover:text-foreground"
                )}
              >
                {filterLabel[value]}
                {count !== undefined ? <span className={cn("ml-1", numberTextClass(locale), on ? "opacity-70" : "")}>{digits(count)}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="hidden h-9 grid-cols-[72px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_72px_88px] items-center gap-4 border-y border-border-subtle bg-muted/30 px-5 text-xs text-muted-foreground md:grid">
          <span>{t("colOrder")}</span>
          <span>{t("colBuyer")}</span>
          <span>{t("colPayment")}</span>
          <span>{t("colStatus")}</span>
          <span>{t("colTime")}</span>
          <span className="text-right">{t("colAmount")}</span>
        </div>
      ) : null}
      {rows.map((order) => (
        <LatestOrderRow key={order.public_id} order={order} />
      ))}
      {!isLoading && rows.length === 0 ? <NoOrders shopUrl={shopUrl} /> : null}

      <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 sm:px-5">
        <span className="text-xs text-muted-foreground">
          {total > 0 ? t("shown", { shown: digits(rows.length), total: digits(total) }) : null}
        </span>
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline">
          {t("viewAll")}
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/** No orders in the period: the shop's address, to open or copy. */
function NoOrders({ shopUrl }: { shopUrl: string }) {
  const t = useTranslations("dashboard.home");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="mx-4 my-4 flex flex-wrap items-center justify-between gap-4 rounded-card border border-dashed border-border px-5 py-5 sm:mx-5">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{t("noOrders")}</span>
        {shopUrl ? <span className="truncate text-xs text-muted-foreground">{t("shopIsLive", { url: shopUrl.replace(/^https?:\/\//, "") })}</span> : null}
      </span>
      {shopUrl ? (
        <span className="flex gap-2">
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-ui border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t("openShop")}
          </a>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(shopUrl).then(() => setCopied(true))}
            className="inline-flex h-8 items-center gap-1.5 rounded-ui border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? t("copied") : t("copyLink")}
          </button>
        </span>
      ) : null}
    </div>
  );
}

function LatestOrderRow({ order }: { order: Order }) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const locale = useLocale();
  const format = useFormatter();
  const { currencySymbol } = useBranding();

  const placed = new Date(order.created_at);
  // Today's orders by the clock; older ones by the day, both in Dhaka.
  const time = todayYmdInBD(placed) === todayYmdInBD()
    ? format.dateTime(placed, { hour: "numeric", minute: "2-digit", timeZone: DHAKA })
    : format.dateTime(placed, { day: "numeric", month: "short", timeZone: DHAKA });

  const provider = (order.payment_provider || "").toLowerCase();
  const paid = order.payment_status === "verified";
  const amount = `${currencySymbol}${toLocaleDigits(Number(order.total).toLocaleString("en-US"), locale)}`;
  const risk = order.fraud_risk === "risky" ? "risky" : order.fraud_risk === "new" ? "new" : null;
  const payment = provider ? (
    <>
      {formatPaymentProviderLabel(provider, (key) => tPages(key))}
      {" · "}
      <span className={paid ? TONE.good : TONE.late}>{paid ? t("paymentPaid") : t("paymentWaiting")}</span>
    </>
  ) : (
    t("cod")
  );
  const status = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs",
        order.status === "cancelled" ? "text-muted-foreground" : "text-foreground"
      )}
    >
      <span className={cn("size-[7px] shrink-0 rounded-full", STATUS_DOT[order.status] ?? "bg-foreground/30")} aria-hidden />
      {formatOrderStatusLabel(order.status, (key) => tPages(key))}
    </span>
  );

  return (
    <Link
      href={`/orders/${order.public_id}`}
      className="flex items-center gap-3 border-t border-border-subtle px-4 py-3 transition-colors first:border-t-0 hover:bg-muted/40 sm:px-5 md:grid md:h-[56px] md:grid-cols-[72px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_72px_88px] md:gap-4 md:py-0 md:first:border-t-0"
    >
      <span className={cn("hidden text-sm font-medium text-foreground md:block", numberTextClass(locale))}>
        #{toLocaleDigits(order.order_number, locale)}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold md:size-7", tintFor(order.shipping_name || ""))}
          aria-hidden
        >
          {initials(order.shipping_name || "")}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="truncate">{order.shipping_name}</span>
            {risk ? (
              <span className={cn("shrink-0 text-[11px] font-medium", risk === "risky" ? TONE.risk : TONE.late)}>
                {risk === "risky" ? t("riskRisky") : t("riskNew")}
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground md:hidden">
            #{toLocaleDigits(order.order_number, locale)} · {time} · {payment}
          </span>
          <span className="hidden truncate text-xs text-muted-foreground md:block">{order.district}</span>
        </span>
      </span>
      <span className="hidden truncate text-sm text-muted-foreground md:block">{payment}</span>
      <span className="hidden md:block">{status}</span>
      <span className={cn("hidden text-sm text-muted-foreground md:block", numberTextClass(locale))}>{time}</span>
      <span className="flex shrink-0 flex-col items-end gap-1 md:block md:text-right">
        <span className={cn("text-sm font-medium text-foreground", numberTextClass(locale))}>{amount}</span>
        <span className="md:hidden">{status}</span>
      </span>
    </Link>
  );
}
