"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2, AlertTriangle } from "lucide-react";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import api from "@/lib/api";
import type { Inventory, PaginatedResponse } from "@/types";
import { notify } from "@/notifications";

export default function InventoryPage() {
  const router = useRouter();
  const tPages = useTranslations("pages");
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
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);

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
    api
      .get<PaginatedResponse<Inventory>>("admin/inventory/", {
        params,
      })
      .then((res) => {
        setInventory(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, [filters.search, filters.stock, filters.tracked, filters.type, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setAdjusting(null);
    }
  }

  const lowStockCount = inventory.filter((i) => i.is_low).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("inventoryGoBackAria")}
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">{tPages("inventoryTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground md:hidden">
              {tPages("inventorySubtitle")}{" "}
              {lowStockCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="inline h-4 w-4" />
                  {tPages("inventoryLowStock", { count: lowStockCount })}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">
        {tPages("inventorySubtitle")}{" "}
        {lowStockCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <AlertTriangle className="inline h-4 w-4" />
            {tPages("inventoryLowStock", { count: lowStockCount })}
          </span>
        )}
      </p>

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tPages("inventorySearchPlaceholder")}
          className="w-full md:w-72"
        />
        <FilterDropdown
          value={filters.stock}
          onChange={(value) => setFilter("stock", value)}
          placeholder={tPages("inventoryFilterStock")}
          options={[
            { value: "in_stock", label: tPages("inventoryStockInStock") },
            { value: "low_stock", label: tPages("inventoryStockLow") },
            { value: "out_of_stock", label: tPages("inventoryStockOut") },
          ]}
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
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
        >
          {tPages("filtersClear")}
        </button>
      </FilterBar>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : inventory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("inventoryEmpty")}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
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
                  <tr
                    key={inv.public_id}
                    className={`hover:bg-muted/40 ${inv.is_low ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <ClickableText href={`/products/${inv.product_public_id}`}>
                        {inv.product_name}
                      </ClickableText>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.variant_sku || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.option_labels?.length
                        ? inv.option_labels.join(" · ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {inv.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
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
                          className="w-20 px-2 py-1 text-right text-sm"
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
                          className="rounded border border-border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                        >
                          {adjusting === inv.public_id
                            ? tPages("inventoryApplying")
                            : tPages("inventoryApply")}
                        </button>
                      </div>
                    </td>
                  </tr>
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
      )}
    </div>
  );
}
