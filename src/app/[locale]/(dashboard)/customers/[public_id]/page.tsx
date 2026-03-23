"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { CustomerDetailsResponse } from "@/types";

function asCurrency(value: string) {
  const number = Number(value || "0");
  if (Number.isNaN(number)) return value;
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMdy(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

export default function CustomerDetailPage() {
  const tPages = useTranslations("pages");
  const router = useRouter();
  const params = useParams<{ public_id: string }>();
  const publicId = params.public_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CustomerDetailsResponse | null>(null);
  const [showOrderedProducts, setShowOrderedProducts] = useState(false);

  useEffect(() => {
    if (!publicId) return;
    api
      .get<CustomerDetailsResponse>(`admin/customers/${publicId}/details/`)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load customer details."))
      .finally(() => setLoading(false));
  }, [publicId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted/80 px-1 py-1">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("goBack")}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <h1 className="text-2xl font-medium leading-relaxed text-foreground">Customer Details</h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card p-6 text-sm text-red-500">
          {error}
        </div>
      ) : data ? (
        <>
          <section className="rounded-xl border border-dashed border-card-border bg-card p-6">
            <h2 className="mb-4 text-lg font-medium">Basic Info</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <p><span className="text-muted-foreground">Name:</span> {data.customer.name || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {data.customer.email ?? "—"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {data.customer.phone || "—"}</p>
              <p><span className="text-muted-foreground">Address:</span> {data.customer.address ?? "—"}</p>
              <p><span className="text-muted-foreground">District:</span> {data.customer.district ?? "—"}</p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setShowOrderedProducts((prev) => !prev)}
              className="rounded-xl border border-dashed border-card-border bg-card p-4 text-left hover:bg-muted/40"
            >
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="mt-1 text-2xl font-semibold">{data.analytics.total_orders}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {showOrderedProducts ? "Hide ordered products" : "Show ordered products"}
              </p>
            </button>
            <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="mt-1 text-2xl font-semibold">{asCurrency(data.analytics.total_spent)}</p>
            </div>
            <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Loyalty Score</p>
              <p className="mt-1 text-2xl font-semibold">{asCurrency(data.analytics.loyalty_score)}</p>
            </div>
            <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Average Order Value</p>
              <p className="mt-1 text-2xl font-semibold">{asCurrency(data.analytics.average_order_value)}</p>
            </div>
            <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">First Order Date</p>
              <p className="mt-1 text-base font-medium">
                {data.analytics.first_order_date
                  ? formatMdy(data.analytics.first_order_date)
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Last Order Date</p>
              <p className="mt-1 text-base font-medium">
                {data.analytics.last_order_date
                  ? formatMdy(data.analytics.last_order_date)
                  : "—"}
              </p>
            </div>
          </section>
          {showOrderedProducts && (
            <section className="rounded-xl border border-dashed border-card-border bg-card p-6">
              <h2 className="mb-4 text-lg font-medium">Ordered Products (Last Order First)</h2>
              {data.ordered_products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ordered products found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2">Order</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {data.ordered_products.map((item, idx) => (
                        <tr key={`${item.order_public_id}-${item.product_public_id}-${idx}`}>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{item.order_number}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatMdy(item.ordered_at)}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">{item.product_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{item.quantity}</td>
                          <td className="px-3 py-2 text-muted-foreground">{asCurrency(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
