"use client";

import { useMemo, useState } from "react";
import { useActivities } from "@/hooks/useActivities";

const ENTITY_OPTIONS = [
  { value: "", label: "All types" },
  { value: "product", label: "Product" },
  { value: "order", label: "Order" },
  { value: "category", label: "Category" },
  { value: "brand", label: "Brand" },
  { value: "notification", label: "Notification" },
  { value: "contact", label: "Contact" },
] as const;

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "custom", label: "Custom" },
] as const;

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${datePart}, ${timePart}`;
}

export default function ActivitiesPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const filters = useMemo(
    () => ({
      page,
      entity_type: entityType || undefined,
      action: action || undefined,
    }),
    [page, entityType, action],
  );

  const { data, loading, error } = useActivities(filters);

  const results = data?.results ?? [];
  const count = data?.count ?? 0;
  const hasNext = !!data?.next;

  const onChangeType = (next: string) => {
    setEntityType(next);
    setPage(1);
  };

  const onChangeAction = (next: string) => {
    setAction(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium text-foreground">
            Activities {count > 0 ? `(${count})` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin actions across products, orders, contacts, notifications and more.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <select
          value={entityType}
          onChange={(e) => onChangeType(e.target.value)}
          className="h-10 w-full sm:w-[220px] rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          aria-label="Filter by type"
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => onChangeAction(e.target.value)}
          className="h-10 w-full sm:w-[180px] rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          aria-label="Filter by action"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activities found.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-dashed border-border bg-background">
            <div className="overflow-x-auto">
              <div className="min-w-max divide-y divide-border">
                {results.map((item) => (
                  <div key={item.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground whitespace-nowrap">
                          {item.summary}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          <div className="flex flex-nowrap items-center gap-2">
                            <span className="uppercase tracking-wide">
                              {item.action}
                            </span>
                            <span>·</span>
                            <span>
                              {item.entity_type}
                              {item.entity_id ? ` #${item.entity_id}` : ""}
                            </span>
                            {item.actor && (
                              <>
                                <span>·</span>
                                <span>
                                  {item.actor.username || item.actor.email}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

