"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { WishlistItem, PaginatedResponse } from "@/types";

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<WishlistItem>>("/api/admin/wishlist/", {
        params: { page },
      })
      .then((res) => {
        setItems(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const groupedItems = useMemo(() => {
    const map = new Map<
      number,
      {
        product: number;
        product_name: string;
        product_brand?: string;
        count: number;
      }
    >();

    for (const item of items) {
      const existing = map.get(item.product);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.product, {
          product: item.product,
          product_name: item.product_name,
          product_brand: item.product_brand,
          count: 1,
        });
      }
    }

    return Array.from(map.values());
  }, [items]);

  return (
    <div className="space-y-6">
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
        <h1 className="text-2xl font-medium text-foreground">Wishlist ({count})</h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : groupedItems.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No wishlist items found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Brand
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {groupedItems.map((item) => (
                  <tr key={item.product} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      <Link
                        href={`/products/${item.product}`}
                        className="text-primary hover:underline"
                      >
                        {item.product_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {item.product_brand || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {item.count}
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
