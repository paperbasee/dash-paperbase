"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { useActivities } from "@/hooks/useActivities";
import { formatDashboardDateTimeWithSeconds } from "@/lib/datetime-display";

export default function ActivitiesPage() {
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const entityOptions = useMemo(
    () =>
      [
        { value: "", label: tPages("activitiesEntityAll") },
        { value: "product", label: tPages("activitiesEntityProduct") },
        { value: "order", label: tPages("activitiesEntityOrder") },
        { value: "category", label: tPages("activitiesEntityCategory") },
        { value: "brand", label: tPages("activitiesEntityBrand") },
        { value: "notification", label: tPages("activitiesEntityNotification") },
        { value: "support_ticket", label: tPages("activitiesEntitySupportTicket") },
      ] as const,
    [tPages],
  );

  const actionOptions = useMemo(
    () =>
      [
        { value: "", label: tPages("activitiesActionAll") },
        { value: "create", label: tPages("activitiesActionCreate") },
        { value: "update", label: tPages("activitiesActionUpdate") },
        { value: "delete", label: tPages("activitiesActionDelete") },
        { value: "custom", label: tPages("activitiesActionCustom") },
      ] as const,
    [tPages],
  );

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
            {tPages("activitiesTitle")}
            {count > 0 ? ` ${tPages("activitiesCountInParens", { count })}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{tPages("activitiesSubtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Select
          value={entityType}
          onChange={(e) => onChangeType(e.target.value)}
          className="w-full sm:w-[220px]"
          aria-label={tPages("activitiesFilterTypeAria")}
        >
          {entityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          value={action}
          onChange={(e) => onChangeAction(e.target.value)}
          className="w-full sm:w-[180px]"
          aria-label={tPages("activitiesFilterActionAria")}
        >
          {actionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tPages("activitiesEmpty")}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-dashed border-border bg-background">
            <div className="overflow-x-auto">
              <div className="min-w-max divide-y divide-border">
                {results.map((item) => (
                  <div key={item.public_id} className="px-4 py-3 text-sm">
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
                                  {item.actor.full_name || item.actor.email}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDashboardDateTimeWithSeconds(item.created_at, locale)}
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
              className="btn-page"
            >
              {tPages("supportTicketsPrevious")}
            </button>
            <span className="text-sm text-muted-foreground">
              {tPages("activitiesPage", { page })}
            </span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="btn-page"
            >
              {tPages("supportTicketsNext")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

