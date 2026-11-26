"use client";

import { ArrowRight, Check, ChevronRight, MessageSquare, PackageMinus, PackageX, ShieldAlert, ShoppingCart, Star, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CourierBalance, HomeNumbers } from "@/lib/dashboard/home";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

import { TONE } from "./HomeOrdersPanel";

type Attention = HomeNumbers["attention"];

/** Each row opens the list it counts; a count that costs sales or trust is red. */
const ATTENTION_ROWS: { key: keyof Attention; label: string; href: string; Icon: LucideIcon; risk?: boolean }[] = [
  { key: "risky", label: "riskyBuyers", href: "/orders?queue=risky", Icon: ShieldAlert, risk: true },
  { key: "incomplete_checkouts", label: "incompleteCheckouts", href: "/orders/abandoned", Icon: ShoppingCart },
  { key: "messages", label: "messages", href: "/support-tickets?status=new", Icon: MessageSquare },
  { key: "reviews", label: "reviews", href: "/reviews", Icon: Star },
  { key: "out_of_stock", label: "outOfStock", href: "/inventory?stock=out_of_stock", Icon: PackageX, risk: true },
  { key: "low_stock", label: "lowStock", href: "/inventory?stock=low_stock", Icon: PackageMinus },
];

/**
 * What needs attention, each row opening its list; the rows the member may not open are left
 * out, and with nothing waiting in any of them the card just says so.
 */
export function HomeAttention({ attention }: { attention: Attention | undefined }) {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  const rows = ATTENTION_ROWS.filter((row) => attention?.[row.key] != null);
  if (!attention || rows.length === 0) return null;

  if (rows.every((row) => attention[row.key] === 0)) {
    return (
      <section className="flex items-center gap-3 rounded-card border border-card-border bg-card px-5 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-ui bg-[hsl(var(--accent-green)/0.12)] text-[hsl(var(--accent-green))]">
          <Check className="size-4" strokeWidth={2.5} aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{t("allClear")}</span>
          <span className="text-xs text-muted-foreground">{t("allClearBody")}</span>
        </span>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-card-border bg-card pb-2">
      <h2 className="px-5 pb-1.5 pt-4 text-sm font-semibold text-foreground">{t("attention")}</h2>
      <ul>
        {rows.map((row) => {
          const count = attention[row.key] ?? 0;
          const urgent = count > 0 && row.risk;
          return (
            <li key={row.key}>
              <Link href={row.href} className="group flex items-center gap-3 px-5 py-1.5 text-sm transition-colors hover:bg-muted/40">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-ui",
                    urgent ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground"
                  )}
                >
                  <row.Icon className="size-[15px]" aria-hidden />
                </span>
                <span className={cn("min-w-0 flex-1 truncate", count === 0 ? "text-muted-foreground" : "text-foreground")}>
                  {t(row.label)}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    numberTextClass(locale),
                    count === 0 ? "font-normal text-muted-foreground/70" : row.risk ? TONE.risk : "text-foreground"
                  )}
                >
                  {toLocaleDigits(String(count), locale)}
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The money Steadfast holds for the shop, for the owner and Admins (undefined for anyone else);
 * where no courier is connected, the way to connect one.
 */
export function HomeCourier({ courier, flow }: { courier: CourierBalance | undefined; flow: HomeNumbers["flow"] | undefined }) {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  if (!courier) return null;

  if (courier.state === "not_connected") {
    return (
      <section className="flex flex-col gap-1.5 rounded-card border border-card-border bg-card px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{t("courier")}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("connectCourierBody")}</p>
        <Link href="/settings?tab=integrations" className="mt-1 inline-flex items-center gap-1 self-start text-sm font-medium text-foreground hover:underline">
          {t("connectCourier")}
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-1 rounded-card border border-card-border bg-card px-5 py-4">
      <h2 className="flex items-center justify-between text-sm font-semibold text-foreground">
        {t("courier")}
        <span className="text-xs font-normal text-muted-foreground">Steadfast</span>
      </h2>
      {courier.state === "ok" ? (
        <>
          <p className={cn("mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground", numberTextClass(locale))}>
            ৳{toLocaleDigits(Math.round(Number(courier.amount)).toLocaleString("en-US"), locale)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("courierNote")}
            {flow && flow.in_transit.count > 0 ? (
              <> · {t("courierOnTheWay", { count: flow.in_transit.count })}</>
            ) : null}
          </p>
        </>
      ) : (
        <p className={cn("mt-1 text-sm", courier.state === "unauthorized" ? TONE.risk : "text-muted-foreground")}>
          {courier.state === "unauthorized" ? t("courierUnauthorized") : t("courierUnavailable")}
        </p>
      )}
    </section>
  );
}
