"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOrdersQuery } from "@/hooks/useOrdersQuery";
import { formatDashboardTime } from "@/lib/datetime-display";
import { orderStatusBadgeClass } from "@/lib/dashboard/order-status-badge";
import { formatOrderStatusLabel } from "@/lib/orders/order-statuses";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { useBranding } from "@/context/BrandingContext";
import type { OrdersListParams } from "@/lib/query-keys";
import type { Order } from "@/types";

interface DashboardOrdersLogProps {
  recentOrders?: Order[];
}

export default function DashboardOrdersLog({
  recentOrders,
}: DashboardOrdersLogProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tPages = useTranslations("pages");
  const { currencySymbol } = useBranding();
  const numClass = numberTextClass(locale);

  const [filter, setFilter] = useState("");
  const debouncedFilter = useDebouncedValue(filter, 300);

  const listParams = useMemo((): OrdersListParams => {
    const q = debouncedFilter.trim();
    return q ? { search: q } : {};
  }, [debouncedFilter]);

  const { data, isLoading } = useOrdersQuery(listParams, {
    enabled: Boolean(debouncedFilter.trim()),
  });
  const searched = debouncedFilter.trim() ? (data?.results ?? []).slice(0, 8) : null;
  const orders = searched ?? (recentOrders ?? []).slice(0, 8);

  return (
    <DashboardSection
      title={t("ordersLog")}
      accentClass="bg-[hsl(var(--chart-orders))]"
      action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative min-w-[180px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("ordersLogFilterPlaceholder")}
              className="h-8 pl-8 text-sm"
              aria-label={t("ordersLogFilterAria")}
            />
          </div>
          <Button size="sm" className="h-8 gap-1" asChild>
            <DeferredNavLink href="/orders/new">
              <Plus className="size-3.5" aria-hidden />
              {t("newOrder")}
            </DeferredNavLink>
          </Button>
        </div>
      }
      contentClassName="overflow-x-auto"
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5 sm:px-5">{t("ordersLogColId")}</th>
            <th className="px-4 py-2.5">{t("ordersLogColTime")}</th>
            <th className="px-4 py-2.5">{t("ordersLogColCustomer")}</th>
            <th className="px-4 py-2.5">{t("ordersLogColItems")}</th>
            <th className="px-4 py-2.5">{t("ordersLogColAmount")}</th>
            <th className="px-4 py-2.5">{t("ordersLogColStatus")}</th>
            <th className="px-4 py-2.5">{t("ordersLogColSource")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {isLoading && orders.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground sm:px-5">
                {t("loading")}
              </td>
            </tr>
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground sm:px-5">
                {t("ordersLogEmpty")}
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.public_id} className="hover:bg-muted/30">
                <td className="px-4 py-3 sm:px-5">
                  <DeferredNavLink
                    href={`/orders/${order.public_id}`}
                    className={`font-medium text-primary hover:underline ${numClass}`}
                  >
                    #{order.order_number}
                  </DeferredNavLink>
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-muted-foreground ${numClass}`}>
                  {formatDashboardTime(order.created_at, locale)}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3">
                  {order.shipping_name?.trim() || order.email || t("guestCustomer")}
                </td>
                <td className={`px-4 py-3 ${numClass}`}>
                  {toLocaleDigits(
                    String(order.items_count ?? order.items?.length ?? 0),
                    locale
                  )}
                </td>
                <td className={`px-4 py-3 font-medium text-[hsl(var(--chart-products))] ${numClass}`}>
                  {currencySymbol}
                  {toLocaleDigits(order.total, locale)}
                </td>
                <td className="px-4 py-3">
                  <span className={orderStatusBadgeClass(order.status)}>
                    {formatOrderStatusLabel(order.status, (key) => tPages(key)).toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">web</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t border-border/60 px-4 py-2 sm:px-5">
        <DeferredNavLink
          href="/orders"
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("viewAllOrders")}
        </DeferredNavLink>
      </div>
    </DashboardSection>
  );
}
