"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import type { Order, PaginatedResponse } from "@/types";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type OrderStatus = (typeof STATUS_OPTIONS)[number]["value"];

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function OrdersPage() {
  const router = useRouter();
  const { currencySymbol } = useBranding();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Order>>("admin/orders/", {
        params: { page },
      })
      .then((res) => {
        setOrders(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

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
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setUpdatingStatusId(orderId);
    try {
      await api.patch(`admin/orders/${orderId}/`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected order(s) permanently?`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.delete(`admin/orders/${id}/`))
      );
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err) {
      console.error(err);
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
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">
            Orders ({count})
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete selected (${selectedIds.size})`}
            </button>
          )}
          <Link
            href="/orders/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Add Order
          </Link>
        </div>
      </div>

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
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      aria-label="Select all orders on this page"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Delivery
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Extra
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/40">
                    <td className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        aria-label={`Select order ${order.order_number}`}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-primary hover:underline whitespace-nowrap"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {order.shipping_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {order.phone || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Combobox
                        value={order.status}
                        onValueChange={(_, value) =>
                          handleStatusChange(order.id, value as OrderStatus)
                        }
                        disabled={updatingStatusId === order.id}
                      >
                        <ComboboxInput
                          placeholder="Select status"
                          showClear={false}
                          className="w-[110px]"
                          inputClassName="cursor-pointer caret-transparent text-xs font-medium capitalize"
                        />
                        <ComboboxContent>
                          <ComboboxList>
                            {STATUS_OPTIONS.map((opt) => (
                              <ComboboxItem key={opt.value} value={opt.value}>
                                <span className="capitalize">{opt.label}</span>
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      {updatingStatusId === order.id && (
                        <span className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {currencySymbol}{Number(order.total).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {order.delivery_area_label}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {order.extra_data && typeof order.extra_data === "object"
                        ? Object.keys(order.extra_data).length
                        : 0}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
