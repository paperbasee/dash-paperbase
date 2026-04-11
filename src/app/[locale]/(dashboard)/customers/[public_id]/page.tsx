"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { CustomerDetailsResponse } from "@/types";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { Button } from "@/components/ui/button";

function asCurrency(value: string | number) {
  const number = Number(value ?? "0");
  if (Number.isNaN(number)) return String(value ?? "");
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CustomerDetailPage() {
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const params = useParams<{ public_id: string }>();
  const publicId = params.public_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CustomerDetailsResponse | null>(null);

  useEffect(() => {
    if (!publicId) return;
    api
      .get<CustomerDetailsResponse>(`admin/customers/${publicId}/details/`)
      .then((res) => setData(res.data))
      .catch(() => setError(tPages("customerDetailsLoadError")))
      .finally(() => setLoading(false));
  }, [publicId, tPages]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
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
        <h1 className="text-2xl font-medium leading-relaxed text-foreground">
          {tPages("customerDetailsTitle")}
        </h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-card border border-dashed border-card-border bg-card p-6 text-sm text-red-500">
          {error}
        </div>
      ) : data ? (
        <>
          <section className="rounded-card border border-dashed border-card-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-medium">{tPages("customerDetailsBasicInfo")}</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/orders?customer=${encodeURIComponent(publicId)}`)}
              >
                {tPages("customerDetailsViewOrders")}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p><span className="text-muted-foreground">{tPages("customerDetailsName")}:</span> {data.customer.name || "—"}</p>
              <p><span className="text-muted-foreground">{tPages("customerDetailsEmail")}:</span> {data.customer.email ?? "—"}</p>
              <p><span className="text-muted-foreground">{tPages("customerDetailsPhone")}:</span> {data.customer.phone || "—"}</p>
              <p><span className="text-muted-foreground">{tPages("customerDetailsAddress")}:</span> {data.customer.address ?? "—"}</p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("customerDetailsTotalOrders")}</p>
              <p className="mt-1 text-2xl font-semibold">{data.analytics.total_orders}</p>
            </div>
            <div
              className="rounded-card border border-dashed border-card-border bg-card p-4"
            >
              <p className="text-sm text-muted-foreground">{tPages("customerDetailsTotalSpent")}</p>
              <p className="mt-1 text-2xl font-semibold">{asCurrency(data.analytics.total_spent)}</p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("customerDetailsFirstOrderDate")}</p>
              <p className="mt-1 text-base font-medium">
                {data.analytics.first_order_at
                  ? formatDashboardDateTime(data.analytics.first_order_at, locale)
                  : "—"}
              </p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("customerDetailsLastOrderDate")}</p>
              <p className="mt-1 text-base font-medium">
                {data.analytics.last_order_at
                  ? formatDashboardDateTime(data.analytics.last_order_at, locale)
                  : "—"}
              </p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("customerDetailsRepeatCustomer")}</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.analytics.is_repeat_customer ? tCommon("yes") : tCommon("no")}
              </p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("customerDetailsAvgOrderIntervalDays")}</p>
              <p className="mt-1 text-2xl font-semibold">
                {data.analytics.avg_order_interval_days == null
                  ? "—"
                  : asCurrency(data.analytics.avg_order_interval_days)}
              </p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
