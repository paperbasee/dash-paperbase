"use client";

// Shoppers who signed in to the storefront.
//
// A separate list from Customers, not a filter on it, because they are separate
// records: an account is a login, a customer is the phone-keyed record built
// from orders, and signing up adopts nothing. The same person can appear in
// both tabs, which is expected rather than a duplicate to clean up.
//
// Read-only. The API offers no create, edit or delete: these are a shopper's
// credentials, and deleting one would sign that person out of a shop they can
// still buy from.

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FunnelIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { toLocaleDigits } from "@/lib/locale-digits";
import { digitsInNumberFont, numberTextClass } from "@/lib/number-font";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { useCustomerAccountsQuery } from "@/hooks/useCustomerAccountsQuery";
import { formatDashboardDate } from "@/lib/datetime-display";
import { notify } from "@/notifications";
import type { CustomerAccount } from "@/types";
import type { CustomersListParams } from "@/lib/query-keys";

function totalSpentDisplay(account: CustomerAccount): string {
  const raw = account.total_spent;
  if (raw === undefined || raw === null || raw === "") return "—";
  const num = Number(raw);
  if (Number.isNaN(num)) return String(raw);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function AccountsTab() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "joined_date",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const listParams = useMemo((): CustomersListParams => {
    const params: CustomersListParams = { page };
    if (filters.joined_date) params.joined_date = filters.joined_date;
    if (filters.search) params.search = filters.search;
    return params;
  }, [page, filters.joined_date, filters.search]);

  const { data, isLoading, isError, error } = useCustomerAccountsQuery(listParams);

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleCustomerAccountsFailedToLoad"),
      fallbackMessage: tPages("toastDescCustomerAccountsFailedToLoad"),
    });
  }, [isError, error, tPages]);

  const accounts = data?.results ?? [];
  const count = data?.count ?? 0;
  const hasNext = !!data?.next;

  const filtersActive = useMemo(
    () =>
      Boolean((filters.joined_date || "").trim() || (filters.search || "").trim()),
    [filters.joined_date, filters.search]
  );

  useEffect(() => {
    if (!filtersActive) setFiltersOpen(false);
  }, [filtersActive]);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3"
          aria-label={tPages("filtersToggleAria")}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FunnelIcon className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {isLoading
          ? tCommon("loading")
          : tPages("customerAccountsListCountWithTotal", {
              pageCount: accounts.length,
              totalCount: count,
            })}
      </p>

      {filtersOpen ? (
        <FilterBar>
          <FilterDropdown
            value={filters.joined_date}
            onChange={(value) => setFilter("joined_date", value)}
            placeholder={tPages("filtersJoinedDate")}
            options={[
              { value: "today", label: tPages("filtersToday") },
              {
                value: "last_7_days",
                label: tPages("filtersLast7Days"),
                labelDisplay: digitsInNumberFont(tPages("filtersLast7Days"), locale),
              },
              {
                value: "last_30_days",
                label: tPages("filtersLast30Days"),
                labelDisplay: digitsInNumberFont(tPages("filtersLast30Days"), locale),
              },
            ]}
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPages("filtersSearchCustomerAccounts")}
            className="w-full md:w-72"
          />
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              clearFilters();
            }}
            className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted"
          >
            {tPages("filtersClear")}
          </button>
        </FilterBar>
      ) : null}

      {!isLoading && accounts.length === 0 && !isError ? (
        <div className="rounded-card border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("customerAccountsEmpty")}
        </div>
      ) : !isLoading ? (
        <>
          <div className="overflow-x-auto rounded-card border border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">{tPages("customersListColUsername")}</th>
                  <th className="th">{tPages("customersListColEmail")}</th>
                  <th className="th">
                    {tPages("customerAccountsListColSignedInOrders")}
                  </th>
                  <th className="th">{tPages("customersListColTotalSpent")}</th>
                  <th className="th">
                    {tPages("customerAccountsListColLastSeen")}
                  </th>
                  <th className="th">{tPages("customersListColJoined")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {accounts.map((account) => (
                  <tr key={account.public_id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {account.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {account.email || "—"}
                    </td>
                    <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                      {account.total_orders ?? 0}
                    </td>
                    <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                      {totalSpentDisplay(account)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {account.last_seen_at
                          ? formatDashboardDate(account.last_seen_at, locale)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {account.created_at
                          ? formatDashboardDate(account.created_at, locale)
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            {tPages("customerAccountsOnlySignedInOrders")}
          </p>

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
