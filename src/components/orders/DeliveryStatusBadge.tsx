"use client";

import { useTranslations } from "next-intl";

import { DELIVERY_STATUS_TONE, formatOrderDeliveryStatusLabel } from "@/lib/orders/delivery-statuses";

/** An order's delivery status as a coloured badge, in the page's language. */
export function DeliveryStatusBadge({ status, nowrap = false }: { status: string | null | undefined; nowrap?: boolean }) {
  const tPages = useTranslations("pages");
  const value = (status || "unknown").toLowerCase();
  const label = formatOrderDeliveryStatusLabel(value, (key) => tPages(key));
  return (
    <span
      className={`inline-flex items-center rounded-ui px-2 py-0.5 text-xs font-medium${nowrap ? " whitespace-nowrap" : ""} ${
        DELIVERY_STATUS_TONE[value] ?? DELIVERY_STATUS_TONE.unknown
      }`}
      aria-label={tPages("orderDeliveryStatusAria", { status: label })}
    >
      {label}
    </span>
  );
}
