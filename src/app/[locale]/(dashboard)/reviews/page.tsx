"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Undo2, Star } from "lucide-react";
import { ClickableText } from "@/components/ui/clickable-text";
import api from "@/lib/api";
import type { Review, PaginatedResponse } from "@/types";

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Review>>("admin/reviews/", {
        params: { page },
      })
      .then((res) => {
        setReviews(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [page]);

  async function handleStatusChange(publicId: string, status: string) {
    setUpdating(publicId);
    try {
      await api.patch(`admin/reviews/${publicId}/`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await api.delete(`admin/reviews/${publicId}/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  function statusColor(status: string) {
    switch (status) {
      case "approved":
        return "text-green-600 dark:text-green-400";
      case "rejected":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-amber-600 dark:text-amber-400";
    }
  }

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
          Reviews ({count})
        </h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No reviews yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">Product</th>
                  <th className="th">User</th>
                  <th className="th">Rating</th>
                  <th className="th">Title</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {reviews.map((r) => (
                  <tr key={r.public_id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      <ClickableText href={`/products/${r.product_public_id}`}>
                        {r.product_name}
                      </ClickableText>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.user_email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < r.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.title || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={statusColor(r.status)}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={updating === r.public_id}
                            onClick={() =>
                              handleStatusChange(r.public_id, "approved")
                            }
                            className="mr-2 text-green-600 hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updating === r.public_id}
                            onClick={() =>
                              handleStatusChange(r.public_id, "rejected")
                            }
                            className="mr-2 text-red-600 hover:underline disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(r.public_id)}
                        className="text-destructive hover:underline"
                      >
                        Delete
                      </button>
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
