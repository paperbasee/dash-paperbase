"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { User } from "lucide-react";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { numberTextClass } from "@/lib/number-font";
import { formatOrderPaymentStatusLabel } from "@/lib/orders/payment-statuses";
import { formatOrderStatusLabel } from "@/lib/orders/order-statuses";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";
import { OrderPreviewLineItem } from "./OrderPreviewLineItem";
import { OrderPreviewShippingAddress } from "./OrderPreviewShippingAddress";

type OrderPreviewContentProps = {
  order: Order | null;
  loading: boolean;
  error: string | null;
  currencySymbol: string;
};

function PreviewSection({
  title,
  children,
  className,
  style,
  compact,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}) {
  return (
    <section
      className={cn("w-full", compact ? "space-y-2" : "space-y-3", className)}
      style={style}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function OrderPreviewBody({
  order,
  currencySymbol,
}: {
  order: Order;
  currencySymbol: string;
}) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");

  const items = order.items ?? [];
  const subtotalBefore = Number(order.subtotal_before_discount || 0);
  const discountTotal = Number(order.discount_total || 0);
  const shippingCost = Number(order.shipping_cost || 0);
  const total = Number(order.total || 0);

  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [productSectionMaxHeight, setProductSectionMaxHeight] = useState<number | undefined>();

  useEffect(() => {
    const leftColumn = leftColumnRef.current;
    if (!leftColumn) return;

    const syncHeight = () => {
      const isWide = window.matchMedia("(min-width: 768px)").matches;
      setProductSectionMaxHeight(isWide ? leftColumn.offsetHeight : undefined);
    };

    syncHeight();
    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(leftColumn);
    window.addEventListener("resize", syncHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [order.public_id, items.length, subtotalBefore, discountTotal, shippingCost]);

  const productSectionStyle: CSSProperties | undefined =
    productSectionMaxHeight != null
      ? ({ "--product-section-max-h": `${productSectionMaxHeight}px` } as CSSProperties)
      : undefined;

  const hasSyncedProductHeight = productSectionMaxHeight != null;

  return (
    <div className="flex min-h-0 flex-col gap-4 md:gap-5">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-ui bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-foreground">
          {formatOrderStatusLabel(order.status, (key) => tPages(key))}
        </span>
        <span className="inline-flex items-center rounded-ui bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
          {formatOrderPaymentStatusLabel(order.payment_status, (key) => tPages(key))}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDashboardDateTime(order.created_at, locale)}
        </span>
      </div>

      <div className="grid min-h-0 gap-4 md:grid-cols-12 md:items-start md:gap-5">
        <div
          ref={leftColumnRef}
          className="order-2 flex min-h-0 flex-col gap-4 md:order-1 md:col-span-6"
        >
          <PreviewSection title={tPages("orderDetailCustomerTitle")} compact>
            <div className="space-y-3 rounded-card border border-border/70 bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-muted">
                  <User className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-medium text-foreground">{order.shipping_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{order.phone || "—"}</p>
                  {order.email ? (
                    <p className="text-sm text-muted-foreground break-all">{order.email}</p>
                  ) : null}
                </div>
              </div>
              <OrderPreviewShippingAddress
                shippingAddress={order.shipping_address}
                district={order.district}
              />
            </div>
          </PreviewSection>

          <PreviewSection title={tPages("orderDetailPaymentTitle")} compact>
            <dl className="space-y-1.5 rounded-card border border-border/70 bg-muted/20 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{tPages("orderDetailSubtotalBeforeDiscount")}</dt>
                <dd className={numClass}>
                  {currencySymbol}
                  {subtotalBefore.toLocaleString()}
                </dd>
              </div>
              {discountTotal > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{tPages("orderDetailDiscount")}</dt>
                  <dd className={numClass}>
                    −{currencySymbol}
                    {discountTotal.toLocaleString()}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{tPages("orderDetailShippingCost")}</dt>
                <dd className={numClass}>
                  {shippingCost > 0
                    ? `${currencySymbol}${shippingCost.toLocaleString()}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold text-foreground">
                <dt>{tPages("orderDetailTotal")}</dt>
                <dd className={numClass}>
                  {currencySymbol}
                  {total.toLocaleString()}
                </dd>
              </div>
            </dl>
          </PreviewSection>
        </div>

        <PreviewSection
          title={tPages("orderDetailProductCardTitle")}
          compact
          style={productSectionStyle}
          className={cn(
            "order-1 min-h-0 w-full md:order-2 md:col-span-6",
            hasSyncedProductHeight && "md:flex md:max-h-[var(--product-section-max-h)] md:flex-col",
          )}
        >
          {items.length === 0 ? (
            <p className="rounded-card border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              {tPages("orderDetailNoLineItems")}
            </p>
          ) : (
            <ul
              className={cn(
                "w-full space-y-2",
                hasSyncedProductHeight &&
                  "md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1 [scrollbar-width:thin] md:[&::-webkit-scrollbar]:w-1.5",
              )}
            >
              {items.map((item) => (
                <OrderPreviewLineItem
                  key={item.public_id}
                  item={item}
                  currencySymbol={currencySymbol}
                />
              ))}
            </ul>
          )}
        </PreviewSection>
      </div>
    </div>
  );
}

export function OrderPreviewContent({
  order,
  loading,
  error,
  currencySymbol,
}: OrderPreviewContentProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-20 animate-pulse rounded-ui bg-muted/60" />
          <div className="h-6 w-24 animate-pulse rounded-ui bg-muted/60" />
        </div>
        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          <div className="order-2 space-y-3 md:order-1 md:col-span-6">
            <div className="h-24 animate-pulse rounded-card border border-border bg-muted/40" />
            <div className="h-20 animate-pulse rounded-card border border-border bg-muted/40" />
          </div>
          <div className="order-1 space-y-2 md:order-2 md:col-span-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-card border border-border bg-muted/40"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!order) {
    return null;
  }

  return <OrderPreviewBody order={order} currencySymbol={currencySymbol} />;
}
