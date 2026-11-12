"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CourierBalance, HomeNumbers } from "@/lib/dashboard/home";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

import { TONE } from "./HomeOrdersPanel";

type Attention = HomeNumbers["attention"];

/** Each row opens the list it counts; a count that costs sales or trust is red. */
const ATTENTION_ROWS: { key: keyof Attention; label: string; href: string; risk?: boolean }[] = [
  { key: "risky", label: "riskyBuyers", href: "/orders?queue=risky", risk: true },
  { key: "incomplete_checkouts", label: "incompleteCheckouts", href: "/orders/abandoned" },
  { key: "messages", label: "messages", href: "/support-tickets?status=new" },
  { key: "reviews", label: "reviews", href: "/reviews" },
  { key: "out_of_stock", label: "outOfStock", href: "/inventory?stock=out_of_stock", risk: true },
  { key: "low_stock", label: "lowStock", href: "/inventory?stock=low_stock" },
];

interface HomeSidePanelProps {
  attention: Attention | undefined;
  flow: HomeNumbers["flow"] | undefined;
  /** The courier's money, for the owner and Admins; undefined when not theirs to see. */
  courier: CourierBalance | undefined;
}

/** What needs attention, and the money the courier holds -- each shown when it is the member's. */
export function HomeSidePanel({ attention, flow, courier }: HomeSidePanelProps) {
  const rows = ATTENTION_ROWS.filter((row) => attention?.[row.key] != null);
  const showCourier = courier !== undefined && courier.state !== "not_connected";
  if (rows.length === 0 && !showCourier) return null;

  return (
    <aside className="min-w-0 overflow-hidden rounded-card border border-card-border bg-card">
      {rows.length > 0 ? <NeedsAttention attention={attention!} rows={rows} /> : null}
      {showCourier ? (
        <CourierMoney courier={courier} flow={flow} className={rows.length > 0 ? "border-t border-border-subtle" : ""} />
      ) : null}
    </aside>
  );
}

function NeedsAttention({ attention, rows }: { attention: Attention; rows: typeof ATTENTION_ROWS }) {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  return (
    <section className="px-4 py-4 sm:px-5">
      <h2 className="text-sm font-semibold text-foreground">{t("attention")}</h2>
      <ul className="mt-1.5">
        {rows.map((row) => {
          const count = attention[row.key] ?? 0;
          return (
            <li key={row.key} className="border-b border-border-subtle last:border-b-0">
              <Link href={row.href} className="group flex items-center gap-2.5 py-2.5 text-sm text-foreground">
                <span className="min-w-0 flex-1 truncate group-hover:underline">{t(row.label)}</span>
                <span
                  className={cn(
                    "font-semibold",
                    numberTextClass(locale),
                    count === 0 ? "font-normal text-muted-foreground/70" : row.risk ? TONE.risk : "text-foreground"
                  )}
                >
                  {toLocaleDigits(String(count), locale)}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CourierMoney({
  courier,
  flow,
  className,
}: {
  courier: CourierBalance;
  flow: HomeNumbers["flow"] | undefined;
  className: string;
}) {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  const digits = (n: number) => toLocaleDigits(String(n), locale);
  const parcels = flow
    ? [
        { key: "transit", label: t("flowOnTheWay"), value: flow.in_transit.count },
        { key: "delivered", label: t("courierDelivered"), value: flow.delivered_today.count },
        { key: "returned", label: t("flowReturned"), value: flow.returned_recently.count },
      ]
    : [];

  return (
    <section className={cn("px-4 py-4 sm:px-5", className)}>
      <h2 className="text-sm font-semibold text-foreground">{t("courier")}</h2>
      {courier.state === "ok" ? (
        <>
          <p className={cn("mt-2.5 text-3xl font-semibold leading-tight tracking-tight text-foreground", numberTextClass(locale))}>
            ৳{toLocaleDigits(Math.round(Number(courier.amount)).toLocaleString("en-US"), locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("courierNote")}</p>
        </>
      ) : (
        <p className={cn("mt-2 text-sm", courier.state === "unauthorized" ? TONE.risk : "text-muted-foreground")}>
          {courier.state === "unauthorized" ? t("courierUnauthorized") : t("courierUnavailable")}
        </p>
      )}
      {parcels.length > 0 ? (
        <dl className="mt-4 grid grid-cols-3 gap-px border-t border-border-subtle bg-border-subtle">
          {parcels.map((parcel) => (
            <div key={parcel.key} className="flex flex-col gap-0.5 bg-card pt-3 [&:not(:first-child)]:pl-3.5">
              <dt className="truncate text-xs text-muted-foreground">{parcel.label}</dt>
              <dd className={cn("text-base font-semibold text-foreground", numberTextClass(locale))}>{digits(parcel.value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {flow && flow.in_transit.stuck > 0 ? (
        <Link href="/orders?queue=stuck" className={cn("mt-3.5 flex items-center gap-1.5 text-xs hover:underline", TONE.risk)}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {t("stuck", { count: digits(flow.in_transit.stuck) })}
        </Link>
      ) : null}
    </section>
  );
}
