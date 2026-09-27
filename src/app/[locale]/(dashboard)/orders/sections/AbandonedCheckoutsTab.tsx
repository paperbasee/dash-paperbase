"use client";

// People who nearly bought.
//
// The one list in the dashboard whose purpose is a phone call. Each row is
// somebody who filled in a checkout form, gave a number, and stopped — so the
// phone is the first thing on it and everything else is context for the call.
//
// Read-only, and it empties itself: if the call works and they order, the row
// leaves on its own.

import { useEffect, useMemo, useState } from "react";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { useLocale, useTranslations } from "next-intl";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { useFilters } from "@/hooks/useFilters";
import { useAbandonedCheckoutsQuery } from "@/hooks/useAbandonedCheckoutsQuery";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { notify } from "@/notifications";
import type { AbandonedCheckout } from "@/types";
import type { CustomersListParams } from "@/lib/query-keys";

function valueDisplay(row: AbandonedCheckout): string {
  const number = Number(row.value ?? "0");
  if (Number.isNaN(number)) return String(row.value ?? "");
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function AbandonedCheckoutsTab() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { page, setPage } = useFilters([]);
  const [openRow, setOpenRow] = useState<number | null>(null);

  const listParams = useMemo((): CustomersListParams => ({ page }), [page]);
  const { data, isLoading, isError, error } = useAbandonedCheckoutsQuery(listParams);

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleAbandonedFailedToLoad"),
      fallbackMessage: tPages("toastDescAbandonedFailedToLoad"),
    });
  }, [isError, error, tPages]);

  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const hasNext = !!data?.next;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{tCommon("loading")}</p>;
  }

  if (!isError && rows.length === 0) {
    return (
      <div className="rounded-card border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
        {tPages("abandonedEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {tPages("abandonedIntro")}
      </p>

      <div className="overflow-x-auto rounded-card border border-card-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="th">{tPages("abandonedColPhone")}</th>
              <th className="th">{tPages("customersListColUsername")}</th>
              <th className="th">{tPages("abandonedColItems")}</th>
              <th className="th">{tPages("abandonedColValue")}</th>
              <th className="th">{tPages("abandonedColWhen")}</th>
              <th className="th">
                <span className="sr-only">{tPages("abandonedConvert")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setOpenRow(openRow === row.id ? null : row.id)}
                className="cursor-pointer align-top transition hover:bg-muted/40"
              >
                <td className={`px-4 py-3 font-medium text-foreground ${numClass}`}>
                  {/* A real link: on a phone this dials, which is the whole
                      point of the screen. */}
                  <a
                    href={`tel:${row.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="underline underline-offset-4"
                  >
                    {row.phone}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.name || "—"}
                  {openRow === row.id ? (
                    <span className="mt-2 block text-xs leading-relaxed">
                      {row.email ? <>{row.email}<br /></> : null}
                      {row.shipping_address || "—"}
                      {row.district ? `, ${row.district}` : ""}
                    </span>
                  ) : null}
                </td>
                <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                  {row.item_count}
                  {openRow === row.id ? (
                    <ul className="mt-2 list-none space-y-1 p-0 text-xs">
                      {row.items.map((item, index) => (
                        <li key={`${item.name}-${index}`}>
                          {item.name}
                          {item.variant ? ` (${item.variant})` : ""} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className={`px-4 py-3 text-foreground ${numClass}`}>
                  {valueDisplay(row)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="whitespace-nowrap">
                    {formatDashboardDateTime(row.updated_at, locale)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {/* They said yes on the phone: the New order form, started
                      from this row. Saving it takes the row off this list. */}
                  <DeferredNavLink
                    href={`/orders/new?abandoned=${row.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex whitespace-nowrap rounded-card bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    {tPages("abandonedConvert")}
                  </DeferredNavLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{tPages("abandonedKeptFor")}</p>

      {(count > 10 || hasNext) && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-page"
          >
            {tPages("supportTicketsPrevious")}
          </button>
          <span className={`text-sm text-muted-foreground ${numClass}`}>
            {tPages("supportTicketsPageLabel", {
              page: toLocaleDigits(String(page), locale),
            })}
          </span>
          <button
            disabled={!hasNext}
            onClick={() => setPage(page + 1)}
            className="btn-page"
          >
            {tPages("supportTicketsNext")}
          </button>
        </div>
      )}
    </div>
  );
}
