"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { ClickableText } from "@/components/ui/clickable-text";
import api from "@/lib/api";
import type { Cart, PaginatedResponse } from "@/types";

export default function CartsPage() {
  const router = useRouter();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Cart>>("admin/carts/", {
        params: { page },
      })
      .then((res) => {
        setCarts(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const allItems = useMemo(
    () =>
      carts.flatMap((cart) =>
        cart.items.map((item) => ({ ...item, cartId: cart.public_id }))
      ),
    [carts]
  );

  const groupedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        product_public_id: string;
        product_name: string;
        product_brand?: string;
        quantity: number;
      }
    >();

    for (const item of allItems) {
      const key = item.product_public_id ?? item.public_id;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(key, {
          product_public_id: item.product_public_id ?? "",
          product_name: item.product_name,
          product_brand: item.product_brand,
          quantity: item.quantity,
        });
      }
    }

    return Array.from(map.values());
  }, [allItems]);

  const totalItems = groupedItems.reduce((sum, i) => sum + i.quantity, 0);

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
        <h1 className="text-2xl font-medium text-foreground">
          Cart Items ({totalItems})
        </h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : groupedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No cart items found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">Product</th>
                  <th className="th">Brand</th>
                  <th className="th text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {groupedItems.map((item) => (
                  <tr key={item.product_public_id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      <ClickableText href={`/products/${item.product_public_id}`}>
                        {item.product_name}
                      </ClickableText>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {item.product_brand || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground whitespace-nowrap">
                      {item.quantity}
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
              className="btn-page"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="btn-page"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
