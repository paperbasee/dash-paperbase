"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { Truck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import {
  ORDER_STATUS_OPTIONS,
  formatOrderStatusLabel,
} from "@/lib/orders/order-statuses";
import type { Order, PaginatedResponse } from "@/types";
import { notify, normalizeError } from "@/notifications";

/** Shown after dispatch: Steadfast consignment id only (not provider name). */
function courierCell(order: Order): string {
  if (!order.sent_to_courier) return "—";
  const c = (order.courier_consignment_id || "").trim();
  return c || "—";
}

export default function OrdersPage() {
  const router = useRouter();
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const { currencySymbol } = useBranding();
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "status",
    "date_range",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [bulkDispatching, setBulkDispatching] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [courierSendingId, setCourierSendingId] = useState<string | null>(null);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filters.status) params.status = filters.status;
    if (filters.date_range) params.date_range = filters.date_range;
    if (filters.search) params.search = filters.search;
    api
      .get<PaginatedResponse<Order>>("admin/orders/", {
        params,
      })
      .then((res) => {
        setOrders(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, [filters.date_range, filters.search, filters.status, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.public_id)));
    }
  };

  async function handleBulkConfirmSendCourier() {
    if (selectedIds.size === 0) return;
    const ok = await notify.confirm({
      title: tPages("ordersBulkConfirmCourier", {
        count: toLocaleDigits(String(selectedIds.size), locale),
      }),
      level: "warning",
    });
    if (!ok) return;
    setBulkDispatching(true);
    try {
      type BulkResp = {
        results: { public_id: string; ok: boolean; error: string | null }[];
        summary: { ok: number; failed: number };
      };
      const { data } = await api.post<BulkResp>(
        "admin/orders/bulk-confirm-send-courier/",
        { order_public_ids: Array.from(selectedIds) }
      );
      const { summary, results } = data;
      const failedMsgs = results
        .filter((r) => !r.ok)
        .map(
          (r) =>
            `${r.public_id}: ${r.error || tPages("ordersBulkDispatchRowFailed")}`
        );
      if (summary.failed > 0) {
        notify.warning(
          tPages("ordersBulkDispatchSummary", {
            ok: toLocaleDigits(String(summary.ok), locale),
            failed: toLocaleDigits(String(summary.failed), locale),
            details: `${failedMsgs.slice(0, 8).join("\n")}${failedMsgs.length > 8 ? "\n…" : ""}`,
          })
        );
      }
      if (summary.ok > 0) notify.success(tPages("ordersConfirmSendCourier"));
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("ordersBulkDispatchFailed") });
    } finally {
      setBulkDispatching(false);
    }
  }

  async function handleRowStatusChange(order: Order, next: string) {
    if (order.status === "cancelled" || next === order.status) return;
    setStatusUpdatingId(order.public_id);
    try {
      const { data } = await api.patch<{ order: Order }>(
        `admin/orders/${order.public_id}/status/`,
        { status: next }
      );
      setOrders((prev) =>
        prev.map((o) => (o.public_id === order.public_id ? data.order : o))
      );
    } catch (e) {
      console.error(e);
      notify.error(e, { fallbackMessage: tPages("orderDetailStatusUpdateFailed") });
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleSendToCourierRow(order: Order) {
    if (order.status !== "confirmed" || order.sent_to_courier) return;
    setCourierSendingId(order.public_id);
    try {
      const { data } = await api.post<Order>(
        `admin/orders/${order.public_id}/send-to-courier/`
      );
      setOrders((prev) =>
        prev.map((o) => (o.public_id === order.public_id ? data : o))
      );
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("ordersSendToCourierErrorFallback"));
      notify.error(normalized.message);
    } finally {
      setCourierSendingId(null);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const ok = await notify.confirm({
      title: tPages("confirmDeleteOrders", {
        count: toLocaleDigits(String(selectedIds.size), locale),
      }),
      level: "destructive",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.delete(`admin/orders/${id}/`))
      );
      setSelectedIds(new Set());
      notify.warning(
        tPages("ordersDeletedSuccess", {
          count: selectedForBulk.length,
        })
      );
      fetchOrders();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = orders.length > 0 && selectedIds.size === orders.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("goBack")}
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("orders")} ({toLocaleDigits(String(count), locale)})
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <>
              <button
                type="button"
                onClick={handleBulkConfirmSendCourier}
                disabled={bulkDispatching}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                {bulkDispatching
                  ? tPages("ordersSending")
                  : tPages("ordersConfirmSendCourier")}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting
                  ? tPages("deleting")
                  : tPages("deleteSelected", {
                      count: toLocaleDigits(String(selectedIds.size), locale),
                    })}
              </button>
            </>
          )}
          <Link
            href="/orders/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {tPages("addOrder")}
          </Link>
        </div>
      </div>

      <FilterBar>
        <FilterDropdown
          value={filters.status}
          onChange={(value) => setFilter("status", value)}
          placeholder={tPages("filtersStatus")}
          options={ORDER_STATUS_OPTIONS.map((s) => ({
            value: s,
            label: formatOrderStatusLabel(s, (key) => tPages(key)),
          }))}
        />
        <FilterDropdown
          value={filters.date_range}
          onChange={(value) => setFilter("date_range", value)}
          placeholder={tPages("filtersDateRange")}
          options={[
            { value: "today", label: tPages("filtersToday") },
            { value: "last_7_days", label: tPages("filtersLast7Days") },
            { value: "last_30_days", label: tPages("filtersLast30Days") },
          ]}
        />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tPages("filtersSearchOrders")}
          className="w-full md:w-72"
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="form-checkbox"
                      aria-label={tPages("ordersListSelectAllAria")}
                    />
                  </th>
                  <th className="th">{tPages("ordersListColOrderNumber")}</th>
                  <th className="th">{tPages("ordersListColCustomer")}</th>
                  <th className="th">{tPages("ordersListColPhone")}</th>
                  <th className="th">{tPages("filtersStatus")}</th>
                  <th className="th">{tPages("ordersListColTotal")}</th>
                  <th className="th">{tPages("ordersListConsignmentId")}</th>
                  <th className="th">{tPages("ordersListColDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order.public_id} className="hover:bg-muted/40">
                    <td className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.public_id)}
                        onChange={() => toggleSelect(order.public_id)}
                        className="form-checkbox"
                        aria-label={tPages("ordersListSelectOrderAria", {
                          orderNumber: order.order_number,
                        })}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ClickableText
                        href={`/orders/${order.public_id}`}
                        className="whitespace-nowrap"
                      >
                        {order.order_number}
                      </ClickableText>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {order.shipping_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {order.phone || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Select
                        className="w-[180px] capitalize"
                        value={order.status}
                        disabled={
                          order.status === "cancelled" ||
                          statusUpdatingId === order.public_id
                        }
                        onChange={(e) =>
                          handleRowStatusChange(order, e.target.value)
                        }
                        aria-label={tPages("ordersListStatusForOrderAria", {
                          orderNumber: order.order_number,
                        })}
                      >
                        {ORDER_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {formatOrderStatusLabel(s, (key) => tPages(key))}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {currencySymbol}{Number(order.total).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[220px]">
                      {order.status === "confirmed" && !order.sent_to_courier ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 px-2.5 text-xs"
                          disabled={courierSendingId === order.public_id}
                          onClick={() => handleSendToCourierRow(order)}
                          aria-label={tPages("ordersListSendCourierAria", {
                            orderNumber: order.order_number,
                          })}
                        >
                          <Truck className="size-3.5 shrink-0" />
                          {courierSendingId === order.public_id
                            ? tPages("ordersSending")
                            : tPages("ordersSendToCourier")}
                        </Button>
                      ) : (
                        <span className="block truncate" title={courierCell(order)}>
                          {courierCell(order)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDashboardDateTime(order.created_at, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-page"
            >
              {tPages("supportTicketsPrevious")}
            </button>
            <span className="text-sm text-muted-foreground">
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
        </>
      )}
    </div>
  );
}
