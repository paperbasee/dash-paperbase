"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { Customer, PaginatedResponse } from "@/types";

function formatMdy(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

export default function CustomersPage() {
  const router = useRouter();
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Customer>>("admin/customers/", {
        params: { page },
      })
      .then((res) => {
        setCustomers(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <div>
            <h1 className="text-2xl font-medium leading-relaxed text-foreground">
              {tNav("customers")} ({toLocaleDigits(String(count), locale)})
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {tPages("customersSubtitle")}
            </p>
          </div>
        </div>
        <Link
          href="/customers/new"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {tPages("addCustomer")}
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("customersEmpty")}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">Email</th>
                  <th className="th">Username</th>
                  <th className="th">Phone</th>
                  <th className="th">Marketing</th>
                  <th className="th">Total Orders</th>
                  <th className="th">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((c) => (
                  <tr
                    key={c.public_id}
                    className="cursor-pointer hover:bg-muted/40 focus-within:bg-muted/40"
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/customers/${c.public_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/customers/${c.public_id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.email || c.user_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">{c.name || c.user_username || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.marketing_opt_in ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.total_orders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {c.created_at
                          ? formatMdy(c.created_at)
                          : "—"}
                      </span>
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
              <span className="text-sm text-muted-foreground">Page {page}</span>
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
