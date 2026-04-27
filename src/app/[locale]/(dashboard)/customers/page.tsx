"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { toLocaleDigits } from "@/lib/locale-digits";
import { digitsInNumberFont, numberTextClass } from "@/lib/number-font";
import { Undo2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import api from "@/lib/api";
import type { Customer, PaginatedResponse } from "@/types";
import { formatDashboardDate } from "@/lib/datetime-display";
import { notify } from "@/notifications";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";

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
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "joined_date",
    "is_repeat_customer",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  function fetchData() {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filters.joined_date) params.joined_date = filters.joined_date;
    if (filters.is_repeat_customer) {
      params.is_repeat_customer = filters.is_repeat_customer;
    }
    if (filters.search) params.search = filters.search;
    api
      .get<PaginatedResponse<Customer>>("admin/customers/", {
        params,
      })
      .then((res) => {
        setCustomers(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [filters.joined_date, filters.is_repeat_customer, filters.search, page]);

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
            {tNav("customers")} (
            <span className={numClass}>{toLocaleDigits(String(count), locale)}</span>)
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:hidden">
            {tPages("customersSubtitle")}
          </p>
        </div>
      </div>

      <p className="hidden text-sm leading-relaxed text-muted-foreground md:block">
        {tPages("customersSubtitle")}
      </p>

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
        <FilterDropdown
          value={filters.is_repeat_customer}
          onChange={(value) => setFilter("is_repeat_customer", value)}
          placeholder={tPages("filtersRepeatedCustomer")}
          options={[
            { value: "true", label: tPages("filtersRepeatedCustomerYes") },
            { value: "false", label: tPages("filtersRepeatedCustomerNo") },
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

      {loading ? (
        <DashboardTableSkeleton columns={6} rows={5} showHeader={false} showFilters={false} />
      ) : customers.length === 0 ? (
        <div className="rounded-card border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("customersEmpty")}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-dashed border-card-border bg-card">
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
                        aria-label={
                          c.email ||
                          c.name ||
                          c.public_id
                        }
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
      )}
    </div>
  );
}
