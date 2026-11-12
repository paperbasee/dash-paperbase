"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
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

const SHOWN = 8;
const DHAKA = "Asia/Dhaka";

/** The list's status filters; "unconfirmed" is pending and payment pending, as the panel counts them. */
const FILTERS = ["", "unconfirmed", "confirmed", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  payment_pending: "bg-transparent ring-[1.5px] ring-inset ring-amber-500",
  confirmed: "bg-emerald-600 dark:bg-emerald-500",
  cancelled: "bg-foreground/30",
};

interface HomeLatestOrdersProps {
  /** The period the home page's switch picks, as the API takes it. */
  startDate: string;
  endDate: string;
  summary: DashboardAnalyticsSummary | null;
}

/** The newest orders placed in the period, filtered by where they stand. */
export function HomeLatestOrders({ startDate, endDate, summary }: HomeLatestOrdersProps) {
  const t = useTranslations("dashboard.home");
  const tPages = useTranslations("pages");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("");

  const params: Record<string, string> = { created_from: startDate, created_to: endDate };
  if (filter) params.status = filter;
  const { data, isLoading } = useOrdersQuery(params);
  const rows = (data?.results ?? []).slice(0, SHOWN);
  const total = data?.count ?? 0;

  const filterCount: Record<Filter, number | undefined> = {
    "": summary?.orders,
    unconfirmed: summary?.pending,
    confirmed: summary?.confirmed,
    cancelled: summary?.cancelled,
  };
  const filterLabel: Record<Filter, string> = {
    "": t("all"),
    unconfirmed: tPages("orderStatusPending"),
    confirmed: tPages("orderStatusConfirmed"),
    cancelled: tPages("orderStatusCancelled"),
  };
  const digits = (n: number) => toLocaleDigits(String(n), locale);

  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-card-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">{t("latest")}</h2>
        <div
          className="flex max-w-full gap-0.5 overflow-x-auto rounded-ui bg-muted/50 p-0.5 ring-1 ring-inset ring-border-subtle"
          role="tablist"
          aria-label={t("latest")}
        >
          {FILTERS.map((value) => {
            const on = value === filter;
            const count = filterCount[value];
            return (
              <button
                key={value || "all"}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(value)}
                className={cn(
                  "whitespace-nowrap rounded-[2px] px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "bg-card font-medium text-foreground shadow-xs ring-1 ring-border-subtle"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filterLabel[value]}
                {count !== undefined ? (
                  <span className={cn("ml-1", on ? "text-muted-foreground" : "text-muted-foreground/70")}>{digits(count)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="hidden h-9 grid-cols-[76px_64px_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_88px_14px] items-center gap-4 border-y border-border-subtle px-5 text-xs text-muted-foreground md:grid">
          <span>{t("colTime")}</span>
          <span>{t("colOrder")}</span>
          <span>{t("colBuyer")}</span>
          <span>{t("colPayment")}</span>
          <span>{t("colStatus")}</span>
          <span className="text-right">{t("colAmount")}</span>
          <span />
        </div>
        {rows.map((order) => (
          <LatestOrderRow key={order.public_id} order={order} />
        ))}
        {!isLoading && rows.length === 0 ? (
          <p className="border-t border-border-subtle px-5 py-10 text-center text-sm text-muted-foreground md:border-t-0">
            {t("noOrders")}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 sm:px-5">
        <span className="text-xs text-muted-foreground">
          {total > 0 ? t("shown", { shown: digits(rows.length), total: digits(total) }) : null}
        </span>
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline">
          {t("viewAll")}
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
        </Link>
      </div>
    </section>
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

  return (
    <Link
      href={`/orders/${order.public_id}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-border-subtle px-4 py-3 transition-colors first:border-t-0 hover:bg-muted/40 sm:px-5 md:h-[54px] md:grid-cols-[76px_64px_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_88px_14px] md:items-center md:gap-4 md:border-t-0 md:border-b md:py-0 md:last:border-b-0"
    >
      <span className={cn("hidden text-sm text-muted-foreground md:block", numberTextClass(locale))}>{time}</span>
      <span className={cn("hidden text-sm font-medium text-foreground md:block", numberTextClass(locale))}>
        #{toLocaleDigits(order.order_number, locale)}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
          <span className="truncate">{order.shipping_name}</span>
          {risk ? (
            <span className={cn("shrink-0 text-[11px] font-medium", risk === "risky" ? TONE.risk : TONE.late)}>
              {risk === "risky" ? t("riskRisky") : t("riskNew")}
            </span>
          ) : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{order.district}</span>
      </span>
      <span className="order-3 truncate text-sm text-muted-foreground md:order-none">
        {provider ? (
          <>
            <span className="font-medium text-foreground">{formatPaymentProviderLabel(provider, (key) => tPages(key))}</span>
            {", "}
            <span className={paid ? TONE.good : TONE.late}>{paid ? t("paymentPaid") : t("paymentWaiting")}</span>
          </>
        ) : (
          t("cod")
        )}
      </span>
      <span
        className={cn(
          "order-4 inline-flex items-center gap-2 justify-self-end whitespace-nowrap text-sm md:order-none md:justify-self-start",
          order.status === "cancelled" ? "text-muted-foreground" : "text-foreground"
        )}
      >
        <span className={cn("size-[7px] shrink-0 rounded-full", STATUS_DOT[order.status] ?? "bg-foreground/30")} aria-hidden />
        {formatOrderStatusLabel(order.status, (key) => tPages(key))}
      </span>
      <span className={cn("order-2 text-right text-sm font-medium text-foreground md:order-none", numberTextClass(locale))}>
        {amount}
      </span>
      <ChevronRight className="hidden size-3.5 text-muted-foreground/60 md:block" aria-hidden />
    </Link>
  );
}
