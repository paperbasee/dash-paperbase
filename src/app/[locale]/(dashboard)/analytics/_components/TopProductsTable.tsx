"use client";

import type { ProductRow } from "./types";

export function TopProductsTable({
  productsData,
  currencySymbol,
}: {
  productsData: ProductRow[];
  currencySymbol: string;
}) {
  return (
    <div className="rounded-card border border-card-border bg-card p-4">
      <div className="mb-4 text-sm font-medium text-foreground">Top Products</div>
      <div className="overflow-auto max-h-[360px] md:max-h-[520px]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted sticky top-0 z-10">
              <th className="px-4 py-3 whitespace-nowrap">Product</th>
              <th className="px-4 py-3 whitespace-nowrap">Views</th>
              <th className="px-4 py-3 whitespace-nowrap">Add to Cart</th>
              <th className="px-4 py-3 whitespace-nowrap">Orders</th>
              <th className="px-4 py-3 whitespace-nowrap">Revenue</th>
              <th className="px-4 py-3 whitespace-nowrap">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {productsData.map((p) => {
              const pct = Math.max(0, Math.min(100, p.conversion_rate || 0));
              return (
                <tr key={p.product_id}>
                  <td className="px-4 py-3 text-foreground">
                    <div className="max-w-[18rem] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {p.product_name || p.product_id}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.product_id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.views}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.add_to_cart}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.purchases}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {currencySymbol}
                    {Number(p.revenue).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded-xs bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
