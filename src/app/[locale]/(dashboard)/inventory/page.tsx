"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FunnelIcon, Undo2 } from "lucide-react";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import api from "@/lib/api";
import type { Inventory, PaginatedResponse } from "@/types";
import { notify } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { INVENTORY_STATUS_REFRESH_EVENT } from "@/hooks/useInventoryStatus";
import { usePageLoadingBar } from "@/hooks/usePageLoadingBar";
import { BelowFoldScrollHint } from "@/components/BelowFoldScrollHint";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "search",
    "stock",
    "tracked",
    "type",
  ]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  /** Store-wide count of tracked rows at or below low threshold (not limited to current page). */
  const [lowStockTotal, setLowStockTotal] = useState<number | null>(null);
  /** Store-wide count of rows with quantity 0 (not limited to current page). */
  const [outOfStockTotal, setOutOfStockTotal] = useState<number | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [filtersOpen, setFiltersOpen] = useState(false);

  usePageLoadingBar(
    loading && inventory.length === 0 && count === 0 && lowStockTotal === null
  );

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filters.search) params.search = filters.search;
    if (filters.stock) params.stock = filters.stock;
    if (filters.tracked) params.tracked = filters.tracked;
    if (filters.type) params.type = filters.type;

    const listReq = api.get<PaginatedResponse<Inventory>>("admin/inventory/", { params });
    const lowStockReq = api.get<PaginatedResponse<Inventory>>("admin/inventory/", {
      params: { stock: "low_stock", page: 1 },
    });
    const outOfStockReq = api.get<PaginatedResponse<Inventory>>("admin/inventory/", {
      params: { stock: "out_of_stock", page: 1 },
    });

    Promise.all([listReq, lowStockReq, outOfStockReq])
      .then(([listRes, lowRes, outRes]) => {
        setInventory(listRes.data.results);
        setCount(listRes.data.count ?? 0);
        setHasNext(!!listRes.data.next);
        setLowStockTotal(lowRes.data.count ?? 0);
        setOutOfStockTotal(outRes.data.count ?? 0);
      })
      .catch((err) => {
        notify.error(err, {
          title: tPages("toastTitleInventoryUpdateFailed"),
          fallbackMessage: tPages("toastDescInventoryUpdateFailed"),
        });
      })
      .finally(() => setLoading(false));
  }, [filters.search, filters.stock, filters.tracked, filters.type, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showLowStockOnly = useCallback(() => {
    setFilter("stock", "low_stock");
  }, [setFilter]);

  const showOutOfStockOnly = useCallback(() => {
    setFilter("stock", "out_of_stock");
  }, [setFilter]);

  const hasLowStockAlert = lowStockTotal !== null && lowStockTotal > 0;
  const hasOutOfStockAlert = outOfStockTotal !== null && outOfStockTotal > 0;
  const hasStockSummaryAlerts = hasLowStockAlert || hasOutOfStockAlert;

  const stockPillOptions: { value: string; label: string }[] = [
    { value: "", label: tCommon("all") },
    { value: "in_stock", label: tPages("inventoryStockInStock") },
    { value: "low_stock", label: tPages("inventoryStockLow") },
    { value: "out_of_stock", label: tPages("inventoryStockOut") },
  ];

  const stockSummaryAlertButtons = (
    <>
      {hasLowStockAlert && (
        <button
          type="button"
          onClick={showLowStockOnly}
          aria-label={tPages("inventoryLowStockFilterAria")}
          className="inline border-0 bg-transparent p-0 align-baseline text-amber-600 underline decoration-amber-600/60 underline-offset-2 hover:text-amber-700 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:text-amber-400"
        >
          {tPages("inventoryLowStock", { count: lowStockTotal ?? 0 })}
        </button>
      )}
      {hasLowStockAlert && hasOutOfStockAlert && (
        <span className="text-muted-foreground" aria-hidden>
          {" "}
          ·{" "}
        </span>
      )}
      {hasOutOfStockAlert && (
        <button
          type="button"
          onClick={showOutOfStockOnly}
          aria-label={tPages("inventoryOutOfStockFilterAria")}
          className="inline border-0 bg-transparent p-0 align-baseline text-rose-600 underline decoration-rose-600/60 underline-offset-2 hover:text-rose-700 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:text-rose-400"
        >
          {tPages("inventoryOutOfStockSummary", { count: outOfStockTotal ?? 0 })}
        </button>
      )}
    </>
  );

  const filtersActive = Boolean(
    (filters.search || "").trim() ||
      (filters.stock || "").trim() ||
      (filters.tracked || "").trim() ||
      (filters.type || "").trim(),
  );

  useEffect(() => {
    if (!filtersActive) setFiltersOpen(false);
  }, [filters.search, filters.stock, filters.tracked, filters.type]);

  async function handleAdjust(publicId: string, change: number) {
    setAdjusting(publicId);
    try {
      await api.post(`admin/inventory/${publicId}/adjust/`, {
        change,
        reason: "adjustment",
        reference: "",
      });
      setAdjustValue((prev) => ({ ...prev, [publicId]: "" }));
      fetchData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INVENTORY_STATUS_REFRESH_EVENT));
      }
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleInventoryUpdateFailed"),
        fallbackMessage: tPages("toastDescInventoryUpdateFailed"),
      });
    } finally {
      setAdjusting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("inventoryGoBackAria")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tPages("inventoryTitle")}
          </h1>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap min-w-0">
          {stockPillOptions.map((opt) => {
            const active = (filters.stock || "") === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                onClick={() => setFilter("stock", opt.value)}
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
          className="h-9 shrink-0 self-start px-3"
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FunnelIcon className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        {loading ? (
          tCommon("loading")
        ) : (
          <>
            <span className="min-w-0">
              {tPages("inventoryListCountWithTotal", {
                pageCount: inventory.length,
                totalCount: count,
              })}
            </span>
            {hasStockSummaryAlerts ? (
              <>
                <span className="shrink-0 text-muted-foreground" aria-hidden>
                  ·
                </span>
                <span className="min-w-0">{stockSummaryAlertButtons}</span>
              </>
            ) : null}
          </>
        )}
      </p>

      {filtersOpen ? (
        <FilterBar>
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPages("inventorySearchPlaceholder")}
            className="w-full md:w-72"
          />
          <FilterDropdown
            value={filters.tracked}
            onChange={(value) => setFilter("tracked", value)}
            placeholder={tPages("inventoryFilterTracking")}
            options={[
              { value: "tracked", label: tPages("inventoryTracked") },
              { value: "untracked", label: tPages("inventoryUntracked") },
            ]}
          />
          <FilterDropdown
            value={filters.type}
            onChange={(value) => setFilter("type", value)}
            placeholder={tPages("inventoryFilterRecordType")}
            options={[
              { value: "product", label: tPages("inventoryTypeProduct") },
              { value: "variant", label: tPages("inventoryTypeVariant") },
            ]}
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

      {!loading && inventory.length === 0 ? (
        <div className="rounded-card border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("inventoryEmpty")}
        </div>
      ) : !loading ? (
        <>
          <div className="overflow-x-auto rounded-card border border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">{tPages("inventoryColProduct")}</th>
                  <th className="th">{tPages("inventoryColVariant")}</th>
                  <th className="th">{tPages("inventoryColOptions")}</th>
                  <th className="th text-right">{tPages("inventoryColQty")}</th>
                  <th className="th text-right">{tPages("inventoryColLowThreshold")}</th>
                  <th className="th text-right">{tPages("inventoryColAdjust")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {inventory.map((inv) => (
                  <ClickableTableRow
                    key={inv.public_id}
                    href={`/products/${inv.product_public_id}`}
                    aria-label={inv.product_name}
                    className={
                      inv.is_low ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined
                    }
                  >
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {inv.product_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {inv.variant_sku || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {inv.option_labels?.length
                        ? inv.option_labels.join(" · ")
                        : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-medium", numClass)}>
                      {inv.quantity}
                    </td>
                    <td className={cn("px-4 py-3 text-right text-muted-foreground", numClass)}>
                      {inv.low_stock_threshold}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={adjustValue[inv.public_id] ?? ""}
                          onChange={(e) =>
                            setAdjustValue((prev) => ({
                              ...prev,
                              [inv.public_id]: e.target.value,
                            }))
                          }
                          placeholder={tPages("inventoryAdjustPlaceholder")}
                          className={cn("w-20 px-2 py-1 text-right text-sm", numClass)}
                          size="sm"
                        />
                        <button
                          type="button"
                          disabled={
                            adjusting === inv.public_id ||
                            !adjustValue[inv.public_id] ||
                            parseInt(adjustValue[inv.public_id] || "0", 10) === 0
                          }
                          onClick={() =>
                            handleAdjust(
                              inv.public_id,
                              parseInt(adjustValue[inv.public_id] || "0", 10)
                            )
                          }
                          className="rounded-ui border border-border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                        >
                          {adjusting === inv.public_id
                            ? tPages("inventoryApplying")
                            : tPages("inventoryApply")}
                        </button>
                      </div>
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
              <span className="text-sm text-muted-foreground">
                {tPages("inventoryPageLabel", { page, count })}
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
      <BelowFoldScrollHint />
    </div>
  );
}
