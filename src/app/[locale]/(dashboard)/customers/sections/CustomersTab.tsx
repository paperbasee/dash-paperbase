"use client";

// The phone-keyed customer list, exactly as it has always been. It moved out of
// page.tsx when the Accounts tab arrived beside it; nothing about what it shows
// changed in that move.

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { toLocaleDigits } from "@/lib/locale-digits";
import { digitsInNumberFont, numberTextClass } from "@/lib/number-font";
import { FilterToggle } from "@/components/filters/FilterToggle";
import { PageHeader } from "@/components/page/PageHeader";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import type { Customer } from "@/types";
import { formatDashboardDate } from "@/lib/datetime-display";
import { notify } from "@/notifications";
import { useCustomersQuery } from "@/hooks/useCustomersQuery";
import type { CustomersListParams } from "@/lib/query-keys";

function customerTotalSpentDisplay(c: Customer): string {
  const raw = c.total_spent;
  if (raw === undefined || raw === null || raw === "") return "—";
  const num = Number(raw);
  if (Number.isNaN(num)) return String(raw);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function CustomersTab() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tHints = useTranslations("pageHints");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "joined_date",
    "is_repeat_customer",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const listParams = useMemo((): CustomersListParams => {
    const params: CustomersListParams = { page };
    if (filters.joined_date) params.joined_date = filters.joined_date;
    if (filters.is_repeat_customer) {
      params.is_repeat_customer = filters.is_repeat_customer;
    }
    if (filters.search) params.search = filters.search;
    return params;
  }, [page, filters.joined_date, filters.is_repeat_customer, filters.search]);

  const { data, isLoading, isError, error } = useCustomersQuery(listParams);

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleCustomersFailedToLoad"),
      fallbackMessage: tPages("toastDescCustomersFailedToLoad"),
    });
  }, [isError, error, tPages]);

  const customers = data?.results ?? [];
  const count = data?.count ?? 0;
  const hasNext = !!data?.next;

  const filtersActive = useMemo(
    () =>
      Boolean(
        (filters.joined_date || "").trim() ||
          (filters.search || "").trim() ||
          (filters.is_repeat_customer || "").trim()
      ),
    [filters.joined_date, filters.search, filters.is_repeat_customer]
  );


  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  const pageCustomersCount = customers.length;

  return (
    <div className="space-y-6">
      <PageHeader title={tNav("customers")} hint={tHints("customers")}>
        <FilterToggle open={filtersOpen} active={filtersActive} onToggle={() => setFiltersOpen((v) => !v)} />
      </PageHeader>

      {filtersOpen ? (
        <FilterBar>
          <FilterDropdown
            value={filters.is_repeat_customer}
            onChange={(value) => setFilter("is_repeat_customer", value)}
            placeholder={tPages("filtersRepeatedCustomer")}
            options={[
              { value: "true", label: tPages("filtersRepeatedCustomerYes") },
              { value: "false", label: tPages("filtersRepeatedCustomerNo") },
            ]}
          />
          <FilterDropdown
            value={filters.joined_date}
            onChange={(value) => setFilter("joined_date", value)}
            placeholder={tPages("filtersJoinedDate")}
            options={[
              { value: "today", label: tPages("filtersToday") },
              {
                value: "last_7_days",
                label: tPages("filtersLast7Days"),
                labelDisplay: digitsInNumberFont(
                  tPages("filtersLast7Days"),
                  locale
                ),
              },
              {
                value: "last_30_days",
                label: tPages("filtersLast30Days"),
                labelDisplay: digitsInNumberFont(
                  tPages("filtersLast30Days"),
                  locale
                ),
              },
            ]}
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPages("filtersSearchCustomers")}
            className="w-full md:w-72"
          />
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              clearFilters();
              setFiltersOpen(false);
            }}
            className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted"
          >
            {tPages("filtersClear")}
          </button>
        </FilterBar>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {isLoading
          ? tCommon("loading")
          : tPages("customersListCountWithTotal", {
              pageCount: pageCustomersCount,
              totalCount: count,
            })}
      </p>

      {!isLoading && customers.length === 0 && !isError ? (
        <div className="rounded-card border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("customersEmpty")}
        </div>
      ) : !isLoading ? (
        <>
          <div className="overflow-x-auto rounded-card border border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">{tPages("customersListColUsername")}</th>
                  <th className="th">{tPages("customersListColEmail")}</th>
                  <th className="th">{tPages("customersListColPhone")}</th>
                  <th className="th">{tPages("customersListColTotalOrders")}</th>
                  <th className="th">{tPages("customersListColTotalSpent")}</th>
                  <th className="th">{tPages("customersListColJoined")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((c) => (
                  <ClickableTableRow
                    key={c.public_id}
                    href={`/customers/${c.public_id}`}
                    aria-label={c.email || c.name || c.public_id}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">{c.name || "—"}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.phone || "—"}
                    </td>
                    <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                      {c.total_orders ?? 0}
                    </td>
                    <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                      {customerTotalSpentDisplay(c)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {c.created_at
                          ? formatDashboardDate(c.created_at, locale)
                          : "—"}
                      </span>
                    </td>
                  </ClickableTableRow>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      ) : null}
    </div>
  );
}
