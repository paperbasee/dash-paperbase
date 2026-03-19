"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Undo2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import type { Inventory, PaginatedResponse } from "@/types";

export default function InventoryPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustValue, setAdjustValue] = useState<Record<number, string>>({});

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Inventory>>("admin/inventory/", {
        params: { page },
      })
      .then((res) => {
        setInventory(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [page]);

  async function handleAdjust(id: number, change: number) {
    setAdjusting(id);
    try {
      await api.post(`admin/inventory/${id}/adjust/`, {
        change,
        reason: "adjustment",
        reference: "",
      });
      setAdjustValue((prev) => ({ ...prev, [id]: "" }));
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAdjusting(null);
    }
  }

  const lowStockCount = inventory.filter((i) => i.is_low).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <div>
            <h1 className="text-2xl font-medium text-foreground">Inventory</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stock levels and SKU management. {lowStockCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="inline h-4 w-4" />
                  {lowStockCount} low stock
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : inventory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No inventory records found. Products and variants will appear here when stock tracking is enabled.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">Product</th>
                  <th className="th">Variant</th>
                  <th className="th text-right">Qty</th>
                  <th className="th text-right">Low threshold</th>
                  <th className="th text-right">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {inventory.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`hover:bg-muted/40 ${inv.is_low ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link
                        href={`/products/${inv.product}`}
                        className="text-primary hover:underline"
                      >
                        {inv.product_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.variant_sku || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {inv.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {inv.low_stock_threshold}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={adjustValue[inv.id] ?? ""}
                          onChange={(e) =>
                            setAdjustValue((prev) => ({
                              ...prev,
                              [inv.id]: e.target.value,
                            }))
                          }
                          placeholder="±"
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-sm"
                        />
                        <button
                          type="button"
                          disabled={
                            adjusting === inv.id ||
                            !adjustValue[inv.id] ||
                            parseInt(adjustValue[inv.id] || "0", 10) === 0
                          }
                          onClick={() =>
                            handleAdjust(
                              inv.id,
                              parseInt(adjustValue[inv.id] || "0", 10)
                            )
                          }
                          className="rounded border border-border px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                        >
                          {adjusting === inv.id ? "..." : "Apply"}
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
                onClick={() => setPage((p) => p - 1)}
                className="btn-page"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} ({count} total)
              </span>
              <button
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="btn-page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
