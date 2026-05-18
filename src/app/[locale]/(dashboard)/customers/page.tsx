"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { toLocaleDigits } from "@/lib/locale-digits";
import { digitsInNumberFont, numberTextClass } from "@/lib/number-font";
import { FunnelIcon, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function CustomersPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
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
        (filters.joined_date || "").trim() || (filters.search || "").trim()
      ),
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

  const customerTypePillOptions = useMemo(
    () => [
      { value: "", label: tCommon("all") },
      { value: "true", label: tPages("filtersRepeatedCustomerYes") },
      { value: "false", label: tPages("filtersRepeatedCustomerNo") },
    ],
    [tCommon, tPages]
  );

  const pageCustomersCount = customers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("goBack")}
            className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("customers")}
          </h1>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {customerTypePillOptions.map((opt) => {
            const active = (filters.is_repeat_customer || "") === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                onClick={() => setFilter("is_repeat_customer", opt.value)}
                aria-pressed={active}
                className={[
                  "h-9 rounded-ui border px-3 text-sm font-medium transition whitespace-nowrap",
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3"
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FunnelIcon className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {isLoading
          ? tCommon("loading")
          : tPages("customersListCountWithTotal", {
              pageCount: pageCustomersCount,
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
            }}
            className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted"
          >
            {tPages("filtersClear")}
          </button>
        </FilterBar>
      ) : null}

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
